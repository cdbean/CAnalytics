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

  $.subscribe('viz/close', onVizClose);


  function onVizClose(vizName) {

  }

  function onRequestView(e, user) { // user: which user to watch
    if (window.ishout) {
      ishout.rooms.forEach(function(r) {
        if (ishout.socket)
          ishout.socket.emit('view.request', user, {watching: USER, watched: user});
      });
    }
    wb.log.log({
      operation: 'start watch',
      item: 'user',
      data: user.toString(),
      public: true
    });
  }

  // data = {
  //  state: the state of the view
  //  to: the user the stream is sent to
  //  from: the user the stream is from
  function onStreamView(e, users) {
    if (!window.streamViewInterval) {
      window.streamViewInterval = setInterval(streamView, 500);
    }

    function streamView() {
      var data = {};

      // check if the watching user is still online
      var watchingUsers = wb.info.watchingUsers;
      for (var i = 0, len = watchingUsers.length; i < len; i++) {
        if (wb.info.online_users.indexOf(watchingUsers[i].toString()) < 0) {
          watchingUsers.splice(i, 1);
        }
      }
      wb.info.watchingUsers = watchingUsers;

      data.watching = wb.info.watchingUsers;
      data.watched = USER;
      data.state = wb.state.getAllState();

      if (window.ishout) {
        ishout.rooms.forEach(function(r) {
          if (ishout.socket)
            ishout.socket.emit('view.stream', r.roomName, data);
        });
      }
    }
  }

  function onStopView(e, user) {
    if (window.ishout) {
      ishout.rooms.forEach(function(r) {
        if (ishout.socket)
          ishout.socket.emit('view.stop', user, {watching: USER, watched: user});
      });
    }
    wb.log.log({
      operation: 'stop watch',
      item: 'user',
      data: user.toString(),
      public: true
    });
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
        // .css('color', color)
        .mouseover(function() {
          var id = +$(this).attr('id').split('-')[1],
              name = wb.info.users[id].name;
          if ($(this).hasClass('watching')) {
            $(this).text('Stop watching ' + name);
          } else {
            $(this).text('Watch ' + name);
          }
        })
        .mouseout(function() {
          var id = +$(this).attr('id').split('-')[1],
              name = wb.info.users[id].name;
          if ($(this).hasClass('watching')) {
            $(this).text('Watching ' + name);
          } else {
            $(this).text(name);
          }
        })
        .click(function() {
          // request or stop watching
          $(this).toggleClass('watching');
          var id = +$(this).attr('id').split('-')[1],
              name = wb.info.users[id].name;
          if ($(this).hasClass('watching')) {
            // save current state first
            wb.state.SaveStateToCookie();
            $(this).text('Watching ' + name);
            $.publish('view/request', id);
          } else {
            // stop watching
            $(this).text(name);
            $.publish('view/stop', id);
            // ask user if they want to keep the view or switch to previous view
            var content = '<p>You stopped watching your teammate\'s view. Do you want to keep this view or switch back to your view before you started watching?</p>'
            $(content).dialog({
              title: 'Keep this view?',
              width: 'auto',
              buttons: {
                'keep this view': function() {
                  $(this).dialog("destroy");
                },
                'Switch to my view before': function() {
                  $(this).dialog("destroy");
                  wb.state.loadStateFromCookie();
                }
              }
            });
          }
        });
    }
  }

  function onDataLoaded() {
    $('#progressbar').hide();

    // restore windows after data are loaded
    // so window info can be broadcast
    var state = JSON.parse($.cookie('caState'));
    if (!$.isEmptyObject(state.windowState)) {
      var content = '\
        <div><p>Do you want to resume your analysis last time?</p> \
        <p> If Yes, you will reopen the windows, reapply the filter if any, start from the hypothesis you were on</p></div> \
      ';
      $(content).dialog({
        title: 'Reopen windows?',
        width: 'auto',
        buttons: {
          'No': function() {
            $(this).dialog("destroy");
          },
          'Yes': function() {
            $(this).dialog("destroy");
            wb.state.loadStateFromCookie();
          }
        }
      });
    }
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

    var except = [].slice.call(arguments, 1);
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

  // except is tool name
  function updateViewsBut(except) {
    except = except || [];
    if (except.constructor !== Array)
      except = [except];

    except= except.map(function(d) { return '.' + d.replace(' ', '.'); });

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
