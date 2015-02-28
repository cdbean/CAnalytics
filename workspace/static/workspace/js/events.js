(function() {
  // after all data loaded
  $.subscribe('data/loaded', onDataLoaded);


  // after data is updated, e.g. new annotation, entity, rel
  $.subscribe('data/updated', onDataUpdated);

  // after filtering
  $.subscribe('data/filter', onDataFiltered);


  $.subscribe('entity/created', onEntitiesCreated);
  $.subscribe('entity/updated', onEntitiesUpdated);
  $.subscribe('entity/deleted', onEntitiesDeleted);

  $.subscribe('relationship/created', onRelationshipsCreated);

  $.subscribe('message/new', onNewMessage);

  $.subscribe('user/online', onUserOnline);


  function onUserOnline() {
    var users = [].slice.call(arguments, 1);
  }

  function onDataLoaded() {
  }

  function onDataUpdated() {
    updateDataBut(['.dataentry']);
    updateViewsBut(['.dataentry']);
  }

  function onDataFiltered() {
    wb.store.setShelf();

    var except = [].slice.call(arguments, 1)
    updateViewsBut(except);
  }

  function onEntitiesCreated() {
    var entities = [].slice.call(arguments, 1);
    wb.store.addItems(entities, 'entities');
  }

  function onEntitiesUpdated() {
    onEntitiesCreated(arguments);
  }

  function onEntitiesDeleted() {
    var entities = [].slice.call(arguments, 1);
    wb.store.items.removeItems(entities, 'entities');
  }

  function onRelationshipsCreated() {
    var rels = [].slice.call(arguments, 1);
    wb.store.addItems(rels, 'relationships');
  }

  function onRelationshipsUpdated() {
    onRelationshipsUpdated(arguments);
  }

  function onRelationshipsDeleted() {
    var rels = [].slice.call(arguments, 1);
    wb.store.removeItems(rels, 'relationships');
  }

  function updateDataBut(except) {
    except = except || [];
    if (except.constructor !== Array)
      except = [except];

    $('.viz').not(except.join(',')).not('.locked').each(function(i, viz) {
      var viz = $(viz).data('instance');
      if (viz) {
        viz.updateData();
      }
    })
  }

  function updateViewsBut(except) {
    except = except || [];
    if (except.constructor !== Array)
      except = [except];

    $('.viz').not(except.join(',')).not('.locked').each(function(i, viz) {
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
})();
