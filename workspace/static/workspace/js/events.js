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
          ishout.socket.emit('view.request', user, {watching: USER, watched: user});
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
        // .css('color', color)
        .mouseover(function() {
          if ($(this).hasClass('watching')) {
            $(this).text('Stop watching ' + name);
          } else {
            $(this).text('Watch ' + name);
          }
        })
        .mouseout(function() {
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
            wb.utility.saveAllState();

            $(this).text('Watching ' + name);
            $.publish('view/request', id);
          } else {
            $(this).text(name);
            $.publish('view/stop', id);
          }
        });
    }
  }

  function onDataLoaded() {
    $('#progressbar').hide();

    // restore windows after data are loaded
    // so window info can be broadcast
    var state = $.cookie('windowState');
    if (state) {
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
            wb.utility.loadAllState();
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
