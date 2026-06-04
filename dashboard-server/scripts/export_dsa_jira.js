/**
 * Export Lighthouse Games DS&A workload to Jira Ticket Template Excel format.
 *
 * Usage: node scripts/export_dsa_jira.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const ExcelJS = require('exceljs');

const DSA_ROOT_ID = '0b25d472-8aa6-4c8b-8ab9-da203765b179';
const PNL_EXCLUDE_ID = '07c8cdd1-14f9-4041-8139-01cb8cd154e4';
const OUTPUT_PATH = 'C:\\Users\\gpbea\\Downloads\\Lighthouse_DSA_Jira_Export.xlsx';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Recursive CTE to get full DS&A tree, excluding PnL subtree
    const query = `
      WITH RECURSIVE dsa_tree AS (
        -- Anchor: the DS&A project root
        SELECT id, title, item_type, status, priority, assignees,
               parent_id, description, hours_estimated, hours_spent,
               due_date, start_date, end_date, dependencies,
               sort_order, blocker_info, success_factor,
               health_state, collaborations, practice_area,
               0 AS depth
        FROM tasks
        WHERE id = $1

        UNION ALL

        -- Recurse into children, excluding the PnL subtree
        SELECT t.id, t.title, t.item_type, t.status, t.priority, t.assignees,
               t.parent_id, t.description, t.hours_estimated, t.hours_spent,
               t.due_date, t.start_date, t.end_date, t.dependencies,
               t.sort_order, t.blocker_info, t.success_factor,
               t.health_state, t.collaborations, t.practice_area,
               dt.depth + 1
        FROM tasks t
        INNER JOIN dsa_tree dt ON t.parent_id = dt.id
        WHERE t.id != $2
      )
      SELECT * FROM dsa_tree
      ORDER BY depth, sort_order, title;
    `;

    const { rows } = await pool.query(query, [DSA_ROOT_ID, PNL_EXCLUDE_ID]);
    console.log(`Fetched ${rows.length} items from DS&A tree.`);

    if (rows.length === 0) {
      console.error('No data found. Check the DS&A root ID.');
      process.exit(1);
    }

    // Build lookup maps
    const itemById = new Map();
    rows.forEach(r => itemById.set(r.id, r));

    // Resolve parent feature and story names for each item
    function getAncestors(item) {
      let feature = null;
      let story = null;
      let current = item;

      while (current.parent_id && itemById.has(current.parent_id)) {
        const parent = itemById.get(current.parent_id);
        if (parent.item_type === 'feature') feature = parent.title;
        if (parent.item_type === 'story') story = parent.title;
        current = parent;
      }

      return { feature, story };
    }

    // Resolve dependency IDs to titles
    function resolveDependencies(deps) {
      if (!deps || (Array.isArray(deps) && deps.length === 0)) return '';
      const depArray = Array.isArray(deps) ? deps : [deps];
      return depArray.map(depId => {
        const depItem = itemById.get(depId);
        return depItem ? depItem.title : depId;
      }).join(', ');
    }

    // Format blocker_info JSON to readable text
    function formatBlockerInfo(blocker) {
      if (!blocker) return '';
      let obj = blocker;
      if (typeof blocker === 'string') {
        try { obj = JSON.parse(blocker); } catch { return blocker; }
      }
      const parts = [];
      if (obj.blockedOn) parts.push(`Blocked on: ${obj.blockedOn}`);
      if (obj.toUnblock) parts.push(`To unblock: ${obj.toUnblock}`);
      if (obj.dateBlocked) parts.push(`Date blocked: ${obj.dateBlocked}`);
      if (obj.external) parts.push(`External: ${obj.external}`);
      if (obj.internal) parts.push(`Internal: ${obj.internal}`);
      return parts.join('\n');
    }

    // Clean trailing whitespace/newlines
    function cleanText(val) {
      if (!val) return '';
      return String(val).replace(/[\n\r\s]+$/, '').trim();
    }

    // Clean title whitespace
    function cleanTitle(val) {
      if (!val) return '';
      return String(val).trim();
    }

    // Format assignees
    function formatAssignees(assignees) {
      if (!assignees) return '';
      if (Array.isArray(assignees)) return assignees.join(', ');
      return String(assignees);
    }

    // Format date
    function formatDate(d) {
      if (!d) return '';
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return '';
      return dt.toISOString().split('T')[0];
    }

    // Skip the root project row itself — we want features, stories, tasks
    const exportRows = rows.filter(r => r.id !== DSA_ROOT_ID);

    // Group by feature for ordering
    // Build a tree structure: features -> stories -> tasks
    const features = exportRows.filter(r => r.item_type === 'feature');
    const stories = exportRows.filter(r => r.item_type === 'story');
    const tasks = exportRows.filter(r => r.item_type === 'task');

    // Order: feature row, then its stories (each followed by their tasks), then direct tasks of feature
    const orderedRows = [];

    for (const feat of features) {
      orderedRows.push(feat);

      // Stories under this feature
      const featStories = stories
        .filter(s => s.parent_id === feat.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      for (const story of featStories) {
        orderedRows.push(story);

        // Tasks under this story
        const storyTasks = tasks
          .filter(t => t.parent_id === story.id)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        orderedRows.push(...storyTasks);
      }

      // Direct tasks under this feature (no story parent)
      const directTasks = tasks
        .filter(t => t.parent_id === feat.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      orderedRows.push(...directTasks);
    }

    // Also include any orphaned stories/tasks not under a known feature
    const orderedIds = new Set(orderedRows.map(r => r.id));
    const orphans = exportRows.filter(r => !orderedIds.has(r.id));
    orderedRows.push(...orphans);

    console.log(`Exporting ${orderedRows.length} rows (${features.length} features, ${stories.length} stories, ${tasks.length} tasks).`);

    // Build Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NBI Hub Export';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('DS&A Jira Export', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    // Define columns
    const columns = [
      { header: 'Ticket Name', key: 'ticketName', width: 50 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Feature', key: 'feature', width: 30 },
      { header: 'Story', key: 'story', width: 30 },
      { header: 'Request', key: 'request', width: 60 },
      { header: 'Problem', key: 'problem', width: 20 },
      { header: 'Context', key: 'context', width: 40 },
      { header: 'Proposed Solution', key: 'proposedSolution', width: 20 },
      { header: 'Definition of Done', key: 'definitionOfDone', width: 50 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Assignees', key: 'assignees', width: 25 },
      { header: 'Hours Estimated', key: 'hoursEstimated', width: 16 },
      { header: 'Hours Spent', key: 'hoursSpent', width: 14 },
      { header: 'Start Date', key: 'startDate', width: 14 },
      { header: 'Due Date', key: 'dueDate', width: 14 },
      { header: 'Dependencies', key: 'dependencies', width: 40 },
      { header: 'End Date', key: 'endDate', width: 14 },
      { header: 'Health State', key: 'healthState', width: 18 },
      { header: 'Collaborations', key: 'collaborations', width: 60 },
      { header: 'Practice Area', key: 'practiceArea', width: 15 },
    ];
    sheet.columns = columns;

    // Style the header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2D3748' }  // dark blue-grey
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.height = 24;

    // Colour definitions
    const featureFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDBEAFE' }  // light blue
    };
    const storyFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD1FAE5' }  // light green
    };

    // Add data rows
    for (const item of orderedRows) {
      const { feature, story } = getAncestors(item);

      // Ticket Name: [Feature Name] Title — for features, just the title
      const title = cleanTitle(item.title);
      let ticketName;
      if (item.item_type === 'feature') {
        ticketName = title;
      } else if (feature) {
        ticketName = `[${cleanTitle(feature)}] ${title}`;
      } else {
        ticketName = title;
      }

      const row = sheet.addRow({
        ticketName,
        type: item.item_type,
        feature: cleanTitle(feature) || (item.item_type === 'feature' ? title : ''),
        story: cleanTitle(story) || (item.item_type === 'story' ? title : ''),
        request: cleanText(item.description),
        problem: '',
        context: formatBlockerInfo(item.blocker_info),
        proposedSolution: '',
        definitionOfDone: cleanText(item.success_factor),
        status: item.status || '',
        priority: item.priority || '',
        assignees: formatAssignees(item.assignees),
        hoursEstimated: item.hours_estimated || '',
        hoursSpent: item.hours_spent || '',
        startDate: formatDate(item.start_date),
        dueDate: formatDate(item.due_date),
        dependencies: resolveDependencies(item.dependencies),
        endDate: formatDate(item.end_date),
        healthState: item.health_state || '',
        collaborations: cleanText(item.collaborations),
        practiceArea: item.practice_area || '',
      });

      // Apply row colouring based on type
      if (item.item_type === 'feature') {
        row.eachCell({ includeEmpty: true }, cell => {
          cell.fill = featureFill;
          cell.font = { bold: true, size: 11 };
        });
      } else if (item.item_type === 'story') {
        row.eachCell({ includeEmpty: true }, cell => {
          cell.fill = storyFill;
          cell.font = { bold: true, size: 10 };
        });
      }

      // Wrap text for description and definition of done columns
      row.getCell('request').alignment = { wrapText: true, vertical: 'top' };
      row.getCell('definitionOfDone').alignment = { wrapText: true, vertical: 'top' };
      row.getCell('context').alignment = { wrapText: true, vertical: 'top' };
      row.getCell('dependencies').alignment = { wrapText: true, vertical: 'top' };
      row.getCell('collaborations').alignment = { wrapText: true, vertical: 'top' };
    }

    // Auto-filters on all columns
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: orderedRows.length + 1, column: columns.length }
    };

    // Auto-fit column widths based on content (with min/max)
    sheet.columns.forEach(col => {
      let maxLen = col.header.length;
      col.eachCell({ includeEmpty: false }, cell => {
        const val = cell.value ? String(cell.value) : '';
        // Use first line only for width calc
        const firstLine = val.split('\n')[0];
        if (firstLine.length > maxLen) maxLen = firstLine.length;
      });
      // Cap between header default and 80
      col.width = Math.min(Math.max(maxLen + 2, col.width || 12), 80);
    });

    // Write file
    await workbook.xlsx.writeFile(OUTPUT_PATH);
    console.log(`\nExcel file saved to: ${OUTPUT_PATH}`);
    console.log('Done.');

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
