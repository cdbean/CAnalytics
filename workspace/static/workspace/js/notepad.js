$.widget("viz.viznotepad", $.viz.vizbase, {
    _create: function() {
        this.options.extend.maximize = this.resize.bind(this);
        this.options.extend.restore = this.resize.bind(this);
        this.options.base.resizeStop = this.resize.bind(this);
        this.options.base.dragStop = this.resize.bind(this);
        this.options.extend.help = this.help;
        this._super("_create");
        this.element.addClass("notepad");
        var height = this.element.height();

        var id = this.element[0].id + '-container';
        var editor = $('<div style="width:100%; height: 100%;">')
        .attr('id', id)
        .appendTo(this.element);

        var padId = CASE + '-' + GROUP;
        $('#' + id).pad({
          'padId': padId,
          'showChat': false,
          'host': this.options.url,
          'showControls': true,
          'userName': wb.info.users[wb.info.user].name,
          'userColor': wb.info.users[wb.info.user].color,
          width: '100%',
          height: '100%'
        });
    },

    resize: function() {
        // var height = this.element.height();
        // this.editor.resize('99%', height-10, false);
        this._super('resize');
        var id = '#' + this.element[0].id + '-container';
        var width = $(id).width();
        var height = $(id).height();
        $(id + '>iframe').css('width', width - 5);
        $(id + '>iframe').css('height', height - 5);
    },

    update: function() {
        // in accordance with other artifacts, useless here
    },

    updateData: function() {
        // in accordance with other artifacts, useless here

    },

    getContent: function() {
        var _this = this;
        $.get('notepad/note', function(res) {
            _this.editor.setData(res.content);
            _this.id = res.id;
        });
    },

    saveContent: function() {
        if (this.editor.checkDirty()) {
            var content = this.editor.getData();
            var _this = this;
            $.post('notepad/note', {content: content, id: this.id}, function() {
                // show message in the bottom bar
                _this.showMessage.bind(_this)('auto saved');
            });
            this.editor.resetDirty();
        }
    },

    showMessage: function(msg) {
        $('<span class="custom_message">' + msg + '</span>').appendTo(this.element.find('.cke_bottom'))
            .css({
                float: 'right',
                'margin-right': '20px'
            })
        ;
        setTimeout(this.hideMessage.bind(this), 3000);
    },

    hideMessage: function() {
        this.element.find('.cke_bottom span.custom_message').empty();
    },

    help: function() {
      var hint = new EnjoyHint({});
      hint.set(wb.help.notepad);
      hint.run();
    }
});
