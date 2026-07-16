// ==================== GROUPING ENGINE ====================
// Foundation 6. groupItems is pure (no DOM) so it can be unit-tested.
// Rendering helpers live below it.

function groupItems(items, opts) {
  if (!items || items.length === 0) return [];
  opts = opts || {};
  var getValue = opts.getValue || function(it) { return it[opts.field]; };
  var emptyLabel = opts.emptyLabel || 'None';

  var map = new Map();
  items.forEach(function(it) {
    var raw = getValue(it);
    var key = (raw === null || raw === undefined || raw === '') ? '__empty__' : String(raw);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(it);
  });

  var groups = [];
  map.forEach(function(groupedItems, key) {
    var label = key === '__empty__' ? emptyLabel : key;
    var stats = { count: groupedItems.length };
    if (typeof opts.aggregate === 'function') {
      var extra = opts.aggregate(groupedItems);
      for (var k in extra) stats[k] = extra[k];
    }
    groups.push({ key: key === '__empty__' ? label : key, label: label, items: groupedItems, stats: stats });
  });

  var sort = opts.sort || 'alpha';
  if (sort === 'alpha') groups.sort(function(a, b) { return a.label.localeCompare(b.label); });
  else if (sort === 'count-asc') groups.sort(function(a, b) { return a.stats.count - b.stats.count; });
  else if (sort === 'count-desc') groups.sort(function(a, b) { return b.stats.count - a.stats.count; });
  else if (sort === 'custom' && Array.isArray(opts.customOrder)) {
    groups.sort(function(a, b) {
      var ai = opts.customOrder.indexOf(a.key); var bi = opts.customOrder.indexOf(b.key);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }
  return groups;
}
