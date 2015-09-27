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
            <li><a class="prev" href="#">Previous</a></li> \
            <li><a class="next" href="#">Next</a></li> \
          </ul> \
        </nav> \
        <ul class="messages"></ul> \
      </div> \
      <form class="inputMessage"> \
        <div id="message_content" contentEditable=true data-placeholder="Type here..."></div> \
        <input type="submit" style="display: none;"> \
      </form> \
    ';

    this.element.append(message_html);

    this.loadMessages(0);

    this._initialize();
  },

  _initialize: function() {
    var _this = this;
    // initialize events listeners for components
    this.element.find('#message_content').keydown(function(e) {
      if (e.which == 13) { // press enter
        var content = $(this).text();
        $(this).text('');
        _this.element.parent().removeClass('highlighted');

        $.post(GLOBAL_URL.message, {
          content: content,
          case: CASE,
          group: GROUP
        }, function(res) {
          if (res === 'success') {
          }
        });
      }
    });
    var _this = this;
    $('.pager>li>a', this.element).click(function(e) {
      var page = $(this).data('page');
      _this.loadMessages(+page);
    });
    this.element.parent().click(function() {
      $(this).removeClass('highlighted');
      $('#message-btn .unread').text('');
    })
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
      .text(msg.content);

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

  },

  update: function() {
  },

  help: function() {
    var hint = new EnjoyHint({});
    hint.set(wb.help.message);
    hint.run();
  }
});
