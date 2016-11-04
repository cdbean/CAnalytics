$.widget('viz.vizhistory', $.viz.vizbase, {
  options: {
    url: 'logs'
  },

  _create: function() {
    this._super('_create');
    this.element.addClass('history');
    this.options.extend.help = this.help;
    this._timeformat = d3.time.format('%b %d %Y, %H:%M:%S');
    this._servertimeformat = d3.time.format('%m/%d/%Y-%H:%M:%S');

    this._setupUI();
    this.loadData(0);
    return this;
  },

  _setupUI: function() {
    var html = '\
      <nav> \
        <ul class="pager"> \
          <li><a class="prev" href="#">Previous</a></li> \
          <li><a class="next" href="#">Next</a></li> \
        </ul> \
      </nav> \
      <ul class="history-list"></ul> \
    ';
    this.element.append(html);

    var _this = this;
    $('.pager>li>a', this.element).click(function(e) {
      var page = $(this).data('page');
      _this.loadData(+page);
    });
    // click on timestamp, jump to context
    this.element.on('click', 'li.history-item .timestamp', this.jumpToContext.bind(this));
  },

  loadData: function(page) {
    var _this = this;
    $('.history-list', this.element).empty();

    $.get(this.options.url, {
      'case': CASE,
      group: GROUP,
      page: page
    }, function(data) {
      for (var i = 0, len = data.items.length; i < len; i++) {
        _this.add(data.items[i]);
      }
      if (data.has_previous)
        $('.pager .prev', this.element).removeClass('hidden')
          .data('page', data.previous_page);
      else
        $('.pager .prev', this.element).addClass('hidden');

      if (data.has_next)
        $('.pager .next', this.element).removeClass('hidden')
          .data('page', data.next_page);
      else
        $('.pager .next', this.element).addClass('hidden');

      // scroll to bottom
      var ele = _this.element.find('.history-list');
      wb.utility.scrollTo($('li.history-item:last', ele), ele)
    });
    return this;
  },

  add: function(item) {
    // item structure:
    // {'user': user_id, 'operation': '', 'time': '', 'data': ''}
    var lastrow = $('ul.history-list li.history-item:last', this.element);
    var row = $('<li class="history-item">').appendTo(this.element.find('ul.history-list'));
    var user = wb.info.users[item.user];
    var usertag = $('<span class="username">').appendTo(row).text(user.name).css('color', user.color);
    var timetag = $('<span class="timestamp">').appendTo(row).text(this._timeformat(this._servertimeformat.parse(item.time)));

    var action = 'In ' + item.tool + '<i> ' + item.operation + ' </i>' + item.item;
    var entity;
    if (item.data) {
      var d = item.data;
      if (d.constructor === Array) {
        d = d[0]
      }
      if (d.name) {
        action += ' <a class="wb-item">' + d.name + '</span>';
      }
    }
    $('<span class="content">').appendTo(row).html(action);
    if (item.item === 'annotation' || item.item === 'annotations') {
      row.find('.wb-item').addClass('annotation').data('annotation', {id: item.data.id});
    } else if (item.item === 'relationship') {
      row.find('.wb-item').addClass('wb-relationship').data('relationship', {id: item.data.id});
    } else if (wb.store.static.entity_types.indexOf(item.item) > -1) {
      row.find('.wb-item').addClass('wb-entity').addClass(item.item).data('entity', {id: item.data.id});
    } else if (item.item === 'entities') {
      // multiple entities
      item.data.forEach(function(d) {
        var el = ' <a class="wb-item">' + d.name + '</span>';
        $(el).appendTo($('.content', row)).addClass('wb-entity').addClass(d.primary.entity_type).data('entity', {id: d.id});
      });
    }

    // hide user and time tag when it's the same user and within 60s
    if (lastrow.find('.username').text() === usertag.text()) {
      var lasttime = this._timeformat.parse(lastrow.find('.timestamp').text());
      var thistime = this._timeformat.parse(row.find('.timestamp').text());
      if (Math.floor((thistime - lasttime) / 1000) < 60) {
        usertag.addClass('hidden');
        timetag.addClass('hidden');
      }
    }

    if (item.user !== wb.info.user) {
      row.css('background-color', '#eee')
    }

    row.data('context', item)
    return this;
  },

  jumpToContext: function(e) {
    // highlight the selected action
    var row = $(e.target).parent();
    if (row.hasClass('active')) {
      row.removeClass('active');
      return;
    }
    row.parent().children('.history-item').removeClass('active');
    row.addClass('active');

    // open the tool in which the action is performed
    var data = row.data('context');
    if (data) {
      if (data.item) {
        // $('#' + data.tool + '-btn').click();
        var subtitle = ' - restored from '
          + data.time
          + ' by '
          + wb.info.users[data.user].name;
        viz_opt = data.tool.split('_');
        var viz_name = viz_opt[0];
        var viz_form = viz_opt[1];
        var viz;
        if (viz_form === 'table') {
            viz = $('<div>').vizentitytable({
                title: viz_name + subtitle,
                entity: viz_name,
            });
        } else if (viz_name === 'dataentry') {
            viz = $('<div>').vizannotationtable({
                title: 'Annotations' + subtitle,
            });
        } else if (viz_name === 'timeline') {
            viz = $('<div>').viztimeline({
                title: 'Timeline' + subtitle,
            });
        } else if (viz_name === 'map' || viz_name === 'location') {
            viz = $('<div>').vizmap({
                title: 'Map' + subtitle,
            });
        } else if (viz_name === 'network' || viz_name === 'relationship') {
            viz = $('<div>').viznetwork({
                title: 'Network' + subtitle,
            });
        } else if (viz_name === 'notepad') {
            viz = $('<div>').viznotepad({
                title: 'Notepad' + subtitle
            });
        } else if (viz_name === 'message') {
          viz = $('<div>').vizmessage({
            title: 'Message' + subtitle
          });
        } else if (/annotation/.test(viz_name)) {
          viz = $('<div>').vizdataentrytable({
              title: 'Data Entry' + subtitle,
          });
        } else if (wb.store.static.entity_types.indexOf(viz_name) > -1) {
          viz = $('<div>').vizentitytable({
              title: viz_name + subtitle,
          });
        }

        if (viz) {
            viz.addClass('historic');
            viz.parent().addClass('historic');
            if (data.data && data.data.id) {
              viz.data('instance').highlight(data.data.id)
            }
        }
      }
    }
    return this;

  },

  reload: function() {

  },

  updateData: function() {
    return this;
  },
  updateView: function() {
    return this;
  },

  update: function() {
    return this;
  },

  help: function() {
    var hint = new EnjoyHint({});
    hint.set(wb.help.history);
    hint.run();
    return this;
  }
});
