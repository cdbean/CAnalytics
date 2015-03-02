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
  $.subscribe('relationship/updated', onRelationshipsUpdated);
  $.subscribe('relationship/deleted', onRelationshipsDeleted);

  $.subscribe('annotation/created', onAnnotationsCreated);
  $.subscribe('annotation/updated', onAnnotationsUpdated);
  $.subscribe('annotation/deleted', onAnnotationsDeleted);

  $.subscribe('message/new', onNewMessage);

  $.subscribe('user/online', onUserOnline);


  function onUserOnline() {
    var users = [].slice.call(arguments, 1);

    wb.info.online_users = users;
    //
    // render current user list on page header
    $('.navbar #userlist').empty();
    for (var i = 0; i < wb.info.online_users.length; i++) {
      var id = wb.info.online_users[i];
      // do not show current user
      if (id == wb.info.user) continue;

      var name = wb.info.users[id].name;
      var color = wb.info.users[id].color;
      var li = $('<li class="userlist-item dropdown"></li>')
        .appendTo($('.navbar #userlist'));

      $('<span class="label label-primary"></span>').appendTo(li)
        .text(name)
        .css('color', color)
      ;
    }

  }

  function onDataLoaded() {
    $('#progressbar').hide();
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
    var entities = [].slice.call(arguments, 1);
    for (var i = 0, len = entities.length; i < len; i++) {
      var e = entities[i];
      if (e.deleted) wb.store.removeItems(e, 'entities');
      else wb.store.addItems(e, 'entities');
    }
  }

  function onEntitiesDeleted() {
    var entities = [].slice.call(arguments, 1);
    wb.store.removeItems(entities, 'entities');
  }

  function onRelationshipsCreated() {
    var rels = [].slice.call(arguments, 1);
    wb.store.addItems(rels, 'relationships');
  }

  function onRelationshipsUpdated() {
    var rels = [].slice.call(arguments, 1);
    for (var i = 0, len = rels.length; i < len; i++) {
      var r = rels[i];
      if (r.deleted) wb.store.removeItems(r, 'relationships');
      else wb.store.addItems(r, 'relationships');
    }
  }

  function onRelationshipsDeleted() {
    var rels = [].slice.call(arguments, 1);
    wb.store.removeItems(rels, 'relationships');
  }


  function onAnnotationsCreated() {
    var anns = [].slice.call(arguments, 1);
    wb.store.addItems(anns, 'annotations');

  }

  function onAnnotationsUpdated() {
    var anns = [].slice.call(arguments, 1);
    for (var i = 0, len = anns.length; i < len; i++) {
      var r = anns[i];
      if (r.deleted) wb.store.removeItems(r, 'annotations');
      else wb.store.addItems(r, 'annotations');
    }
  }

  function onAnnotationsDeleted() {
    var anns = [].slice.call(arguments, 1);
    wb.store.removeItems(anns, 'annotations');
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
      viz.loadMessage(msg);
    });
  }
})();
