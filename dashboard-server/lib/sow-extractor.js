/**
 * SoW Text Extractor with Pricing/Legal Filter
 *
 * Extracts work-package content from Statement of Work PDFs while STRIPPING:
 *  - Any pricing, fees, rates, payment terms, invoices
 *  - Any legal clauses (confidentiality, indemnification, liability, IP, etc.)
 *
 * Employees must never see commercial terms or legal language from SoWs.
 * If ANY portion of a paragraph looks like pricing or legal content, the
 * ENTIRE paragraph is discarded. This is a defensive filter — false
 * positives (dropping legitimate content) are acceptable, false negatives
 * (leaking pricing/legal) are not.
 *
 * Usage:
 *   const { extractWorkPackage } = require('./lib/sow-extractor');
 *   const result = await extractWorkPackage(pdfBuffer);
 *   // result = { text, stats: { totalParagraphs, kept, filtered } }
 */

const { PDFParse } = require('pdf-parse');

// ==================== FILTER PATTERNS ====================

/**
 * Regex patterns that indicate a paragraph contains pricing or commercial info.
 * Any match causes the paragraph to be DROPPED entirely.
 */
const PRICING_PATTERNS = [
  // Currency symbols with numbers (any currency)
  /[£$€¥]\s?[\d,.]+/,
  /[\d,.]+\s?(?:GBP|USD|EUR|JPY|CAD|AUD)\b/i,
  /\b(?:GBP|USD|EUR|JPY|CAD|AUD)\s?[\d,.]+/i,
  // Percentages with money context
  /\d+\s?%\s*(?:VAT|tax|markup|margin|discount)/i,
  // Explicit pricing terminology
  /\b(?:fee|fees|rate|rates|cost|costs|price|prices|pricing|charge|charges|invoice|invoices|payment|payments|compensation|remuneration|retainer)\b/i,
  /\b(?:day rate|daily rate|hourly rate|flat fee|fixed fee|blended rate|unit price)\b/i,
  /\b(?:total|subtotal|sum total|grand total|amount due|amount payable|net|gross)\b/i,
  /\b(?:per day|per hour|per week|per month|per annum|per year)\b.*[\d£$€]/i,
  // Payment terms
  /\b(?:net 30|net 60|net 90|due on receipt|payable within|payable upon|upon invoice)\b/i,
  /\b(?:milestone payment|staged payment|deposit|advance payment|balloon payment)\b/i,
  // Budget language
  /\b(?:budget|budgeted|estimate|estimated cost|project cost|total cost|not to exceed|NTE)\b/i,
  // Banking / payment methods
  /\b(?:bank account|sort code|account number|IBAN|BIC|SWIFT|wire transfer|bank transfer|BACS|ACH)\b/i,
  // VAT and tax language
  /\bVAT\b|\bvalue added tax\b|\bsales tax\b|\bwithholding tax\b/i,
];

/**
 * Regex patterns that indicate a paragraph contains legal/contractual language.
 * Any match causes the paragraph to be DROPPED entirely.
 */
const LEGAL_PATTERNS = [
  // Confidentiality and NDA
  /\b(?:confidentiality|confidential information|non-?disclosure|NDA)\b/i,
  // IP and ownership
  /\b(?:intellectual property|IP rights?|copyright|trademark|patent|trade secret|proprietary rights?|ownership of|work product)\b/i,
  // Liability
  /\b(?:limitation of liability|limited liability|liability cap|liable for|indemnif|hold harmless)\b/i,
  // Warranty and disclaimers
  /\b(?:warrant(?:y|ies)|disclaimer|as is|merchantability|fitness for (?:a particular )?purpose)\b/i,
  // Termination
  /\b(?:termination|terminate|terminated|rescind|rescission|cancellation clause|material breach)\b/i,
  // Dispute resolution
  /\b(?:dispute resolution|arbitration|mediation|jurisdiction|governing law|governed by|venue|forum)\b/i,
  // Force majeure
  /\bforce majeure\b/i,
  // Signatures and execution
  /\b(?:signed by|signature|duly authorised|duly authorized|executed on|in witness whereof)\b/i,
  // Legal party references
  /\b(?:the parties|both parties|neither party|either party|party hereto|hereunder|herein|hereinafter|whereas)\b/i,
  // Regulatory
  /\b(?:GDPR|data protection act|Data Processing Agreement|DPA|UK GDPR|EU GDPR|CCPA)\b/i,
  // Entire agreement
  /\bentire agreement\b|\bamendment|\bmodification|\bno waiver\b/i,
  // Insurance
  /\b(?:professional indemnity|PI insurance|public liability insurance|employer's liability)\b/i,
];

/**
 * Section header patterns. When a paragraph matches one of these, the
 * extractor enters "skip mode" until it sees a header that looks safe.
 * This catches entire pricing / legal sections even if individual
 * paragraphs don't contain obvious keywords.
 */
const SKIP_SECTION_HEADERS = [
  /^(?:\d+[\.)]\s*)?(?:fees?|pricing|costs?|compensation|payment terms?|financial terms?|charges?|rates?|commercial terms?)\b/i,
  /^(?:\d+[\.)]\s*)?(?:terms (?:and|&) conditions|legal|legal terms?|general terms?)\b/i,
  /^(?:\d+[\.)]\s*)?(?:confidentiality|non-?disclosure|NDA)\b/i,
  /^(?:\d+[\.)]\s*)?(?:intellectual property|IP|ownership)\b/i,
  /^(?:\d+[\.)]\s*)?(?:limitation of liability|liability|indemnif)/i,
  /^(?:\d+[\.)]\s*)?(?:warrant|disclaimer)/i,
  /^(?:\d+[\.)]\s*)?(?:termination|dispute|governing law|jurisdiction)\b/i,
  /^(?:\d+[\.)]\s*)?(?:signatures?|signature block|execution)\b/i,
  /^(?:\d+[\.)]\s*)?(?:insurance|force majeure)\b/i,
  /^(?:\d+[\.)]\s*)?(?:data protection|GDPR|privacy)\b/i,
];

/**
 * Section header patterns that indicate a section is SAFE (work-package content).
 * When the extractor sees one of these while in "skip mode", skip mode is reset
 * and subsequent content is processed normally.
 */
const SAFE_SECTION_HEADERS = [
  /^(?:\d+[\.)]\s*)?(?:executive summary|overview|introduction|background|context)\b/i,
  /^(?:\d+[\.)]\s*)?(?:scope|scope of work|project scope|work scope)\b/i,
  /^(?:\d+[\.)]\s*)?(?:deliverables?|outputs?|outcomes?|artefacts?|artifacts?)\b/i,
  /^(?:\d+[\.)]\s*)?(?:timeline|schedule|milestones?|phases?|plan|project plan)\b/i,
  /^(?:\d+[\.)]\s*)?(?:team|team structure|resourcing|staffing|roles?)\b/i,
  /^(?:\d+[\.)]\s*)?(?:approach|methodology|method)\b/i,
  /^(?:\d+[\.)]\s*)?(?:assumptions?|dependencies|dependenc(?:y|ies)|risks?|constraints?)\b/i,
  /^(?:\d+[\.)]\s*)?(?:acceptance criteria|success criteria|definition of done)\b/i,
  /^(?:\d+[\.)]\s*)?(?:communication|reporting|governance|ways of working)\b/i,
  /^(?:\d+[\.)]\s*)?(?:objectives?|goals?|aims?)\b/i,
];

// ==================== EXTRACTION LOGIC ====================

/**
 * Determine whether a paragraph contains any pricing or legal content.
 * @param {string} paragraph
 * @returns {boolean} true if the paragraph should be FILTERED OUT
 */
function isUnsafeParagraph(paragraph) {
  const text = paragraph.trim();
  if (!text) return false;
  for (const pattern of PRICING_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  for (const pattern of LEGAL_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  return false;
}

/**
 * Determine whether a line looks like a section header that starts a
 * pricing or legal section.
 * @param {string} line
 * @returns {boolean}
 */
function isSkipSectionHeader(line) {
  const text = line.trim();
  if (!text || text.length > 100) return false; // headers are usually short
  for (const pattern of SKIP_SECTION_HEADERS) {
    if (pattern.test(text)) return true;
  }
  return false;
}

/**
 * Determine whether a line looks like a section header that starts a
 * safe work-package section.
 * @param {string} line
 * @returns {boolean}
 */
function isSafeSectionHeader(line) {
  const text = line.trim();
  if (!text || text.length > 100) return false;
  for (const pattern of SAFE_SECTION_HEADERS) {
    if (pattern.test(text)) return true;
  }
  return false;
}

/**
 * Split extracted PDF text into paragraphs. Handles both double-newline
 * separated text (common in Markdown/txt exports) and single-newline
 * separated text (what pdf-parse returns). Strips page markers.
 * @param {string} rawText
 * @returns {string[]}
 */
function splitIntoParagraphs(rawText) {
  // Normalise line endings, strip pdf-parse page markers, then collapse
  // any resulting runs of blank lines.
  let normalised = rawText
    .replace(/\r\n/g, '\n')
    .replace(/^-- \d+ of \d+ --\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Count actual paragraph breaks (double newlines surrounded by content)
  const paragraphBreaks = (normalised.match(/\S\n\n\S/g) || []).length;

  // If we have at least a few paragraph breaks, use them as splits
  if (paragraphBreaks >= 2) {
    return normalised.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
  }

  // Otherwise treat each non-empty line as its own paragraph.
  // pdf-parse generally emits one line per visual line in the PDF,
  // which is good enough for section/paragraph-level filtering.
  return normalised.split('\n').map(l => l.trim()).filter(Boolean);
}

/**
 * Main extraction entry point. Takes a PDF buffer and returns filtered
 * work-package text plus statistics.
 *
 * @param {Buffer} pdfBuffer The raw PDF file contents
 * @returns {Promise<{text: string, stats: {totalParagraphs: number, kept: number, filtered: number, filteredReasons: Object}}>}
 */
async function extractWorkPackage(pdfBuffer) {
  if (!Buffer.isBuffer(pdfBuffer)) {
    throw new Error('extractWorkPackage requires a Buffer');
  }

  const parser = new PDFParse({ data: pdfBuffer });
  const parsed = await parser.getText();
  await parser.destroy();
  const rawText = parsed.text || '';
  if (!rawText.trim()) {
    return { text: '', stats: { totalParagraphs: 0, kept: 0, filtered: 0, filteredReasons: {} } };
  }

  const paragraphs = splitIntoParagraphs(rawText);
  const keptParagraphs = [];
  const stats = {
    totalParagraphs: paragraphs.length,
    kept: 0,
    filtered: 0,
    filteredReasons: { pricingOrLegal: 0, skipSection: 0 },
  };

  let inSkipSection = false;

  for (const paragraph of paragraphs) {
    // Check if this paragraph starts a skip section
    if (isSkipSectionHeader(paragraph)) {
      inSkipSection = true;
      stats.filtered++;
      stats.filteredReasons.skipSection++;
      continue;
    }

    // Check if this paragraph starts a safe section — exit skip mode
    if (isSafeSectionHeader(paragraph)) {
      inSkipSection = false;
      // Still need to check the paragraph content itself
    }

    if (inSkipSection) {
      stats.filtered++;
      stats.filteredReasons.skipSection++;
      continue;
    }

    // Content-level filter — defensive
    if (isUnsafeParagraph(paragraph)) {
      stats.filtered++;
      stats.filteredReasons.pricingOrLegal++;
      continue;
    }

    keptParagraphs.push(paragraph);
    stats.kept++;
  }

  return {
    text: keptParagraphs.join('\n\n'),
    stats,
  };
}

module.exports = {
  extractWorkPackage,
  // Exported for testing
  _internal: {
    isUnsafeParagraph,
    isSkipSectionHeader,
    isSafeSectionHeader,
    splitIntoParagraphs,
    PRICING_PATTERNS,
    LEGAL_PATTERNS,
    SKIP_SECTION_HEADERS,
    SAFE_SECTION_HEADERS,
  },
};
