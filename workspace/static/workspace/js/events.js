(function() {
  // after all data loaded
  $.subscribe('data/loaded', onDataLoaded);


  // after data is updated, e.g. new annotation, entity, rel
  $.subscribe('data/updated', onDataUpdated);

  // after filtering
  $.subscribe('data/filter', onDataFiltered);

  $.subscribe('message/new', onNewMessage);
  $.subscribe('action/new', onNewAction);

  $.subscribe('user/online', onUserOnline);

  // when user changes tool
  $.subscribe('user/tool', onUserTool);

  // when user request watch other's view
  $.subscribe('view/request', onRequestView);
  // when under watch, stream view to server
  $.subscribe('view/stream', onStreamView);
  // stop watching other's view
  $.subscribe('view/stop', onStopView);



  function onRequestView(e, user) { // user: which user to watch
    if (window.ishout) {
      ishout.rooms.forEach(function(r) {
        if (ishout.socket)
          ishout.socket.emit('view.request', user, {from: USER, to: user});
      });
    }
  }

  // data = {
  //  state: the state of the view
  //  to: the user the stream is sent to
  //  from: the user the stream is from
  function onStreamView(e, data) {
    if (window.ishout) {
      ishout.rooms.forEach(function(r) {
        if (ishout.socket)
          ishout.socket.emit('view.stream', r.roomName, data);
      });
    }
  }

  function onStopView(e, user) {
    if (window.ishout) {
      ishout.rooms.forEach(function(r) {
        if (ishout.socket)
          ishout.socket.emit('view.stop', user, {from: USER, to: user});
      });
    }
  }

  function onUserTool(e, d) {
    if (window.ishout) {
      ishout.rooms.forEach(function(r) {
        if (ishout.socket)
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

    // restore windows after data are loaded
    // so window info can be broadcast
    var tools = JSON.parse($.cookie('tools'));
    if (!$.isEmptyObject(tools)) {
      var content = '<p>You had windows open when you left last time. Do you want to reopen them?</p>'
      $(content).dialog({
        title: 'Reopen windows?',
        width: 'auto',
        buttons: {
          'No': function() {
            $(this).dialog("destroy");
          },
          'Yes': function() {
            $(this).dialog("destroy");
            restoreViz(tools);
          }
        }
      });
    }
  }

  function restoreViz(tools) {
    var viz;
    tools.forEach(function(v) {
      var t = v.tool;
      if (t === 'document') {
        viz = $('<div>').vizdataentrytable({
          title: 'Documents',
          tool: 'document'
        });
      } else if (t === 'timeline') {
        viz = $('<div>').viztimeline({
          title: 'Timeline',
          tool: 'timeline'
        });
      } else if (t === 'map') {
        viz = $('<div>').vizmap({
          title: 'Map',
          tool: 'map'
        });
      } else if (t === 'network') {
        viz = $('<div>').viznetwork({
          title: 'Network',
          tool: 'network'
        });
      } else if (t === 'notepad') {
        viz = $('<div>').viznotepad({
          title: 'Notepad',
          tool: 'notepad',
          url: GLOBAL_URL.notepad,
        });
      } else if (t === 'message') {
        viz = $('<div>').vizmessage({
          title: 'Message',
          tool: 'message'
        });
      } else if (t === 'history') {
        viz = $('<div>').vizhistory({
          title: 'History',
          tool: 'history',
          url: GLOBAL_URL.history
        });
      } else if (t === 'annotation table') {
        viz = $('<div>').vizannotationtable({
          title: 'Annotations',
          tool: 'annotation table',
        });
      } else {
        viz = $('<div>').vizentitytable({
            title: t.split(' ')[0],
            entity: t.split(' ')[0],
            tool: t
        });
      }
      viz.dialog('option', {
        width: v.width,
        height: v.height,
        position: {
          at: v.position_at,
          my: v.position_my,
          of: window
        }
      });
      $(viz).data('instance').resize();
    });
  }

  function onDataUpdated() {
    $('.viz').each(function(i, el) {
      var viz = $(el).data('instance');
      if (viz) {
        viz.updateData()
        viz.updateView();
      }
    })
  }

  function onDataFiltered() {
    wb.store.setShelf();

    var except = [].slice.call(arguments, 1)
    updateViewsBut(except);
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
