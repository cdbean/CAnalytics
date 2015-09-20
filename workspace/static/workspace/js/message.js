$.widget('viz.vizmessage', $.viz.vizbase, {
  options: {

  },

  _create: function() {
    this._super('_create');
    this.element.addClass('message');
    this.options.extend.help = this.help;

    // var message_html = ' \
    //   <div class="wrapper"> \
    //     <ul class="messages"> \
    //     </ul> \
    //     <div class="push"> \
    //       <div class="footer message_post"> \
    //         <form style="display:inline;"> \
    //           <div id="message_content" contentEditable=true data-placeholder="Type here..."> \
    //           <input type="submit" style="display:none"> \
    //         </form> \
    //       </div> \
    //     </div> \
    //   </div> \
    // ';
    var message_html = ' \
      <div class="messageArea"> \
        <nav> \
          <ul class="pager"> \
            <li><a class="prev" href="#">Previous</a></li> \
            <li><a class="next" href="#">Next</a></li> \
          </ul> \
        </nav> \
        <ul class="messages"></ul> \
        <form class="inputMessage"> \
          <div id="message_content" contentEditable=true data-placeholder="Type here..."> \
          <input type="submit" style="display: none;"> \
        </form> \
      </div> \
    ';

    this.element.append(message_html);

    this.loadMessages();

    this._initialize();
  },

  _initialize: function() {
    // initialize events listeners for components
    this.element.find('#message_content').keydown(function(e) {
      if (e.which == 13) { // press enter
        var content = $(this).text();
        var _this = this;
        $.post(GLOBAL_URL.message, {
          content: content,
          case: CASE,
          group: GROUP
        }, function(res) {
          if (res === 'success') {
            $(_this).text('');
          }

        });
      }
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
    });
  },

  loadMessage: function(msg) {
    // receive new messages
    // msg structure:
    // { 'sender': user_id, 'content': '', time: 'timestamp'}
    // self: whether the message is sent by the current user

    var row = $('<li class="message"></li>').appendTo(this.element.find('ul.messages'));

    var user = wb.info.users[msg.sender];
    $('<span class="username"></span>').appendTo(row)
      .text(user.name)
      .css('color', user.color);
    $('<span class="timestamp"></span>').appendTo(row)
      .text(msg.sent_at);
    $('<span class="messagebody"></span>').appendTo(row)
      .text(msg.content);

    if (msg.sender === wb.info.user) {
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
