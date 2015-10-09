$(function() {
  // join room
  // $.subscribe('users/loaded', function() {
  //   if (! ('ishout' in window)) return;

  //   var room = CASE + '-' + GROUP;
  //   room = room.replace(/\s/g, '');
  //   ishout.joinRoom(room, function(data) {
  //     // after joining room, server will return a list of users in the room:
  //     // {users: [user_id]}
  //     onUsersOnline(data.users);
  //     $.post('/sync/join', {
  //       'case': CASE,
  //       'group': GROUP,
  //     });
  //   });
  // });

  // // get all users in this group
  // $.get(GLOBAL_URL.users, {
  //   case: CASE,
  //   group: GROUP
  // }, function(users) {
  //   for (var i = 0, len = users.length; i < len; i++) {
  //     var user = users[i];
  //     user.color = wb.utility.randomColor(i);
  //     wb.info.users[user.id] = user;
  //   }
  //   // change the color of the user name in nav bar
  //   var mycolor = wb.info.users[wb.info.user].color;
  //   $('.nav #username').css('color', mycolor);
    
  //   // after users are loaded, join room and fetch users online
  //   $.publish('users/loaded');
  // });


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


  function onUsersOnline(data) {
    var users = data.users;
    var online_users = data.online_users;
    for (var i = 0, len = users.length; i < len; i++) {
      var user = users[i];
      // if already exists, do nothing
      if (user.id in wb.info.users) continue;
      // else add to wb.info.users
      user.color = wb.utility.randomColor(user.name);
      wb.info.users[user.id] = user;
    }
    // update the color of the user name in nav bar
    var mycolor = wb.info.users[wb.info.user].color;
    $('.nav #username').css('color', mycolor);
    $.publish('user/online', online_users);
  }

  function onNewMessage(data) {
    $.publish('message/new', data);
  }

  function onEntityCreated(data) {

  }

  function onEntityUpdated(data) {
    if (data.user === wb.info.user) return;

    var entity;
    if (data.entity) {
      $.publish('entity/updated', data.entity);
      if (data.entity.constructor === Array)
        entity = data.entity[0];
      else
        entity = data.entity;
    }
    if (data.relationship)
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
    wb.utility.notify(wb.info.users[data.user].name
                      + ' deleted  '
                      + data.entity.primary.entity_type
                      + ' '
                      + data.entity.primary.name);
  }

  function onRelationshipCreated(data) {
    if (data.user === wb.info.user) return;
    if (data.relationship) {
      $.publish('relationship/created', data.relationship);
      wb.utility.notify(wb.info.users[data.user].name
                      + ' created relationship '
                      + data.relationship.primary.relation
                      + ' between '
                      + wb.store.items.entities[data.relationship.primary.source].primary.name
                      + ' and '
                      + wb.store.items.entities[data.relationship.primary.target].primary.name);
    }
    if (data.entity) {
      $.publish('entity/updated', data.entity);
    }
  }

  function onRelationshipUpdated(data) {
    if (data.user === wb.info.user) return;
    if (data.relationship) {
      $.publish('relationship/updated', data.relationship);
      wb.utility.notify(wb.info.users[data.user].name
                      + ' updated relationship '
                      + data.relationship.primary.relation
                      + ' between '
                      + wb.store.items.entities[data.relationship.primary.source].primary.name
                      + ' and '
                      + wb.store.items.entities[data.relationship.primary.target].primary.name);
    }
    if (data.entity) {
      $.publish('entity/updated', data.entity);
    }
  }

  function onRelationshipDeleted(data) {
    if (data.user === wb.info.user) return;
    $.publish('relationship/deleted', data.relationship);
    // if data includes entity, it means that entity has been updated due to the deletion of the relationship
    if (data.entity) $.publish('entity/updated', data.entity);

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
    if (entity)
      $.publish('entity/created', entity);
    if (relationship)
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
    if (entity)
      $.publish('entity/updated', entity);
    if (relationship)
      $.publish('relationship/updated', relationship);

    var length = annotation.length || 1;
    var quote = annotation.quote || annotation[0].quote;
    wb.utility.notify(wb.info.users[data.user].name
                      + ' update ' + length + ' annotation on '
                      + quote
                    );
  }

  function onAnnotationDeleted(data) {
    if (data.user === wb.info.user) return;
    var annotation = data.annotation || data.annotations;
    var entity = data.entity || data.entities;
    var relationship = data.relationship || data.relationships;

    $.publish('annotation/deleted', annotation);
    if (entity)
      $.publish('entity/deleted', entity);
    if (relationship)
      $.publish('relationship/deleted', relationship);

    var length = annotation.length || 1;
    var quote = annotation.quote || annotation[0].quote;
    wb.utility.notify(wb.info.users[data.user].name
                      + ' delete ' + length + ' annotation on '
                      + quote
                    );
  }


  function onNewAction(data) {
    $.publish('action/new', data);
  }
});
