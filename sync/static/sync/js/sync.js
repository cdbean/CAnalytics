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

  ishout.on('relationship.create', onRelationshipCreated);
  ishout.on('relationship.update', onRelationshipUpdated);
  ishout.on('relationship.delete', onRelationshipDeleted);

  ishout.on('annotation.create', onAnnotationCreated);
  ishout.on('annotation.update', onAnnotationUpdated);
  ishout.on('annotation.delete', onAnnotationDeleted);

  ishout.on('action', onNewAction);

  ishout.on('user.tool', onUserTool);


  function onUserTool(d) {
    var user = wb.info.users[d.user];
    var tool = d.tool;
    if (user && tool) {
      $('.user-monitor').empty();
      $('.user-icon').remove();
      user_tool[user.id] = tool;
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
            .css('color', u.color);
        }
        // show indicator in view title bar
        $('.viz').each(function(i, v) {
          if ($(v).data('instance').options.tool === t) {
            $('<span class="badge user-icon"></span>').appendTo($(v).parent().find('.ui-dialog-title'))
              .text(u.name[0])
              .css('color', u.color);
          }
        })
      }
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
      user.color = 'black';
      wb.info.users[user.id] = user;
    }
    // update the color of the user name in nav bar
    var mycolor = wb.info.users[wb.info.user].color;
    $('.nav #username').css('color', mycolor);

    $.publish('user/online', online_users);

    // remove user thumb in tool if the user is no longer online
    for (u in user_tool) {
      if (online_users.indexOf(u) < 0) delete user_tool[u];
    }
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
                      + ' updated  '
                      + entity.primary.entity_type
                      + ' '
                      + entity.primary.name);
  }

  function onEntityDeleted(data) {
    if (data.user === wb.info.user) return;

    $.publish('entity/deleted', data.entity);
    if (!$.isEmptyObject(data.relationship)) $.publish('relationship/deleted', data.relationship);
    if (!$.isEmptyObject(data.annotation)) $.publish('annotation/deleted', data.annotation);
    wb.utility.notify(wb.info.users[data.user].name
                      + ' deleted  '
                      + data.entity.primary.entity_type
                      + ' '
                      + data.entity.primary.name);
  }

  function onRelationshipCreated(data) {
    if (data.user === wb.info.user) return;
    if (!$.isEmptyObject(data.relationship)) {
      $.publish('relationship/created', data.relationship);
      wb.utility.notify(wb.info.users[data.user].name
                      + ' created relationship '
                      + data.relationship.primary.relation
                      + ' between '
                      + wb.store.items.entities[data.relationship.primary.source].primary.name
                      + ' and '
                      + wb.store.items.entities[data.relationship.primary.target].primary.name);
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
                      + ' updated relationship '
                      + data.relationship.primary.relation
                      + ' between '
                      + wb.store.items.entities[data.relationship.primary.source].primary.name
                      + ' and '
                      + wb.store.items.entities[data.relationship.primary.target].primary.name);
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
                      + ' deleted relationship '
                      + data.relationship.primary.relation
                      + ' between '
                      + wb.store.items.entities[data.relationship.primary.source].primary.name
                      + ' and '
                      + wb.store.items.entities[data.relationship.primary.target].primary.name);
  }

  function onAnnotationCreated(data) {
    if (data.user === wb.info.user) return;
    var annotation = data.annotation || data.annotations;
    var entity = data.entity || data.entities;
    var relationship = data.relationship || data.relationships;

    $.publish('annotation/created', annotation);
    if (!$.isEmptyObject(entity))
      $.publish('entity/created', entity);
    if (!$.isEmptyObject(relationship))
      $.publish('relationship/created', relationship);

    var length = annotation.length || 1;
    var quote = annotation.quote || annotation[0].quote;
    wb.utility.notify(wb.info.users[data.user].name
                      + ' created ' + length + ' annotation on '
                      + quote);
  }

  function onAnnotationUpdated(data) {
    if (data.user === wb.info.user) return;
    var annotation = data.annotation || data.annotations;
    var entity = data.entity || data.entities;
    var relationship = data.relationship || data.relationships;

    $.publish('annotation/updated', annotation);
    if (!$.isEmptyObject(entity))
      $.publish('entity/updated', entity);
    if (!$.isEmptyObject(relationship))
      $.publish('relationship/updated', relationship);

    var length = annotation.length || 1;
    var quote = annotation.quote || annotation[0].quote;
    wb.utility.notify(wb.info.users[data.user].name
                      + ' updated ' + length + ' annotation on '
                      + quote
                    );
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
                      + ' deleted ' + length + ' annotation on '
                      + quote
                    );
  }


  function onNewAction(data) {
    $.publish('action/new', data);
  }
});
