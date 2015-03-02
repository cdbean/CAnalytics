(function() {
  if (wb.info.user) {
    ishout.init(function() {

    });

    // join room
    // TODO: avoid hard code group name
    var room = wb.info.case + '-' + wb.info.group;
    room = room.replace(/\s/g, '');
    ishout.joinRoom(room, function(data) {
      // after joining room, server will return a list of users in the room:
      // {users: [user_id]}
      onUsersOnline(data.users);
      $.post('/sync/join', {
        'case': wb.info.case,
        'group': wb.info.group,
      });
    });
  }


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
    $.publish('user/online', data);
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

  }

  function onRelationshipCreated(data) {

  }

  function onRelationshipUpdated(data) {

  }

  function onRelationshipDeleted(data) {

  }

  function onAnnotationCreated(data) {
    if (data.user === wb.info.user) return;

    $.publish('annotation/created', data.annotation);
    if (data.entity)
      $.publish('entity/created', data.entity);
    if (data.relationship)
      $.publish('relationship/created', data.relationship);

    wb.utility.notify(wb.info.users[data.user].name
                      + ' created annotation on '
                      + data.annotation.quote);
  }

  function onAnnotationUpdated(data) {
    if (data.user === wb.info.user) return;

    $.publish('annotation/updated', data.annotation);
    if (data.entity)
      $.publish('entity/updated', data.entity);
    if (data.relationship)
      $.publish('relationship/updated', data.relationship);

    wb.utility.notify(wb.info.users[data.user].name
                      + ' update annotation on '
                      + data.annotation.quote
                    );
  }

  function onAnnotationDeleted(data) {
    if (data.user === wb.info.user) return;

    $.publish('annotation/deleted', data.annotation);
    if (data.entity)
      $.publish('entity/deleted', data.entity);
    if (data.relationship)
      $.publish('relationship/deleted', data.relationship);

    wb.utility.notify(wb.info.users[data.user].name
                      + ' delete annotation on '
                      + data.annotation.quote
                    );
  }


  function onNewAction(data) {
    $.publish('action/new', data);
  }
})();
