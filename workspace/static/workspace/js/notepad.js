$.widget("viz.viznotepad", $.viz.vizbase, {
    _create: function() {
        this.options.extend.maximize = this.resize.bind(this);
        this.options.extend.restore = this.resize.bind(this);
        this.options.base.resizeStop = this.resize.bind(this);
        this.options.base.dragStop = this.resize.bind(this);
        this._super("_create");
        this.element.addClass("viznotepad");
        this.element.data("viz", "vizViznotepad");
        var height = this.element.height();

        var textarea = this.element.append('<textarea id="editor1" name="editor1" style="width:100%; height: 100%;">');

        var getContent = this.getContent.bind(this);
        CKEDITOR.config.height = height - 104; // the height refers to the height of the editing area, thus set it to the height of the container - the height of the toolbar and the bottom bar

        this.editor = CKEDITOR.replace('editor1', {
            on: {
                'instanceReady': function(evt) {
                    getContent();
                }
            },
        });
        setInterval(this.saveContent.bind(this), 5000);
    },

    resize: function() {
        var height = this.element.height();
        this.editor.resize('99%', height-10, false);
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
    }
});
