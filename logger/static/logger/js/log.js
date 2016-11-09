if (!wb) {
  wb = {};
}

wb.log = {};

wb.log.log = function(act) {
  var action = {
    group: GROUP,
    case: CASE,
    operation: '',
    item: '',
    data: '{}',
    tool: '',
    public: true
  };
  $.extend(action, act);

  $.post(GLOBAL_URL.log, action, function(res) {
    console.log(res.operation + ' ' + res.item + ' ' + (res.data.name || '') + ' in ' + res.tool);
  });
};

wb.log.logAnnotation = function(ann) {
  // id
  // name
  // anchor
  // quote
  // created_at
  // created_by
  // last_edited_at
  // last_edited_by
  // entity
  // relationship
  var a = _.clone(ann);
  var anchor = wb.store.items.dataentries[a.anchor];
  a.anchor = {id: anchor.id, name: anchor.name};
  a.name = a.quote;
  ['created_by', 'last_edited_by'].forEach(function(attr) {
    if (attr in a) {
      var u = wb.info.users[a[attr]];
      a[attr] = {id: u.id, name: u.name};
    }
  });
  if ('entity' in a) {
    if (a.entity.entity_type === 'relationship') {
      var r = wb.store.items.relationships[a.entity.id];
      if (r) {
        var source = wb.store.items.entities[r.primary.source];
        source = {id: source.meta.id, entity_type: source.primary.entity_type, name: source.primary.name};
        var target = wb.store.items.entities[r.primary.target];
        target = {id: target.meta.id, entity_type: target.primary.entity_type, name: target.primary.name};
        a.entity = {id: r.meta.id, relation: r.primary.relation, source: source, target: target};
      }
    } else {
      var e = wb.store.items.entities[a.entity.id];
      if (e) {
        a.entity = {id: e.meta.id, entity_type: e.primary.entity_type, name: e.primary.name};
      }
    }
  }
  return JSON.stringify(a);
};

wb.log.logAnnotations = function(anns) {
  return '[' + anns.map(wb.log.logAnnotation).join(',') + ']';
};

// dump entity or relationship
wb.log.logItem = function(item) {
  if (item.constructor === Object) {
    return (item.id || item.meta.id).toString();
  } else if (item.constructor === Array) {
    if (item[0].constructor === Object) {
      return item.map(function(d) { return d.id || d.meta.id; }).toString();
    } else {
      return item.toString();
    }
  } else {
    return item.toString();
  }
};

wb.log.logDocs = function(docs) {
  return '[' + docs.map(wb.log.logDoc).join(',') + ']';
};

wb.log.logDoc = function(doc) {
  var de = wb.store.items.dataentries[doc.id];
  var ds = wb.store.items.datasets[de.dataset];
  return JSON.stringify({id: de.id, name: de.name, dataset: {id: ds.id, name: ds.name}});
};
