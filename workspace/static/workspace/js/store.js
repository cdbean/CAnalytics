// do when items are added or removed from store
watch(wb.store, function(prop, action, difference, oldval) {
  var shelf = wb.shelf[prop];
  if (shelf) {
    if (difference) {
      if (difference.added.length) {
        // put_on_shelf(difference.added);
      }
      if (difference.removed.length) {
        // put_off_shelf(difference.removed);
      }
    }
  }
}, 1, true); // one level deep


watch(wb.shelf_by, function() {
  // do when filtering condition changes
  put_on_shelf();
});

function put_on_shelf() {
  reset_shelf();

  if (wb.shelf_by.datasets.length) {
    wb.shelf.datasets = wb.shelf.datasets.filter(function(d) {
      return wb.shelf_by.datasets.indexOf(d) > -1;
    });
    filter_by_dataset();
  }

  if (wb.shelf_by.dataentries.length) {
    wb.shelf.dataentries = wb.shelf.dataentries.filter(function(d) {
      return wb.shelf_by.indexOf(d) > -1;
    });
    filter_by_dataentry();
  }

  if (wb.shelf_by.annotations.length) {
    wb.shelf.annotations = wb.shelf.annotations.filter(function(d) {
      return wb.shelf_by.annotations.indexOf(d) > -1;
    });
    filter_by_annotation();
  }

  if (wb.shelf_by.entities.length) {
    filter_by_entity();
  }

  if (wb.shelf_by.relationships.length) {
    filter_by_relationship();
  }
}


function filter_by_dataset() {
  var selected_dataentries = [];

  wb.shelf.datasets.forEach(function(d) {
    var ds = wb.store.datasets[d];
    selected_dataentries = selected_dataentries.concat(ds.dataentries);
  });
  wb.shelf.dataentries = wb.shelf.dataentries.filter(function(d) {
    return selected_dataentries.indexOf(d) > -1;
  });

  filter_by_dataentry();
}


function filter_by_dataentry() {
  var selected_annotations = [];
  var selected_relationships = [];

  wb.shelf.dataentries.forEach(function(d) {
    var de = wb.store.dataentries[d];
    selected_annotations = selected_annotations.concat(de.annotations);
  });
  wb.shelf.annotations = wb.shelf.annotations.filter(function(d) {
    return selected_annotations.indexOf(d) > -1;
  });
  wb.shelf.annotations.forEach(function(d) {
    var ann = wb.store.annotations[d];
    selected_entities.push(ann.entity);
  });
  wb.shelf.entities = wb.shelf.entities.filter(function(d) {
    return selected_entities.indexOf(d) > -1;
  });
  wb.shelf.entities.forEach(function(d) {
    var ent = wb.store.entities[d];
    selected_relationships = selected_relationships.concat(ent.relationships);
  })
  wb.shelf.relationships = wb.shelf.relationships.filter(function(d) {
    return selected_relationships.indexOf(d) > -1;
  });
}


function filter_by_annotation() {
  var selected_dataentries = [];
  var selected_entities = [];
  var selected_relationships = [];

  wb.shelf.annotations.forEach(function(d) {
    var ann = wb.store.annotations[d];
    selected_dataentries.push(ann.dataentry);
    selected_entities.push(ann.entity);
    selected_relationships.push(ann.relationship);
  });
  wb.shelf.dataentries = wb.shelf.dataentries.filter(function(d) {
    return selected_dataentries.indexOf(d) > -1;
  });
  wb.shelf.entities = wb.shelf.entities.filter(function(d) {
    return selected_entities.indexOf(d) > -1;
  });
  wb.shelf.relationships = wb.shelf.relationships.filter(function(d) {
    return selected_relationships.indexOf(d) > -1;
  });
}


function filter_by_entity() {
  var selected_relationships = [];
  var selected_annotations = [];
  var selected_entities = [];
  var selected_dataentries = [];

  wb.shelf_by.entities.forEach(function(ent_id) {
    var ent = wb.store.entity[ent_id];
    selected_relationships.push(ent.meta.relationships);
    selected_annotations = selected_annotations.concat(ent.meta.annotations);
  });
  wb.shelf.relationships = wb.shelf.relationships.filter(function(d) {
    return selected_relationships.indexOf(d) > -1;
  });
  wb.shelf.annotations = wb.shelf.annotations.filter(function(d) {
    return selected_annotations.indexOf(d) > -1;
  });
  wb.shelf.relationships.forEach(function(d) {
    var r = wb.store.relationships[d];
    selected_entities.push(r.primary.source);
    selected_entities.push(r.primary.target);
  });
  wb.shelf.entities = wb.shelf.entities.filter(function(d) {
    return selected_entities.indexOf(d) > -1;
  });
  wb.shelf.annotation.forEach(function(d) {
    var ann = wb.store.annotations[d];
    selected_dataentries.push(ann.dataentry);
  });
  wb.shelf.dataentries = wb.shelf.dataentries.filter(function(d) {
    return selected_dataentries.indexOf(d) > -1;
  });
}


function filter_by_relationship() {
  var selected_entities = [];
  var selected_annotations = [];
  var selected_dataentries = [];

  wb.shelf.relationships = wb.shelf.relationships.filter(function(d) {
    return wb.shelf_by.relationships.indexOf(d) > -1;
  });
  wb.shelf.relationships.forEach(function(d) {
    var r = wb.store.relationships[d];
    selected_entities.push(r.primary.source);
    selected_entities.push(r.primary.target);
    selected_annotations = selected_annotations.concat(r.meta.annotations);
  });
  wb.shelf.entities = wb.shelf.entities.filter(function(d) {
    return selected_entities.indexOf(d) > -1;
  });
  wb.shelf.annotations = wb.shelf.annotations.filter(function(d) {
    return selected_annotations.indexOf(d) > -1;
  });
  wb.shelf.annotation.forEach(function(d) {
    var ann = wb.store.annotations[d];
    selected_dataentries.push(ann.dataentry);
  });
  wb.shelf.dataentries = wb.shelf.dataentries.filter(function(d) {
    return selected_dataentries.indexOf(d) > -1;
  });
}


function reset_shelf() {
  for (var s in wb.shelf) {
    wb.shelf[s] = [];
    for (var id in wb.store[s]) {
      wb.shelf[s].push(parseInt(id));
    }
  }
}
