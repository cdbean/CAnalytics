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

  _addFormattedEntityName(entity, container) {
    if (entity.constructor !== Object) {
      entity = wb.store.items.entities[entity];
    }
    if (!entity) return;

    $('<a class="wb-item">').appendTo(container)
      .text(entity.primary.name)
      .addClass('wb-entity')
      .addClass(entity.primary.entity_type)
      .data('entity', {id: entity.meta.id});
  },

  _addFormattedRelationshipName(rel, container) {
    if (rel.constructor !== Object) {
      rel = wb.store.items.relationships[rel];
    }
    if (!rel) return;
    var source = wb.store.items.entities[rel.primary.source];
    var target = wb.store.items.entities[rel.primary.target];

    $('<a class="wb-item">').appendTo(container)
      .text(rel.primary.relation)
      .addClass('wb-relationship')
      .data('relationship', {id: rel.meta.id});
    container.append('<span class="separator"> from </span>');
    this._addFormattedEntityName(source, container);
    container.append('<span class="separator"> to </span>');
    this._addFormattedEntityName(target, container);
  },

  _addFormattedHypothesis(hypo, container) {
    if (hypo.constructor !== Object) {
      var i = wb.utility.indexOf({id: hypo}, wb.hypothesis.items);
      hypo = wb.hypothesis.items[i];
    }
    if (!hypo) return;

    $('<i style="cursor: pointer;">').appendTo(container)
      .text(hypo.message)
      .data('hypothesis', hypo)
      .click(function(d) {
        $('#hDrawer').drawer('show');
        var hypo = $(this).data('hypothesis');
        $('.hypothesis').each(function(i, el) {
          if (el.__data__.id === hypo.id) {
            wb.utility.scrollTo($(el), $('.hypotheses'));
            // blink
            window.blinkInterval = setInterval(function() {
              $(el).toggleClass('highlight');
            }, 300);
            setTimeout(function() {
              if (window.blinkInterval) {
                clearInterval(window.blinkInterval);
                window.blinkInterval = false;
              }
              $(el).removeClass('highlight');
            }, 2000);
            return false;
          }
        });
        wb.log.log({
          operation: 'read',
          item: 'hypothesis',
          tool: 'history',
          data: hypo.id.toString(),
          public: false
        });
      });
  },

  add: function(item) {
    // item structure:
    // {'user': user_id, 'operation': '', 'time': '', 'data': ''}
    var lastrow = $('ul.history-list li.history-item:last', this.element);
    var rowStr = '\
      <li class="history-item"> \
        <span class="username"></span> \
        <span class="timestamp"></span> \
        <span class="content"> \
          <span class="actTool"></span> \
          <i class="actOperation"></i> \
          <span class="actItem"></span> \
          <span class="itemNames"></span> \
        </span> \
      </li> \
    ';
    var user = wb.info.users[item.user];
    var $row = $(rowStr).appendTo(this.element.find('ul.history-list'))
      .find('.username').text(user.name).css('color', user.color).end()
      .find('.timestamp').text(this._timeformat(this._servertimeformat.parse(item.time))).end()
      .find('.actOperation').text(item.operation).end()
      .find('.actItem').text(item.item).end();
    if (item.tool) {
      $row.find('.actTool').text('in ' + item.tool);
    }

    var _this = this;
    if (item.data) {
      item.data = item.data.split(',');
      if (item.item === 'entity') {
        item.data.forEach(function(d) {
          _this._addFormattedEntityName(d, $row.find('.itemNames'))
        });
      } else if (item.item === 'relationship') {
        item.data.forEach(function(d) {
          _this._addFormattedRelationshipName(d, $row.find('.itemNames'))
        });
      } else if (item.item === 'hypothesis') {
        if (item.operation === 'clone') {
          var hypo = item.data;
          if (hypo.constructor !== Object) {
            var i = wb.utility.indexOf({id: hypo}, wb.hypothesis.items);
            hypo = wb.hypothesis.items[i];
          }
          $('<span class="username">').insertBefore($row.find('.actItem'))
            .text(' ' + wb.info.users[hypo.created_by].name + '\'s')
            .css('color', wb.info.users[hypo.created_by].color);
        }
        item.data.forEach(function(d) {
          _this._addFormattedHypothesis(d, $row.find('.itemNames'))
        });
      }
    }

    // hide user and time tag when it's the same user and within 60s
    if (lastrow.find('.username').text() === $row.find('.username').text()) {
      var lasttime = this._timeformat.parse(lastrow.find('.timestamp').text());
      var thistime = this._timeformat.parse($row.find('.timestamp').text());
      if (Math.floor((thistime - lasttime) / 1000) < 60) {
        $row.find('.username').hide();
        $row.find('.timestamp').hide();
      }
    }

    if (item.user !== wb.info.user) {
      $row.css('background-color', '#eee')
    }

    $row.data('context', item)
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
