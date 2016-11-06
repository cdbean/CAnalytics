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
    // the server will broadcast and update the list of online users and all users in the group
    $.post('/sync/join', {
      'case': CASE,
      'group': GROUP,
    });
  })

  ishout.on('message', onNewMessage);

  ishout.on('usersonline', onUsersOnline);

  ishout.on('items', onItemsChange);

  ishout.on('action', onNewAction);

  ishout.on('user.tool', onUserTool);

  ishout.on('view.request', onViewRequested); // somebody requested to watch my view
  ishout.on('view.stream', onViewStreamed); // somebody streamed their view to me
  ishout.on('view.stop', onViewStopped); // somebody stopped watching my view
  ishout.on('view.share', onViewShared); // somebody shared a view


  function onViewShared(v) {
    var network = $('.network').data('instance');
    if (network) {
      network.loadView(v);
    }
    if (v.user != wb.info.user)
      wb.utility.notify(wb.info.users[v.user].name + ' shared a view');
  }

  function onViewRequested(d) {
    // start streaming views
    window.streamViewInterval = setInterval(streamView, 500);

    function streamView() {
      var data = {};

      data.watching = [d.watching];
      data.watched = d.watched;
      data.windowState = wb.utility.getWindowState();
      data.filter = wb.filter.filter;
      if($('.viz.network').length) {
        data.networkState = $('.viz.network').data('instance').getState();
      }

      ishout.rooms.forEach(function(r) {
        if (ishout.socket)
          ishout.socket.emit('view.stream', r.roomName, data);
      });
    }
  }

  function onViewStreamed(d) {
    // get views data; display them
    wb.utility.setAllState(d);
  }

  function onViewStopped(d) {
    // stop streaming views
    if (window.streamViewInterval) {
      clearInterval(window.streamViewInterval);
    }
  }


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
    $('span.user-icon').remove();
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
    // get all users in the group
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

    // broadcast the current focused tool when a new user joins
    var focus_tool = '';
    $('.viz').each(function(i, v) {
      var $v = $(v).data('instance');
      if ($v && $v.isFocus) {
        focus_tool = $v.options.tool;
        return false;
      }
    });
    if (focus_tool) $.publish('user/tool', focus_tool);

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

  function onItemsChange(data) {
    if (data.user === wb.info.user) return;

    var annotations = data.annotation || data.annotations;
    var entities = data.entity || data.entities;
    var relationships = data.relationship || data.relationships;

    wb.store.updateItems(annotations, 'annotations');
    wb.store.updateItems(entities, 'entities');
    wb.store.updateItems(relationships, 'relationships');

    var message = wb.info.users[data.user].name
      + ' ' + data.action + ' ' + data.item + ' ';

    switch(data.item) {
      case 'entity':
        message += wb.utility.toString(entities, 'entity');
        break;
      case 'relationship':
        message += wb.utility.toString(relationships, 'relationship');
        break;
      case 'annotation':
        if (annotations.constructor === Array) annotations = annotations[0];
        message += annotations.quote;
        break;
    }

    wb.utility.notify(message);

    $.publish('data/updated');
  }

  function onNewAction(data) {
    $.publish('action/new', data);
  }
});
