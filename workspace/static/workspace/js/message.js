$.widget('viz.vizmessage', $.viz.vizbase, {
  options: {

  },

  _create: function() {
    this._super('_create');
    this.element.addClass('message');
    this.options.extend.help = this.help;
    this._timeformat = d3.time.format('%b %d %Y, %H:%M:%S');
    this._servertimeformat = d3.time.format('%m/%d/%Y-%H:%M:%S');

    var message_html = ' \
      <div class="messageArea"> \
        <nav> \
          <ul class="pager"> \
            <li><a class="prev" href="#">Older</a></li> \
            <li><a class="next" href="#">Later</a></li> \
          </ul> \
        </nav> \
        <ul class="messages"></ul> \
      </div> \
      <form class="inputMessage"> \
        <div class="input-group"> \
          <div id="message_content" class="form-control" contentEditable=true data-placeholder="Hit [Ctrl+Enter] to send message.."></div> \
          <span class="input-group-btn"> \
            <button type="button" class="btn btn-primary" id="send-btn">Send</input> \
          </span> \
        </div> \
      </form> \
    ';

    this.element.append(message_html);

    this.loadMessages(0);

    this._initialize();
  },

  _initialize: function() {
    var _this = this;
    // initialize events listeners for components
    var input = this.element.find('#message_content').keydown(function(e) {
      if (e.which == 13 && e.ctrlKey) { // press enter
        this.sendMessage();
      }
    }.bind(this));
    this.element.find('#send-btn').click(this.sendMessage.bind(this));

    $('.pager>li>a', this.element).click(function(e) {
      var page = $(this).data('page');
      _this.loadMessages(+page);
    });
    this.element.parent().click(function() {
      $(this).removeClass('highlighted');
      $('#message-btn .unread').text('');
    });

    var sources = d3.values(wb.store.items.entities).filter(function(d) {
      return !d.meta.deleted;
    }).map(function(d) {
      return {'name': d.primary.name, 'id': d.meta.id, 'entity_type': d.primary.entity_type};
    });
    var s1 = d3.values(wb.store.items.relationships).filter(function(d) {
      return !d.meta.deleted;
    }).map(function(d) {
      return {'name': d.primary.relation, 'id': d.meta.id, 'entity_type': 'relationship'};
    });
    sources = sources.concat(s1);
    this.element.find('#message_content').acautocomplete(sources, {
      matchContains: true,
      scroll: true,
      hotkeymode:true,
      noresultsmsg: 'No matches',
      jsonterm: 'name',
      formatResult: function(row) {
        var item, item_type;
        if (row['entity_type'] === 'relationship') {
          var classname = 'wb-relationship';
          var data = 'data-relationship=' + row['id'];
          item = wb.store.items.relationships[row['id']];
          item_type = 'relationship';
        } else {
          var classname = 'wb-entity ' + row['entity_type'];
          var data = 'data-entity=' + row['id'];
          item = wb.store.items.entities[row['id']];
          item_type = item.primary.entity_type;
        }
        wb.log.log({
          operation: 'referred',
          item: item_type,
          tool: 'message',
          data: wb.log.logItem(item),
          public: false
        });
        return '<a contenteditable="false" class="wb-item ' + classname + '" '
        + data + ' href="#" tabindex="-1">' + row['name'] + '</a> ';
      }
    });
    this.element.find('#message_content').droppable({
      drop: function(e, ui) {
        $(this).html(ui.draggable.text());
      }
    });
  },

  sendMessage: function() {
    this.element.parent().removeClass('highlighted');
    var el = this.element.find('#message_content');
    var msg = el.html();
    el.html('');
    $.post(GLOBAL_URL.message, {
      content: msg,
      case: CASE,
      group: GROUP
    }, function(res) {
      if (res === 'success') {
      }
    });
  },

  loadMessages: function(page) {
    var _this = this;
     $('ul.messages', this.element).empty();

    $.get(GLOBAL_URL.messages, {
      'case': CASE,
      group: GROUP,
      page: page
    }, function(data) {
      for (var i = 0, len = data.items.length; i < len; i++) {
        _this.loadMessage(data.items[i]);
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
      var ele = _this.element.find('ul.messages');
      wb.utility.scrollTo($('span.messagebody:last', ele), ele)
    });
  },

  loadMessage: function(msg) {
    // receive new messages
    // msg structure:
    // { 'sender': user_id, 'content': '', time: 'timestamp'}
    // self: whether the message is sent by the current user

    var lastrow = $('ul.messages li.message:last', this.element);
    var row = $('<li class="message"></li>').appendTo(this.element.find('ul.messages'));

    var user = wb.info.users[msg.sender];
    var usertag = $('<span class="username"></span>').appendTo(row)
      .text(user.name)
      .css('color', user.color);
    var timetag = $('<span class="timestamp"></span>').appendTo(row)
      .text(this._timeformat(this._servertimeformat.parse(msg.sent_at)));
    $('<span class="messagebody"></span>').appendTo(row)
      .html(msg.content);

    // do not add the user and time tag if the same user posted within 60s
    if (lastrow.find('.username').text() === usertag.text()) {
      var lasttime = this._timeformat.parse(lastrow.find('.timestamp').text());
      var thistime = this._timeformat.parse(row.find('.timestamp').text());
      if (Math.floor((thistime - lasttime) / 1000) < 60) {
        usertag.addClass('hidden');
        timetag.addClass('hidden');
      }
    }

    if (msg.sender !== wb.info.user) {
      row.css('background-color', '#eee');
    }
  },

  reload: function() {

  },

  updateView: function() {

  },

  updateData: function() {
    var sources = d3.values(wb.store.items.entities).filter(function(d) {
      return !d.meta.deleted;
    }).map(function(d) {
      return {'name': d.primary.name, 'id': d.meta.id, 'entity_type': d.primary.entity_type};
    });
    var s1 = d3.values(wb.store.items.relationships).filter(function(d) {
      return !d.meta.deleted;
    }).map(function(d) {
      return {'name': d.primary.relation, 'id': d.meta.id, 'entity_type': 'relationship'};
    });
    sources = sources.concat(s1);
    this.element.find('#message_content').setOptions({data: sources});
  },

  update: function() {
  },

  help: function() {
    var hint = new EnjoyHint({});
    hint.set(wb.help.message);
    hint.run();
  }
});
