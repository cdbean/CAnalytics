(function() {
  // after all data loaded
  $.subscribe('data/loaded', function() {
    reset_shelf();
    put_on_shelf();
  });


  // after data is updated, e.g. new annotation, entity, rel
  // shelf is annotation, entity, rel, or dataentry
  // call updateData() of the corresponding view
  $.subscribe('data/update', onDataUpdated);

  // after filtering
  // call update() of views
  $.subscribe('data/filter', onDataFiltered);


  $.subscribe('entity/created', onEntitiesCreated);

  $.subscribe('relationship/created', onRelationshipsCreated);

  $.subscribe('message/new', onNewMessage);

  $.subscribe('user/online', onUserOnline);


  function onUserOnline() {
    var users = [].slice.call(arguments, 1);
  }

  function onDataUpdated(e, shelf) {
    updateDataBut(['.dataentry']);
  }

  function onDataFiltered() {
    makeShelf();

    var except = [].slice.call(arguments, 1)
    updateViewsBut(except);
  }

  function onEntitiesCreated() {
    var entities = [].slice.call(arguments, 1);

    for (var i = 0, len = entities.length; i < len; i++) {
      var entity = entities[i];
      if (entity.primary.entity_type === 'location') {
          entity.primary.geometry = wb.utility.formatGeometry(entity);
      }
      wb.store.entities[entity.meta.id] = entity;
    }
  }

  function onRelationshipsCreated() {
    var relationships = [].slice.call(arguments, 1);
    for (var i = 0, len = relationships.length; i < len; i++) {
      var rel = relationships[i];
      wb.store.relationships[rel.meta.id] = rel;
    }
  }

  function updateDataBut(except) {
    except = except || [];
    $('.viz').not(except.join(',')).each(function(i, viz) {
      var viz = $(viz).data('instance');
      if (viz) {
        viz.updateData();
      }
    })
  }

  function updateViewsBut(except) {
    except = except || [];
    $('.viz').not(except.join(',')).each(function(i, viz) {
      var viz = $(viz).data('instance');
      if (viz) {
        viz.updateView();
      }
    })
  }

  function onNewMessage(e, msg) {
    $('.viz.message').each(function(i, viz) {
      viz = $(viz).data('instance');
      viz.loadMessage(data);
    });
  }

  function makeShelf() {
    reset_shelf();
    put_on_shelf();
  }

  function put_on_shelf(shelf) {
    if (wb.shelf_by.datasets.length) {
      filter_by_dataset(shelf);
    } else {
      wb.shelf.datasets = [];
      wb.shelf.dataentries = [];
    }

    if (wb.shelf_by.dataentries.length) {
      filter_by_dataentry(shelf);
    }

    if (wb.shelf_by.annotations.length) {
      filter_by_annotation(shelf);
    }

    if (wb.shelf_by.entities.length) {
      filter_by_entity(shelf);
    }

    if (wb.shelf_by.relationships.length) {
      filter_by_relationship(shelf);
    }
  }


  function filter_by_dataset(shelf) {
    var selected_dataentries = [];

    if (['annotations', 'entities', 'relationships'].indexOf(shelf) > -1) return;

    wb.shelf.datasets = wb.shelf.datasets.filter(function(d) {
      return wb.shelf_by.datasets.indexOf(d) > -1;
    });

    if (shelf === 'datasets') return;

    wb.shelf.datasets.forEach(function(d) {
      var ds = wb.store.datasets[d];
      selected_dataentries = selected_dataentries.concat(ds.dataentries);
    });
    wb.shelf.dataentries = wb.shelf.dataentries.filter(function(d) {
      return selected_dataentries.indexOf(d) > -1;
    });
  }


  function filter_by_dataentry(shelf) {
    var selected_annotations = [];
    var selected_relationships = [];
    var selected_entities = [];

    wb.shelf.dataentries = wb.shelf.dataentries.filter(function(d) {
      return wb.shelf_by.indexOf(d) > -1;
    });
    if (shelf === 'dataentries') return;

    wb.shelf.dataentries.forEach(function(d) {
      var de = wb.store.dataentries[d];
      selected_annotations = selected_annotations.concat(de.annotations);
    });
    wb.shelf.annotations = wb.shelf.annotations.filter(function(d) {
      return selected_annotations.indexOf(d) > -1;
    });
    if (shelf === 'annotations') return;

    wb.shelf.annotations.forEach(function(d) {
      var ann = wb.store.annotations[d];
      selected_entities.push(ann.entity);
    });
    wb.shelf.entities = wb.shelf.entities.filter(function(d) {
      return selected_entities.indexOf(d) > -1;
    });
    if (shelf === 'entities') return;

    wb.shelf.entities.forEach(function(d) {
      var ent = wb.store.entities[d];
      selected_relationships = selected_relationships.concat(ent.relationships);
    })
    wb.shelf.relationships = wb.shelf.relationships.filter(function(d) {
      return selected_relationships.indexOf(d) > -1;
    });
  }


  function filter_by_annotation(shelf) {
    var selected_dataentries = [];
    var selected_entities = [];
    var selected_relationships = [];

    wb.shelf.annotations = wb.shelf.annotations.filter(function(d) {
      return wb.shelf_by.annotations.indexOf(d) > -1;
    });
    if (shelf === 'annotations') return;

    wb.shelf.annotations.forEach(function(d) {
      var ann = wb.store.annotations[d];
      selected_dataentries.push(ann.anchor);
      selected_entities.push(ann.entity);
      selected_relationships.push(ann.relationship);
    });
    wb.shelf.dataentries = wb.shelf.dataentries.filter(function(d) {
      return selected_dataentries.indexOf(d) > -1;
    });
    if (shelf === 'dataentries') return;

    wb.shelf.entities = wb.shelf.entities.filter(function(d) {
      return selected_entities.indexOf(d) > -1;
    });
    if (shelf === 'entities') return;

    wb.shelf.relationships = wb.shelf.relationships.filter(function(d) {
      return selected_relationships.indexOf(d) > -1;
    });
  }


  function filter_by_entity(shelf) {
    var selected_relationships = [];
    var selected_annotations = [];
    var selected_entities = wb.shelf_by.entities.slice();
    var selected_dataentries = [];

    wb.shelf_by.entities.forEach(function(ent_id) {
      var ent = wb.store.entities[ent_id];
      selected_relationships = selected_relationships.concat(ent.meta.relationships);
      selected_annotations = selected_annotations.concat(ent.meta.annotations);
    });
    wb.shelf.relationships = wb.shelf.relationships.filter(function(d) {
      return selected_relationships.indexOf(d) > -1;
    });
    if (shelf === 'relationships') return;

    wb.shelf.annotations = wb.shelf.annotations.filter(function(d) {
      return selected_annotations.indexOf(d) > -1;
    });
    if (shelf === 'annotations') return;

    wb.shelf.relationships.forEach(function(d) {
      var r = wb.store.relationships[d];
      selected_entities.push(r.primary.source);
      selected_entities.push(r.primary.target);
    });
    wb.shelf.entities = wb.shelf.entities.filter(function(d) {
      return selected_entities.indexOf(d) > -1;
    });
    if (shelf === 'entities') return;

    wb.shelf.annotations.forEach(function(d) {
      var ann = wb.store.annotations[d];
      selected_dataentries.push(ann.anchor);
    });
    wb.shelf.dataentries = wb.shelf.dataentries.filter(function(d) {
      return selected_dataentries.indexOf(d) > -1;
    });
  }


  function filter_by_relationship(shelf) {
    var selected_entities = [];
    var selected_annotations = [];
    var selected_dataentries = [];

    wb.shelf.relationships = wb.shelf.relationships.filter(function(d) {
      return wb.shelf_by.relationships.indexOf(d) > -1;
    });
    if (shelf === 'relationships') return;

    wb.shelf.relationships.forEach(function(d) {
      var r = wb.store.relationships[d];
      selected_entities.push(r.primary.source);
      selected_entities.push(r.primary.target);
      selected_annotations = selected_annotations.concat(r.meta.annotations);
    });
    wb.shelf.entities = wb.shelf.entities.filter(function(d) {
      return selected_entities.indexOf(d) > -1;
    });
    if (shelf === 'entities') return;

    wb.shelf.annotations = wb.shelf.annotations.filter(function(d) {
      return selected_annotations.indexOf(d) > -1;
    });
    if (shelf === 'annotations') return;

    wb.shelf.annotations.forEach(function(d) {
      var ann = wb.store.annotations[d];
      selected_dataentries.push(ann.anchor);
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

})();
