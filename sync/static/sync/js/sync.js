$(function() {
  var user_tool = {}; // track the current tool users are using

  if (! ("ishout" in window)) {
    wb.utility.notify('Collaboration features unavailable at the moment');
    return;
  }

  ishout.init();
  var room = CASE + '-' + GROUP;
  ishout.joinRoom(room, function(d) {
    // inform the server that it has joined the room
    // the server will broadcast and update the list of online users
    $.post('/sync/join', {
      'case': CASE,
      'group': GROUP,
    });
  })

  ishout.on('message', onNewMessage);

  ishout.on('usersonline', onUsersOnline);

  ishout.on('entity.create', onEntityCreated);
  ishout.on('entity.update', onEntityUpdated);
  ishout.on('entity.delete', onEntityDeleted);
  ishout.on('entity.restore', onEntityRestored);

  ishout.on('relationship.create', onRelationshipCreated);
  ishout.on('relationship.update', onRelationshipUpdated);
  ishout.on('relationship.delete', onRelationshipDeleted);
  ishout.on('relationship.restore', onRelationshipRestored);

  ishout.on('annotation.create', onAnnotationCreated);
  ishout.on('annotation.update', onAnnotationUpdated);
  ishout.on('annotation.delete', onAnnotationDeleted);

  ishout.on('action', onNewAction);

  ishout.on('user.tool', onUserTool);


  // show where collaborators are working on
  function onUserTool(d) {
    if (d) {
      var user = wb.info.users[d.user];
      var tool = d.tool;
      if (user && tool) {
        user_tool[user.id] = tool;
      }
    }
    $('.user-monitor').empty();
    $('.user-icon').remove();
    for (u in user_tool) {
      if (wb.info.user == u) continue; // skip the current user
      var t = user_tool[u];
      u = wb.info.users[u];

      // show indicator in page header
      if (t.indexOf('table') > -1) {
        var el = $('#table-dropdown, #' + t.replace(' ', '_') + '-btn');
      } else if (t === 'document') {
        var el = $('#dataentry-btn');
      } 
      else {
        var el = $('#' + t + '-btn');
      }
      if (el) {
        $('<span class="user-thumb">.</span>').appendTo(el.parent().find('.user-monitor'))
          .css('color', '#ff7f0e');
      }
      // show indicator in view title bar
      $('.viz').each(function(i, v) {
        if ($(v).data('instance').options.tool === t) {
          $('<span class="badge user-icon"></span>').appendTo($(v).parent().find('.ui-dialog-title'))
            .text(u.name[0])
            .css('color', u.color);
        }
      });
    }
  }


  function onUsersOnline(data) {
    var users = data.users;
    var online_users = data.online_users;
    for (var i = 0, len = users.length; i < len; i++) {
      var user = users[i];
      // if already exists, do nothing
      if (user.id in wb.info.users) continue;
      // else add to wb.info.users
      // 
      // remove user color, as it confuses with entity color
      // assign a random color to user
      // user.color = wb.utility.randomColor(user.name);
      user.color = '#ff7f0e';
      wb.info.users[user.id] = user;
    }
    // update the color of the user name in nav bar
    var mycolor = wb.info.users[wb.info.user].color;
    $('.nav #username').css('color', mycolor);

    $.publish('user/online', online_users);

    // remove user thumb in tool if the user is no longer online
    var toupdate = false;
    for (u in user_tool) {
      if (online_users.indexOf(u) < 0) {
        delete user_tool[u];
        toupdate = true;
      }
    }
    if (toupdate) onUserTool(); // update collaborator workspace
  }

  function onNewMessage(data) {
    $.publish('message/new', data);
  }

  function onEntityCreated(data) {

  }

  function onEntityUpdated(data) {
    if (data.user === wb.info.user) return;

    var entity;
    if (!$.isEmptyObject(data.entity)) {
      $.publish('entity/updated', data.entity);
      if (data.entity.constructor === Array)
        entity = data.entity[0];
      else
        entity = data.entity;
    }
    if (!$.isEmptyObject(data.relationship))
      $.publish('relationship/updated', data.relationship);

    wb.utility.notify(wb.info.users[data.user].name
                      + ' updated ' + wb.utility.toString(entity, 'entity'));
  }

  function onEntityDeleted(data) {
    if (data.user === wb.info.user) return;

    $.publish('entity/deleted', data.entity);
    if (!$.isEmptyObject(data.relationship)) $.publish('relationship/deleted', data.relationship);
    if (!$.isEmptyObject(data.annotation)) $.publish('annotation/deleted', data.annotation);
    wb.utility.notify(wb.info.users[data.user].name
                      + ' deleted ' + wb.utiltiy.toString(entity, 'entity'));
  }

  function onEntityRestored(data) {
    if (data.user === wb.info.user) return;

    $.publish('entity/restored', data.entity);
    if (!$.isEmptyObject(data.relationship)) $.publish('relationship/restored', data.relationship);
    if (!$.isEmptyObject(data.annotation)) $.publish('annotation/restored', data.annotation);
    wb.utility.notify(wb.info.users[data.user].name
                      + ' restored ' + wb.utiltiy.toString(entity, 'entity'));
  }

  function onRelationshipCreated(data) {
    if (data.user === wb.info.user) return;
    if (!$.isEmptyObject(data.relationship)) {
      $.publish('relationship/created', data.relationship);
      wb.utility.notify(wb.info.users[data.user].name
                      + ' created relationship ' + wb.utiltiy.toString(data.relationship, 'relationship'));
    }
    if (!$.isEmptyObject(data.entity)) {
      $.publish('entity/updated', data.entity);
    }
  }

  function onRelationshipUpdated(data) {
    if (data.user === wb.info.user) return;
    if (!$.isEmptyObject(data.relationship)) {
      $.publish('relationship/updated', data.relationship);
      wb.utility.notify(wb.info.users[data.user].name
                      + ' updated relationship ' + wb.utility.toString(data.relationship, 'relationship'));
    }
    if (!$.isEmptyObject(data.entity)) {
      $.publish('entity/updated', data.entity);
    }
  }

  function onRelationshipDeleted(data) {
    if (data.user === wb.info.user) return;
    $.publish('relationship/deleted', data.relationship);
    // if data includes entity, it means that entity has been updated due to the deletion of the relationship
    if (!$.isEmptyObject(data.entity)) $.publish('entity/updated', data.entity);
    if (!$.isEmptyObject(data.annotation)) $.publish('annotation/deleted', data.annotation);

    wb.utility.notify(wb.info.users[data.user].name
                      + ' deleted relationship ' + wb.utility.toString(data.relationship, 'relationship'));
  }

  function onRelationshipRestored(data) {
    if (data.user === wb.info.user) return;
    $.publish('relationship/restored', data.relationship);
    // if data includes entity, it means that entity has been updated due to the deletion of the relationship
    if (!$.isEmptyObject(data.entity)) $.publish('entity/updated', data.entity);
    if (!$.isEmptyObject(data.annotation)) $.publish('annotation/restored', data.annotation);

    wb.utility.notify(wb.info.users[data.user].name
                      + ' restored relationship ' + wb.utility.toString(data.relationship, 'relationship'));
  }

  function onAnnotationCreated(data) {
    if (data.user === wb.info.user) return;
    var annotation = data.annotation || data.annotations;
    var entity = data.entity || data.entities;
    var relationship = data.relationship || data.relationships;

    $.publish('annotation/created', annotation);
    if (!$.isEmptyObject(entity)) {
      wb.utility.notify(wb.info.users[data.user].name
                        + entity[0].meta.id in wb.store.items.entities ? 'updated' : 'created' 
                        + wb.utility.toString(entity[0], 'entity'));
      $.publish('entity/created', entity);
    }
    if (!$.isEmptyObject(relationship)) {
      wb.utility.notify(wb.info.users[data.user].name
                        + relationship[0].meta.id in wb.store.items.relationships ? 'updated' : 'created' 
                        + wb.utility.toString(relationship[0], 'relationship'));
      $.publish('relationship/created', relationship);
    }
  }

  function onAnnotationUpdated(data) {
    if (data.user === wb.info.user) return;
    var annotation = data.annotation || data.annotations;
    var entity = data.entity || data.entities;
    var relationship = data.relationship || data.relationships;

    $.publish('annotation/updated', annotation);
    if (!$.isEmptyObject(entity)) {
      $.publish('entity/updated', entity);
      wb.utility.notify(wb.info.users[data.user].name
                      + ' updated ' + wb.utility.toString(entity[0], 'entity'));
    }
    if (!$.isEmptyObject(relationship)) {
      $.publish('relationship/updated', relationship);
      wb.utility.notify(wb.info.users[data.user].name
                      + ' updated relationship ' + wb.utility.toString(relationship[0], 'relationship'));
    }
  }

  function onAnnotationDeleted(data) {
    if (data.user === wb.info.user) return;
    var annotation = data.annotation || data.annotations;
    var entity = data.entity || data.entities;
    var relationship = data.relationship || data.relationships;

    $.publish('annotation/deleted', annotation);
    if (!$.isEmptyObject(entity))
      $.publish('entity/deleted', entity);
    if (!$.isEmptyObject(relationship))
      $.publish('relationship/deleted', relationship);

    var length = annotation.length || 1;
    var quote = annotation.quote || annotation[0].quote;
    wb.utility.notify(wb.info.users[data.user].name
                      + ' deleted annotation on '
                      + quote
                    );
  }


  function onNewAction(data) {
    $.publish('action/new', data);
  }
});
