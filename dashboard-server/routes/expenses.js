'use strict';

const fs = require('fs');
const path = require('path');

module.exports = function (ctx) {
  const router = require('express').Router();
  const {
    pool, log, requireAdmin, requireNBI,
    isValidUuid, validateLength, auditLog,
    buildPatchQuery, invalidateCache,
    upload, uploadDir,
    ocrRequests, ocrBreaker,
    pdfParse, sharp, Tesseract,
    archiver,
    getExpenseApprover,
    sendEmailAsync, EMAIL_FROM, APP_URL,
    createNotification,
  } = ctx;

  const { withRetry } = require('../resilience');

  // ==================== EXPENSE REPORTS ====================
  // Expense tracking with approval workflow: employees submit expenses (pending),
  // admins approve/reject them. Receipts can be attached as file uploads.

  /** GET /api/expenses/categories — List active expense categories */
  router.get('/api/expenses/categories', requireNBI, async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM expense_categories WHERE is_active = TRUE ORDER BY sort_order, name');
    res.json(rows);
  });

  /** POST /api/expenses/categories — Create an expense category (admin only) */
  router.post('/api/expenses/categories', requireNBI, requireAdmin, async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const { rows } = await pool.query('INSERT INTO expense_categories (name) VALUES ($1) RETURNING *', [name.trim()]);
    invalidateCache('expense_categories');
    res.status(201).json(rows[0]);
  });

  /** DELETE /api/expenses/categories/:id — Remove an expense category (admin only, checks references) */
  router.delete('/api/expenses/categories/:id', requireNBI, requireAdmin, async (req, res) => {
    const refs = await pool.query('SELECT count(*)::int AS count FROM expenses WHERE category_id = $1', [req.params.id]);
    if (refs.rows[0].count > 0) return res.status(400).json({ error: `Cannot delete: ${refs.rows[0].count} expenses use this category. Reassign them first.` });
    await pool.query('DELETE FROM expense_categories WHERE id = $1', [req.params.id]);
    invalidateCache('expense_categories');
    res.json({ ok: true });
  });

  /**
   * GET /api/expenses
   * List expenses. Non-admin users only see their own; admins see all.
   * Filterable by user_id, status, and date range.
   */
  router.get('/api/expenses', requireNBI, async (req, res) => {
    const isAdmin = req.user && req.user.role === 'admin';
    const { user_id, status, from_date, to_date } = req.query;

    let where = [];
    let vals = [];
    let i = 1;

    // Non-admin users can only see their own
    if (!isAdmin) {
      where.push(`e.user_id = $${i}`); vals.push(req.user.id); i++;
    } else if (user_id) {
      where.push(`e.user_id = $${i}`); vals.push(user_id); i++;
    }
    if (status) { where.push(`e.status = $${i}`); vals.push(status); i++; }
    if (from_date) { where.push(`e.date >= $${i}`); vals.push(from_date); i++; }
    if (to_date) { where.push(`e.date <= $${i}`); vals.push(to_date); i++; }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const { rows } = await pool.query(`
      SELECT e.*, u.display_name AS employee_name, c.name AS category_name,
        (SELECT count(*) FROM expense_receipts r WHERE r.expense_id = e.id)::int AS receipt_count,
        er.title AS report_title
      FROM expenses e
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN expense_categories c ON e.category_id = c.id
      LEFT JOIN expense_reports er ON e.report_id = er.id
      ${whereClause}
      ORDER BY e.date DESC, e.created_at DESC
    `, vals);
    res.json({ expenses: rows });
  });

  /**
   * GET /api/expenses/summary
   * Admin-only aggregate view: totals by employee and by category.
   * NB: This route must be defined before the :id route to avoid path conflicts.
   */
  router.get('/api/expenses/summary', requireNBI, requireAdmin, async (req, res) => {
    const { from_date, to_date } = req.query;

    let where = [];
    let vals = [];
    let i = 1;
    if (from_date) { where.push(`e.date >= $${i}`); vals.push(from_date); i++; }
    if (to_date) { where.push(`e.date <= $${i}`); vals.push(to_date); i++; }
    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const byEmployee = await pool.query(`
      SELECT u.display_name, e.status, count(*)::int AS count, sum(e.amount)::numeric AS total
      FROM expenses e JOIN users u ON e.user_id = u.id
      ${whereClause}
      GROUP BY u.display_name, e.status ORDER BY u.display_name
    `, vals);

    const byCategory = await pool.query(`
      SELECT COALESCE(c.name, 'Uncategorised') AS category, count(*)::int AS count, sum(e.amount)::numeric AS total
      FROM expenses e LEFT JOIN expense_categories c ON e.category_id = c.id
      ${whereClause}
      GROUP BY c.name ORDER BY total DESC
    `, vals);

    res.json({ byEmployee: byEmployee.rows, byCategory: byCategory.rows });
  });

  /** GET /api/expenses/:id — Get a single expense with its receipt attachments. Access: own or admin. */
  router.get('/api/expenses/:id', requireNBI, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid expense ID' });
    const { rows } = await pool.query(`
      SELECT e.*, u.display_name AS employee_name, c.name AS category_name,
        er.title AS report_title, er.status AS report_status
      FROM expenses e
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN expense_categories c ON e.category_id = c.id
      LEFT JOIN expense_reports er ON e.report_id = er.id
      WHERE e.id = $1
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Expense not found' });
    const expense = rows[0];

    // Access check: own expense or admin
    if (req.user.role !== 'admin' && expense.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const receipts = await pool.query('SELECT * FROM expense_receipts WHERE expense_id = $1 ORDER BY created_at', [req.params.id]);
    expense.receipts = receipts.rows;
    res.json(expense);
  });

  /** POST /api/expenses — Submit a new expense (always created as "pending") */
  router.post('/api/expenses', requireNBI, async (req, res) => {
    const { date, amount, currency, category_id, description, notes, vat_amount } = req.body;
    if (!date || amount == null) return res.status(400).json({ error: 'Date and amount are required' });
    const lenErr = validateLength(description, 'description') || validateLength(notes, 'notes');
    if (lenErr) return res.status(400).json({ error: lenErr });
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return res.status(400).json({ error: 'Amount must be a valid positive number' });
    const parsedVat = vat_amount != null ? parseFloat(vat_amount) : null;
    if (parsedVat !== null && (isNaN(parsedVat) || parsedVat < 0)) return res.status(400).json({ error: 'VAT amount must be a valid positive number' });

    const { rows } = await pool.query(
      `INSERT INTO expenses (user_id, date, amount, currency, category_id, description, notes, vat_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, date, amount, currency || 'GBP', category_id || null, description || null, notes || null, parsedVat]
    );
    await auditLog('expense', rows[0].id, 'create', req.user.displayName, { amount, date, description, vat_amount: parsedVat });
    res.status(201).json(rows[0]);
  });

  /**
   * PATCH /api/expenses/:id
   * Update an expense. Owners can only edit pending expenses; admins can also change status.
   * When an admin changes status, reviewed_by and reviewed_at are set automatically.
   */
  router.patch('/api/expenses/:id', requireNBI, async (req, res) => {
    // Validate UUID format to prevent 500 errors from invalid IDs
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id)) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    const check = await pool.query('SELECT user_id, status FROM expenses WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Expense not found' });
    const expense = check.rows[0];

    const isAdmin = req.user && req.user.role === 'admin';
    const isOwner = expense.user_id === req.user.id;
    if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Access denied' });

    // Only admin can change status; owners can only edit pending expenses
    if (!isAdmin && expense.status !== 'pending') {
      return res.status(400).json({ error: 'Cannot edit an expense that has been reviewed' });
    }

    // Validate amount if provided
    if (req.body.amount !== undefined && (isNaN(req.body.amount) || parseFloat(req.body.amount) <= 0)) {
      return res.status(400).json({ error: 'Amount must be a valid positive number' });
    }

    // Text fields are stored raw; escaping happens at render time in the frontend (esc()).
    const allowed = ['date', 'amount', 'currency', 'category_id', 'description', 'notes', 'vat_amount'];
    // Admin-only fields. reviewed_by and reviewed_at are NOT in the allow-list
    // (audit finding B-C3) — admins could otherwise forge the audit trail by
    // setting reviewed_by to any string or backdating reviewed_at, defeating
    // the legal control on reimbursements. Both are always server-stamped
    // below when status changes.
    if (isAdmin) allowed.push('status');

    const { updates, vals, nextIdx } = buildPatchQuery(req.body, allowed);
    let idx = nextIdx;
    // Auto-set review fields when admin changes status. These are always
    // server-stamped; any reviewed_by/reviewed_at in the body is ignored.
    if (isAdmin && req.body.status && req.body.status !== expense.status) {
      updates.push(`reviewed_by = $${idx}`); vals.push(req.user.displayName); idx++;
      updates.push(`reviewed_at = $${idx}`); vals.push(new Date().toISOString()); idx++;
    }
    updates.push(`updated_at = $${idx}`); vals.push(new Date().toISOString()); idx++;

    if (updates.length <= 1) return res.status(400).json({ error: 'No fields to update' });
    vals.push(req.params.id);
    const { rows } = await pool.query(`UPDATE expenses SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, vals);
    await auditLog('expense', req.params.id, 'update', req.user.displayName, req.body);
    res.json(rows[0]);
  });

  /**
   * DELETE /api/expenses/:id
   * Delete an expense and its receipt files from disk.
   * Owners can only delete pending expenses; admins can delete any.
   */
  router.delete('/api/expenses/:id', requireNBI, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid expense ID' });
    const check = await pool.query('SELECT user_id, status FROM expenses WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Expense not found' });
    const expense = check.rows[0];

    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin && expense.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    if (!isAdmin && expense.status !== 'pending') return res.status(400).json({ error: 'Cannot delete a reviewed expense' });

    // Delete receipt files
    const receipts = await pool.query('SELECT filename FROM expense_receipts WHERE expense_id = $1', [req.params.id]);
    for (const r of receipts.rows) {
      const filePath = path.resolve(uploadDir, r.filename);
      if (filePath.startsWith(path.resolve(uploadDir) + path.sep) && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    await pool.query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
    await auditLog('expense', req.params.id, 'delete', req.user.displayName);
    res.json({ ok: true });
  });

  /** POST /api/expenses/:id/receipts — Upload a receipt image/PDF for an expense */
  router.post('/api/expenses/:id/receipts', requireNBI, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Check ownership
    const check = await pool.query('SELECT user_id FROM expenses WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Expense not found' });
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin && check.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    const { rows } = await pool.query(
      `INSERT INTO expense_receipts (expense_id, filename, original_name, size_bytes, mime_type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.id, req.file.filename, req.file.originalname, req.file.size, req.file.mimetype, req.user.displayName]
    );
    res.status(201).json(rows[0]);
  });

  /** DELETE /api/expenses/:id/receipts/:receiptId — Remove a receipt and delete the file from disk */
  router.delete('/api/expenses/:id/receipts/:receiptId', requireNBI, async (req, res) => {
    const check = await pool.query('SELECT e.user_id FROM expenses e JOIN expense_receipts r ON r.expense_id = e.id WHERE r.id = $1 AND e.id = $2', [req.params.receiptId, req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Receipt not found' });
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin && check.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    const receipt = await pool.query('SELECT filename FROM expense_receipts WHERE id = $1', [req.params.receiptId]);
    if (receipt.rows.length > 0) {
      const filePath = path.resolve(uploadDir, receipt.rows[0].filename);
      if (filePath.startsWith(path.resolve(uploadDir) + path.sep) && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      await pool.query('DELETE FROM expense_receipts WHERE id = $1', [req.params.receiptId]);
    }
    res.json({ ok: true });
  });

  // ==================== RECEIPT OCR & PARSING ====================

  /**
   * Extract structured data from receipt text using regex patterns.
   * Identifies amounts, dates, currency, vendor name, and VAT.
   * @param {string} text - Raw OCR text from the receipt image
   * @returns {{date: string|null, amount: number|null, currency: string, description: string, vendor: string, vat_amount: number|null}}
   */
  function extractReceiptFields(text) {
    const result = { date: null, amount: null, currency: 'GBP', description: '', vendor: '', vat_amount: null };
    if (!text) return result;

    // Extract all amounts — the largest is usually the total
    const amountMatches = [];
    // Pattern 1: currency symbol + number
    for (const m of text.matchAll(/[£\$€]\s*([\d,]+\.?\d{0,2})/gi)) {
      amountMatches.push({ value: parseFloat(m[1].replace(/,/g, '')), raw: m[0] });
    }
    // Pattern 2: "total/amount/due" label + number
    for (const m of text.matchAll(/(?:total|amount|grand total|sum|balance|due|subtotal)[:\s]*[£\$€]?\s*([\d,]+\.\d{2})/gi)) {
      amountMatches.push({ value: parseFloat(m[1].replace(/,/g, '')), isTotal: true, raw: m[0] });
    }
    // Prefer labelled totals, otherwise take the largest amount
    const totals = amountMatches.filter(a => a.isTotal);
    if (totals.length > 0) result.amount = Math.max(...totals.map(a => a.value));
    else if (amountMatches.length > 0) result.amount = Math.max(...amountMatches.map(a => a.value));

    // Extract date — try multiple formats
    const datePatterns = [
      /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/,       // DD/MM/YYYY or MM/DD/YYYY
      /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/,        // YYYY-MM-DD
      /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})/i, // 5 Mar 2026
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2}),?\s+(\d{4})/i, // Mar 5, 2026
    ];
    const monthMap = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
    for (const pat of datePatterns) {
      const m = text.match(pat);
      if (m) {
        if (m[2] && monthMap[m[2].toLowerCase().slice(0,3)] !== undefined) {
          // "5 Mar 2026" format
          result.date = `${m[3]}-${String(monthMap[m[2].toLowerCase().slice(0,3)]).padStart(2,'0')}-${m[1].padStart(2,'0')}`;
        } else if (m[1] && monthMap[m[1].toLowerCase().slice(0,3)] !== undefined) {
          // "Mar 5, 2026" format
          result.date = `${m[3]}-${String(monthMap[m[1].toLowerCase().slice(0,3)]).padStart(2,'0')}-${m[2].padStart(2,'0')}`;
        } else if (m[1].length === 4) {
          // YYYY-MM-DD
          result.date = `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
        } else {
          // DD/MM/YYYY (UK format)
          result.date = `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
        }
        break;
      }
    }
    if (!result.date) result.date = new Date().toISOString().slice(0, 10);

    // Currency — only set from explicit text mentions, not symbols (OCR misreads £ as $ too often)
    if (/\bUSD\b|United States Dollar/i.test(text)) result.currency = 'USD';
    else if (/\bGBP\b|British Pound|Sterling/i.test(text)) result.currency = 'GBP';
    else if (/\bEUR\b|\bEuro\b/i.test(text)) result.currency = 'EUR';
    else if (/\bSEK\b|Swedish Kron/i.test(text)) result.currency = 'SEK';
    else result.currency = null; // Let user pick from dropdown

    // Vendor — first substantial line (skip very short lines, numbers-only lines)
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3 && !/^\d+[\.\d]*$/.test(l) && !/^[-=*_]+$/.test(l));
    if (lines.length > 0) result.vendor = lines[0].substring(0, 120);

    // Itemisation — extract labelled amounts (fare, tip, tax, subtotal, etc.)
    const items = [];
    const itemPatterns = [
      /(?:fare|base\s*fare|ride|trip)[:\s]*[£\$€]?\s*([\d,]+\.\d{2})/gi,
      /(?:tip|gratuity)[:\s]*[£\$€]?\s*([\d,]+\.\d{2})/gi,
      /(?:tax|vat|gst)[:\s]*[£\$€]?\s*([\d,]+\.\d{2})/gi,
      /(?:subtotal|sub[\s-]total)[:\s]*[£\$€]?\s*([\d,]+\.\d{2})/gi,
      /(?:discount|promo)[:\s]*-?[£\$€]?\s*([\d,]+\.\d{2})/gi,
      /(?:service\s*(?:fee|charge)|booking\s*fee|delivery)[:\s]*[£\$€]?\s*([\d,]+\.\d{2})/gi,
    ];
    for (const pat of itemPatterns) {
      for (const m of text.matchAll(pat)) {
        const label = m[0].split(/[£\$€\d]/)[0].replace(/[:\s]+$/, '').trim();
        items.push(`${label}: ${result.currency === 'USD' ? '$' : result.currency === 'EUR' ? '€' : '£'}${m[1]}`);
      }
    }

    // Extract VAT/tax amount specifically
    const vatPattern = /(?:tax|vat|gst)[:\s]*[£\$€]?\s*([\d,]+\.\d{2})/gi;
    const vatMatches = [];
    for (const m of text.matchAll(vatPattern)) {
      vatMatches.push(parseFloat(m[1].replace(/,/g, '')));
    }
    if (vatMatches.length > 0) result.vat_amount = Math.max(...vatMatches);

    // Description — itemised breakdown if found, otherwise line items with amounts
    if (items.length > 0) {
      result.description = (result.vendor ? result.vendor + ' — ' : '') + items.join(', ');
    } else {
      const itemLines = lines.filter(l => /[£\$€]?\s*\d+\.\d{2}/.test(l) && l.length > 5).slice(0, 5);
      if (itemLines.length > 0) result.description = itemLines.join('; ').substring(0, 300);
      else result.description = result.vendor;
    }

    return result;
  }

  /** POST /api/expenses/from-receipt — Upload a receipt, OCR/extract fields, create expense + attach receipt */
  router.post('/api/expenses/from-receipt', requireNBI, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Extend timeout for OCR processing (can take 10-30s on first run)
    req.setTimeout(120000);
    res.setTimeout(120000);

    const filePath = path.resolve(uploadDir, req.file.filename);
    let text = '';
    let extracted = { date: new Date().toISOString().slice(0, 10), amount: null, currency: 'GBP', description: '', vendor: '' };
    let ocrMethod = 'none';

    try {
      const mime = req.file.mimetype || '';
      if (mime === 'application/pdf') {
        // PDF — extract text layer locally first (faster, no API call)
        const buffer = fs.readFileSync(filePath);
        const pdf = await pdfParse(buffer);
        text = pdf.text || '';
        ocrMethod = 'pdf-parse';
        log('info', 'Receipt', `PDF extracted ${text.length} chars from ${req.file.originalname}`);
        // If PDF had no text layer, fall through to OCR.space
        if (text.trim().length < 10) {
          log('info', 'Receipt', 'PDF text layer empty, falling through to OCR.space');
          text = '';
        }
      }

      // For images or PDFs with no text — use OCR.space free API
      if (!text && (mime.startsWith('image/') || mime === 'application/pdf')) {
        log('info', 'Receipt', `Sending to OCR.space (${req.file.originalname}, ${mime}, ${(fs.statSync(filePath).size/1024).toFixed(0)}KB)`);

        // Resize images to under 1MB for OCR.space free tier limit
        let ocrBuffer;
        let ocrMime = mime;
        if (mime.startsWith('image/')) {
          const fileBuffer = fs.readFileSync(filePath);
          if (fileBuffer.length > 900 * 1024) {
            log('info', 'Receipt', 'Resizing image for OCR.space (>900KB)');
            ocrBuffer = await sharp(fileBuffer).resize(1600, null, { withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer();
            ocrMime = 'image/jpeg';
            log('info', 'Receipt', `Resized: ${(fileBuffer.length/1024).toFixed(0)}KB -> ${(ocrBuffer.length/1024).toFixed(0)}KB`);
          } else {
            ocrBuffer = fileBuffer;
          }
        } else {
          ocrBuffer = fs.readFileSync(filePath);
        }

        const base64 = ocrBuffer.toString('base64');
        const ocrBody = new URLSearchParams();
        ocrBody.append('base64Image', `data:${ocrMime};base64,${base64}`);
        ocrBody.append('language', 'eng');
        ocrBody.append('isTable', 'true');
        ocrBody.append('OCREngine', '2'); // Engine 2 is better for receipts
        ocrBody.append('scale', 'true');

        const ocrApiKey = process.env.OCR_API_KEY;
        if (!ocrApiKey) {
          log('warn', 'Receipt', 'OCR_API_KEY not set, skipping external OCR');
          if (mime.startsWith('image/') && !mime.includes('heic')) {
            const { data } = await Tesseract.recognize(filePath, 'eng', { logger: () => {} });
            text = data.text || '';
            ocrMethod = 'tesseract-local';
          }
        } else {
          const ocrResp = await ocrBreaker.fire(() => withRetry(
            () => fetch('https://api.ocr.space/parse/image', { method: 'POST', headers: { 'apikey': ocrApiKey }, body: ocrBody, signal: AbortSignal.timeout(30000) }),
            { maxAttempts: 2, backoffMs: 2000, log }
          ));
          if (ocrResp.ok) {
            const ocrResult = await ocrResp.json();
            if (ocrResult.ParsedResults && ocrResult.ParsedResults.length > 0) {
              text = ocrResult.ParsedResults[0].ParsedText || '';
              ocrMethod = 'ocr.space';
              log('info', 'Receipt', `OCR.space extracted ${text.length} chars`);
            } else {
              log('warn', 'Receipt', 'OCR.space returned no results', { error: ocrResult.ErrorMessage || 'unknown' });
              ocrMethod = 'ocr.space-empty';
            }
          } else {
            log('warn', 'Receipt', 'OCR.space HTTP error', { status: ocrResp.status });
            if (mime.startsWith('image/') && !mime.includes('heic')) {
              log('info', 'Receipt', 'Falling back to local Tesseract');
              const { data } = await Tesseract.recognize(filePath, 'eng', { logger: () => {} });
              text = data.text || '';
              ocrMethod = 'tesseract-fallback';
            }
          }
        }
      } else if (!text) {
        // Plain text file
        text = fs.readFileSync(filePath, 'utf8');
        ocrMethod = 'text';
      }

      if (text) {
        extracted = extractReceiptFields(text);
        log('info', 'Receipt', 'Extracted fields', { extracted });
      }
    } catch(e) {
      log('warn', 'Receipt', 'Extraction error', { error: e.message });
      ocrMethod = 'error: ' + e.message.substring(0, 100);
    }

    // Fall back to filename if no vendor extracted
    if (!extracted.vendor && req.file.originalname) {
      extracted.vendor = 'Receipt: ' + req.file.originalname.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    }

    // Use user's last expense currency as default if OCR couldn't determine it
    let currency = extracted.currency;
    if (!currency) {
      const lastExp = await pool.query('SELECT currency FROM expenses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [req.user.id]);
      currency = (lastExp.rows[0] && lastExp.rows[0].currency) || 'GBP';
    }

    // Create the expense
    const { rows } = await pool.query(
      `INSERT INTO expenses (user_id, date, amount, currency, description, notes, status, vat_amount)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7) RETURNING *`,
      [req.user.id, extracted.date, extracted.amount || 0, currency,
       extracted.vendor || 'Receipt upload', extracted.description || 'Auto-created from receipt upload',
       extracted.vat_amount]
    );
    const expense = rows[0];

    // Attach the receipt file
    await pool.query(
      `INSERT INTO expense_receipts (expense_id, filename, original_name, size_bytes, mime_type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [expense.id, req.file.filename, req.file.originalname, req.file.size, req.file.mimetype, req.user.displayName]
    );

    // Return expense with extracted data and raw text so frontend can show what was read
    res.status(201).json({ ...expense, extracted: { ...extracted, rawText: text.substring(0, 500), ocrMethod }, receipt: { original_name: req.file.originalname, size_bytes: req.file.size } });
  });

  // ==================== EXPENSE REPORT SUBMISSIONS ====================
  // Expense reports group individual expenses into a submittable package.
  // Statuses: draft → submitted → approved/rejected
  // Submitting notifies Tom Rieger via in-app notification + email.

  /**
   * GET /api/expense-reports
   * List expense reports.
   * - Admins see all reports.
   * - The expense approver (Tom) sees submitted/approved/rejected reports from everyone.
   * - Other users only see their own reports.
   * Each report includes expense count and total amount.
   */
  router.get('/api/expense-reports', requireNBI, async (req, res) => {
    const isAdmin = req.user && req.user.role === 'admin';
    const approverUsername = await getExpenseApprover();
    const isApprover = req.user && req.user.username === approverUsername;
    let where = [];
    let vals = [];
    let i = 1;

    if (!isAdmin && !isApprover) {
      // Regular users: only own reports
      where.push(`r.user_id = $${i}`); vals.push(req.user.id); i++;
    } else if (isApprover && !isAdmin) {
      // Expense approver: own reports + submitted/approved/rejected from others
      where.push(`(r.user_id = $${i} OR r.status IN ('submitted', 'approved', 'rejected'))`);
      vals.push(req.user.id); i++;
    }
    // Admins: no filter (see all)

    const { status } = req.query;
    if (status) { where.push(`r.status = $${i}`); vals.push(status); i++; }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const { rows } = await pool.query(`
      SELECT r.*, u.display_name AS employee_name,
        (SELECT count(*) FROM expenses e WHERE e.report_id = r.id)::int AS expense_count,
        (SELECT COALESCE(sum(e.amount), 0) FROM expenses e WHERE e.report_id = r.id)::numeric AS total_amount
      FROM expense_reports r
      LEFT JOIN users u ON r.user_id = u.id
      ${whereClause}
      ORDER BY r.created_at DESC
    `, vals);
    res.json({ reports: rows });
  });

  /** POST /api/expense-reports — Create a new expense report (draft) */
  router.post('/api/expense-reports', requireNBI, async (req, res) => {
    const { title, notes } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });

    const { rows } = await pool.query(
      `INSERT INTO expense_reports (user_id, title, notes) VALUES ($1, $2, $3) RETURNING *`,
      [req.user.id, title.trim(), notes || null]
    );
    await auditLog('expense_report', rows[0].id, 'create', req.user.displayName, { title });
    res.status(201).json(rows[0]);
  });

  /**
   * GET /api/expense-reports/:id
   * Get a single expense report with its expenses. Access: own or admin.
   */
  router.get('/api/expense-reports/:id', requireNBI, async (req, res) => {
    // Access check before full data fetch (B-B12)
    const check = await pool.query('SELECT user_id FROM expense_reports WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Report not found' });

    const approverUsername = await getExpenseApprover();
    const isApprover = req.user && req.user.username === approverUsername;
    if (req.user.role !== 'admin' && check.rows[0].user_id !== req.user.id && !isApprover) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rows } = await pool.query(`
      SELECT r.*, u.display_name AS employee_name
      FROM expense_reports r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.id = $1
    `, [req.params.id]);
    const report = rows[0];

    // Fetch expenses in this report
    const expenses = await pool.query(`
      SELECT e.*, c.name AS category_name,
        (SELECT count(*) FROM expense_receipts r WHERE r.expense_id = e.id)::int AS receipt_count
      FROM expenses e
      LEFT JOIN expense_categories c ON e.category_id = c.id
      WHERE e.report_id = $1
      ORDER BY e.date DESC, e.created_at DESC
    `, [req.params.id]);
    report.expenses = expenses.rows;

    // Also compute totals by currency
    const totals = await pool.query(`
      SELECT currency, sum(amount)::numeric AS total, count(*)::int AS count
      FROM expenses WHERE report_id = $1 GROUP BY currency
    `, [req.params.id]);
    report.totals_by_currency = totals.rows;

    res.json(report);
  });

  /**
   * PATCH /api/expense-reports/:id
   * Update report title/notes. Only draft reports can be edited by their owner.
   * Admins can also update status (for approve/reject flow).
   */
  router.patch('/api/expense-reports/:id', requireNBI, async (req, res) => {
    const check = await pool.query('SELECT user_id, status FROM expense_reports WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    const report = check.rows[0];

    const isAdmin = req.user && req.user.role === 'admin';
    const approverUser = await getExpenseApprover();
    const isApprover = req.user && req.user.username === approverUser;
    const isOwner = report.user_id === req.user.id;
    const canReview = isAdmin || isApprover;
    if (!canReview && !isOwner) return res.status(403).json({ error: 'Access denied' });
    if (!canReview && report.status !== 'draft') {
      return res.status(400).json({ error: 'Cannot edit a submitted report' });
    }

    // Validate status enum if provided
    const VALID_REPORT_STATUSES = ['draft', 'submitted', 'approved', 'rejected'];
    if (req.body.status && !VALID_REPORT_STATUSES.includes(req.body.status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_REPORT_STATUSES.join(', ')}` });
    }

    const allowed = ['title', 'notes'];
    // reviewed_by and reviewed_at are NOT in the allow-list (audit finding
    // B-C3) — they are always server-stamped from req.user below so the
    // audit trail on approval cannot be forged by a reviewer.
    if (canReview) allowed.push('status', 'review_notes');

    const { updates, vals, nextIdx } = buildPatchQuery(req.body, allowed);
    let idx = nextIdx;
    // Auto-set review fields when reviewer changes status. Always server-stamped.
    if (canReview && req.body.status && req.body.status !== report.status) {
      if (req.body.status === 'approved' || req.body.status === 'rejected') {
        updates.push(`reviewed_by = $${idx}`); vals.push(req.user.displayName); idx++;
        updates.push(`reviewed_at = $${idx}`); vals.push(new Date().toISOString()); idx++;
      }
      // If reviewer approves report, also approve all its expenses
      if (req.body.status === 'approved') {
        await pool.query(`UPDATE expenses SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW() WHERE report_id = $2`, [req.user.displayName, req.params.id]);
      }
      // If reviewer rejects, set report back so owner can fix
      if (req.body.status === 'rejected') {
        await pool.query(`UPDATE expenses SET status = 'pending', updated_at = NOW() WHERE report_id = $1`, [req.params.id]);
      }
    }
    updates.push(`updated_at = $${idx}`); vals.push(new Date().toISOString()); idx++;

    if (updates.length <= 1) return res.status(400).json({ error: 'No fields to update' });
    vals.push(req.params.id);
    const { rows } = await pool.query(`UPDATE expense_reports SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, vals);
    await auditLog('expense_report', req.params.id, 'update', req.user.displayName, req.body);
    res.json(rows[0]);
  });

  /**
   * POST /api/expense-reports/:id/submit
   * Submit an expense report for review. Changes status to 'submitted'.
   * Notifies Tom Rieger via in-app notification and email.
   */
  router.post('/api/expense-reports/:id/submit', requireNBI, async (req, res) => {
    const check = await pool.query(`
      SELECT r.*, u.display_name AS employee_name
      FROM expense_reports r LEFT JOIN users u ON r.user_id = u.id
      WHERE r.id = $1
    `, [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    const report = check.rows[0];

    if (report.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (report.status !== 'draft') {
      return res.status(400).json({ error: 'Report has already been submitted' });
    }

    // Check report has expenses
    const expCount = await pool.query('SELECT count(*)::int AS count FROM expenses WHERE report_id = $1', [req.params.id]);
    if (expCount.rows[0].count === 0) {
      return res.status(400).json({ error: 'Cannot submit an empty report. Add expenses first.' });
    }

    // Get total for notification message
    const totals = await pool.query(`
      SELECT currency, sum(amount)::numeric AS total, count(*)::int AS count
      FROM expenses WHERE report_id = $1 GROUP BY currency
    `, [req.params.id]);
    const totalStr = totals.rows.map(t => `${t.currency} ${parseFloat(t.total).toFixed(2)} (${t.count} item${t.count > 1 ? 's' : ''})`).join(', ');

    // Update report status
    await pool.query(`UPDATE expense_reports SET status = 'submitted', submitted_at = NOW(), updated_at = NOW() WHERE id = $1`, [req.params.id]);

    // Auto-dismiss any pending expense_reminder notifications for this user
    await pool.query(`UPDATE notifications SET is_read = true WHERE username = $1 AND type = 'expense_reminder' AND is_read = false`, [req.user.username]);

    // Build the review URL
    const reportUrl = `${APP_URL}/nbi_project_dashboard.html#expenses/report/${req.params.id}`;

    // In-app notification to the designated expense approver. If no approver
    // is configured (settings or env), broadcast to all admins instead so the
    // report doesn't disappear silently. The old path fell back to 'tom' as
    // a hardcoded username (audit finding B-B11) which misdirected approvals
    // whenever settings lookup failed.
    const approverUsername = await getExpenseApprover();
    const approverEmail = process.env.EXPENSE_APPROVER_EMAIL || 'trieger@nbi-consulting.com';
    try {
      if (approverUsername) {
        await createNotification(
          approverUsername,
          'expense_report',
          `Expense Report: ${report.title}`,
          `${report.employee_name || 'An employee'} submitted an expense report (${totalStr}). Click to review.`,
          reportUrl
        );
        log('info', 'Notification', `Approver ${approverUsername} notified about expense report "${report.title}"`);
      } else {
        const admins = await pool.query("SELECT username FROM users WHERE role = 'admin' AND is_active = true");
        for (const a of admins.rows) {
          await createNotification(
            a.username,
            'expense_report',
            `Expense Report: ${report.title}`,
            `${report.employee_name || 'An employee'} submitted an expense report (${totalStr}). No approver is configured — review as admin.`,
            reportUrl
          );
        }
        log('info', 'Notification', `No approver configured; broadcast expense report "${report.title}" to ${admins.rows.length} admin(s)`);
      }
    } catch(e) {
      log('warn', 'Notification', 'Failed to notify approver', { error: e.message });
    }

    // Email notification to expense approver (fire-and-forget)
    const emailHtml = `
      <h2>Expense Report Submitted for Review</h2>
      <p><strong>${report.employee_name || 'An employee'}</strong> has submitted an expense report.</p>
      <table style="border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Report:</td><td>${report.title}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Total:</td><td>${totalStr}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Submitted:</td><td>${new Date().toLocaleString('en-GB')}</td></tr>
      </table>
      <p><a href="${reportUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Review Expense Report</a></p>
      <p style="color:#666;font-size:0.85em">NBI Project Dashboard</p>
    `;
    sendEmailAsync({
      from: EMAIL_FROM,
      to: approverEmail,
      subject: `Expense Report: ${report.title} — ${report.employee_name || 'Employee'}`,
      html: emailHtml
    });

    await auditLog('expense_report', req.params.id, 'submit', req.user.displayName, { title: report.title, total: totalStr });
    res.json({ ok: true, status: 'submitted', reportUrl });
  });

  /**
   * POST /api/expense-reports/:id/expenses
   * Add one or more expenses to a report. Body: { expense_ids: [...] }
   * Only draft reports. Expenses must belong to the same user and not be in another report.
   */
  router.post('/api/expense-reports/:id/expenses', requireNBI, async (req, res) => {
    const check = await pool.query('SELECT user_id, status FROM expense_reports WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    const report = check.rows[0];

    if (report.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (report.status !== 'draft') {
      return res.status(400).json({ error: 'Cannot modify a submitted report' });
    }

    const { expense_ids } = req.body;
    if (!expense_ids || !Array.isArray(expense_ids) || expense_ids.length === 0) {
      return res.status(400).json({ error: 'expense_ids array required' });
    }
    if (expense_ids.some(id => !isValidUuid(id))) {
      return res.status(400).json({ error: 'All expense_ids must be valid UUIDs' });
    }

    // Validate all expenses belong to the user and are unassigned
    const placeholders = expense_ids.map((_, i) => `$${i + 1}`).join(',');
    const expenses = await pool.query(
      `SELECT id, user_id, report_id FROM expenses WHERE id IN (${placeholders})`,
      expense_ids
    );

    // Check all requested IDs were found
    const foundIds = new Set(expenses.rows.map(e => e.id));
    const missing = expense_ids.filter(id => !foundIds.has(id));
    if (missing.length > 0) return res.status(400).json({ error: `Expenses not found: ${missing.join(', ')}` });

    const errors = [];
    for (const exp of expenses.rows) {
      if (exp.user_id !== report.user_id) errors.push(`Expense ${exp.id} belongs to another user`);
      if (exp.report_id && exp.report_id !== req.params.id) errors.push(`Expense ${exp.id} is already in another report`);
    }
    if (errors.length > 0) return res.status(400).json({ error: errors.join('; ') });

    // Assign expenses to this report (placeholders offset by 1 for report_id at $1)
    const updatePlaceholders = expense_ids.map((_, i) => `$${i + 2}`).join(',');
    await pool.query(
      `UPDATE expenses SET report_id = $1, updated_at = NOW() WHERE id IN (${updatePlaceholders})`,
      [req.params.id, ...expense_ids]
    );

    res.json({ ok: true, added: expense_ids.length });
  });

  /**
   * DELETE /api/expense-reports/:id/expenses/:expenseId
   * Remove an expense from a report (sets report_id to NULL). Only draft reports.
   */
  router.delete('/api/expense-reports/:id/expenses/:expenseId', requireNBI, async (req, res) => {
    const check = await pool.query('SELECT user_id, status FROM expense_reports WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    const report = check.rows[0];

    if (report.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (report.status !== 'draft') {
      return res.status(400).json({ error: 'Cannot modify a submitted report' });
    }

    await pool.query('UPDATE expenses SET report_id = NULL, updated_at = NOW() WHERE id = $1 AND report_id = $2', [req.params.expenseId, req.params.id]);
    res.json({ ok: true });
  });

  /**
   * DELETE /api/expense-reports/:id
   * Delete a draft expense report. Unlinks all its expenses (sets report_id to NULL).
   */
  router.delete('/api/expense-reports/:id', requireNBI, async (req, res) => {
    const check = await pool.query('SELECT user_id, status FROM expense_reports WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    const report = check.rows[0];

    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin && report.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    if (!isAdmin && report.status !== 'draft') {
      return res.status(400).json({ error: 'Cannot delete a submitted report' });
    }

    // Unlink expenses first
    await pool.query('UPDATE expenses SET report_id = NULL, updated_at = NOW() WHERE report_id = $1', [req.params.id]);
    await pool.query('DELETE FROM expense_reports WHERE id = $1', [req.params.id]);
    await auditLog('expense_report', req.params.id, 'delete', req.user.displayName);
    res.json({ ok: true });
  });

  /**
   * GET /api/expense-reports/:id/export
   * Export a report as a ZIP containing CSV + all receipt files.
   */
  router.get('/api/expense-reports/:id/export', requireNBI, async (req, res) => {
    const check = await pool.query(`
      SELECT r.*, u.display_name AS employee_name
      FROM expense_reports r LEFT JOIN users u ON r.user_id = u.id
      WHERE r.id = $1
    `, [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    const report = check.rows[0];

    // Get expenses
    const expResult = await pool.query(`
      SELECT e.*, c.name AS category_name
      FROM expenses e LEFT JOIN expense_categories c ON e.category_id = c.id
      WHERE e.report_id = $1 ORDER BY e.date
    `, [req.params.id]);
    const expenses = expResult.rows;

    // Get all receipts for these expenses
    const expIds = expenses.map(e => e.id);
    let receipts = [];
    if (expIds.length > 0) {
      const ph = expIds.map((_, i) => `$${i + 1}`).join(',');
      const rcptResult = await pool.query(`SELECT * FROM expense_receipts WHERE expense_id IN (${ph})`, expIds);
      receipts = rcptResult.rows;
    }

    // Build CSV
    const csvRows = [['Date', 'Description', 'Category', 'Amount (GBP)', 'VAT', 'Currency', 'Receipt', 'Status'].join(',')];
    let grandTotal = 0, vatTotal = 0;
    expenses.forEach(e => {
      const amt = parseFloat(e.amount) || 0;
      const vat = parseFloat(e.vat_amount) || 0;
      grandTotal += amt;
      vatTotal += vat;
      const desc = (e.description || '').replace(/[\t\n\r]/g, ' ').replace(/"/g, '""');
      const cat = (e.category_name || '').replace(/"/g, '""');
      const hasReceipt = receipts.some(r => r.expense_id === e.id) ? 'Yes' : 'No';
      csvRows.push([
        (e.date ? new Date(e.date).toISOString().slice(0, 10) : ''),
        `"${desc}"`,
        `"${cat}"`,
        amt.toFixed(2),
        vat ? vat.toFixed(2) : '',
        e.currency || 'GBP',
        hasReceipt,
        e.status || ''
      ].join(','));
    });
    csvRows.push('');
    csvRows.push(['', '', 'TOTAL', grandTotal.toFixed(2), vatTotal.toFixed(2)].join(','));
    csvRows.push(['', '', 'Expenses', expenses.length].join(','));
    csvRows.push(['', '', 'With receipts', receipts.length].join(','));
    const csvContent = '﻿' + csvRows.join('\r\n');

    // Build ZIP with archiver (loaded at startup)
    if (!archiver) return res.status(500).json({ error: 'archiver module not installed — ZIP export unavailable' });
    const archive = archiver('zip', { zlib: { level: 9 } });

    const safeName = (report.title || 'Expense_Report').replace(/[^a-zA-Z0-9-_ ]/g, '');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.zip"`);
    archive.pipe(res);

    // Add CSV
    archive.append(Buffer.from(csvContent, 'utf-8'), { name: `${safeName}.csv` });

    // Add receipt files
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    for (const rcpt of receipts) {
      const filePath = path.join(uploadsDir, rcpt.filename);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: `receipts/${rcpt.original_name || rcpt.filename}` });
      }
    }

    // Bank statements intentionally NOT included in the export. The previous
    // implementation dumped every *REDACTED*.pdf in uploads/ into every
    // expense-report ZIP — which meant one employee's export contained every
    // other employee's redacted bank statements (audit finding B-B20). Today
    // this is a latent leak because only Glen uses the system, but it would
    // fire the moment a second employee submits a report.
    // To re-enable, add a bank_statements table keyed by user_id, associate
    // redacted PDFs at upload time, and filter here on user_id = report.user_id.
    archive.finalize();
  });

  return router;
};
