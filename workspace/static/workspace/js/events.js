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
  $.subscribe('entity/restored', onEntitiesRestored);
  $.subscribe('entity/attribute/update', onEntityAttrUpdated);

  $.subscribe('relationship/created', onRelationshipsCreated);
  $.subscribe('relationship/updated', onRelationshipsUpdated);
  $.subscribe('relationship/deleted', onRelationshipsDeleted);
  $.subscribe('relationship/restored', onRelationshipsRestored);

  $.subscribe('annotation/created', onAnnotationsCreated);
  $.subscribe('annotation/updated', onAnnotationsUpdated);
  $.subscribe('annotation/deleted', onAnnotationsDeleted);
  $.subscribe('annotation/restored', onAnnotationsRestored);

  $.subscribe('message/new', onNewMessage);
  $.subscribe('action/new', onNewAction);

  $.subscribe('user/online', onUserOnline);


  // lister to the following events and broadcast
  $.subscribe('user/tool', onUserTool);

  function onUserTool(e, d) {
    if (window.ishout) {
      ishout.rooms.forEach(function(r) {
        ishout.socket.emit('user.tool', r.roomName, {user: wb.info.user, tool: d});
      });
    }
  }


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

      if (!(id in wb.info.users)) continue;
      var name = wb.info.users[id].name;
      var color = wb.info.users[id].color;
      var li = $('<li class="userlist-item dropdown"></li>')
        .appendTo($('.navbar #userlist'));

      $('<a class="label label-primary"></a>').appendTo(li)
        .text(name)
        .attr('id', 'user-' + id)
        .css('color', color)
        .colorpicker()
        .on('changeColor.colorpicker', function(e) {
          var color = e.color.toHex();
          this.style.color = color;
          var id = this.id.split('-')[1];
          wb.info.users[id].color = color;
        })
      ;

    }

  }

  function onDataLoaded() {
    $('#progressbar').hide();
  }

  function onDataUpdated() {
    var datatype = [].slice.call(arguments, 1)
    // if annotations are updated, we do not need to update other views
    // only update views when entities or relationships are updated
    if (datatype.indexOf('annotations') < 0) {
      updateDataBut(['.dataentry']);
      updateViewsBut(['.dataentry']);
    } else { // update annotation table
      var viz = $('.viz.annotation').data('instance');
      if (viz) viz.updateData().updateView();
    }
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

  function onEntitiesRestored() {
    var entities = [].slice.call(arguments, 1);
    wb.store.restoreItems(entities, 'entities');
  }

  function onEntityAttrUpdated(ent, attr) {

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

  function onRelationshipsRestored() {
    var rels = [].slice.call(arguments, 1);
    wb.store.restoreItems(rels, 'relationships');
  }


  function onAnnotationsCreated() {
    var anns = [].slice.call(arguments, 1);
    wb.store.addItems(anns, 'annotations');
    //
    // render annotation--add annotation to annotator
    $('.viz.dataentry').not('.history').each(function() {
      var viz = $(this).data('instance');
      if (viz) viz.addAnnotations(anns);
    });
  }

  function onAnnotationsUpdated() {
    var anns = [].slice.call(arguments, 1);
    for (var i = 0, len = anns.length; i < len; i++) {
      var r = anns[i];
      if (r.deleted) wb.store.removeItems(r, 'annotations');
      else wb.store.addItems(r, 'annotations');
    }
    // render annotation--update annotation in dataentry table
    $('.viz.dataentry').not('.history').each(function() {
      var viz = $(this).data('instance');
      if (viz) viz.updateAnnotations(anns);
    });
  }

  function onAnnotationsDeleted() {
    var anns = [].slice.call(arguments, 1);
    wb.store.removeItems(anns, 'annotations');
    // render annotation--update annotation in dataentry table
    $('.viz.dataentry').not('.history').each(function() {
      var viz = $(this).data('instance');
      if (viz) viz.deleteAnnotations(anns);
    });
  }

  function onAnnotationsRestored() {
    var anns = [].slice.call(arguments, 1);
    wb.store.restoreItems(anns, 'annotations');
    // render annotation--update annotation in dataentry table
    $('.viz.dataentry').not('.history').each(function() {
      var viz = $(this).data('instance');
      if (viz) viz.addAnnotations(anns);
    });
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
    if (msg.sender !== wb.info.user) {
      wb.utility.notify(wb.info.users[msg.sender].name + ' sent a message');
      var num = $('#message-btn .unread').text();
      if (!num) num = 1;
      else num = +num + 1;
      $('#message-btn .unread').text(num);
    }
    $('.viz.message').each(function(i, viz) {
      var $viz = $(viz).data('instance');
      $viz.loadMessage(msg);
      var ele = $('ul.messages', viz);
      wb.utility.scrollTo($('span.messagebody:last', ele), ele);
      if (msg.sender !== wb.info.user) $(viz).parent().addClass('highlighted');
    });
  }

  function onNewAction(e, act) {
    $('.viz.history').each(function(i, viz) {
      var $viz = $(viz).data('instance');
      $viz.add(act);
      var ele = $('ul.history-list', viz);
      wb.utility.scrollTo($('li.history-item:last', ele), ele);
    });
  }
})();
