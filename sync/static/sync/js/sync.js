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

}

function onNewMessage(data) {
  $.publish('message/new', data);
}

function onEntityCreated(data) {

}

function onEntityUpdated(data) {

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
  $.publish('annotation/created', data.annotation);
  if (data.entities)
    $.publish('entity/created', data.entities);
  if (data.relationships)
    $.publish('relationships/created', data.relationships);
}

function onAnnotationUpdated(data) {

}

function onAnnotationDeleted(data) {

}


function onNewAction(data) {

}
