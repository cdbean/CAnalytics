$.widget('viz.vizbase', {
    options: {
        title: '',
        tool: '',
        width: 800,
        height: 500,
        base: { // for jquery dialog
            modal : false,
            resizable : true,
            draggable : true,
            closeOnEscape: false,
            // show: {
            //     effect: 'scale',
            //     percent: 100
            // }
        },
        extend: { // for jquery dialogextend
            maximizable : true,
            minimizable : true,
            minimizeLocation : "right",
            collapsable : true,
            dblclick : "collapse",
            help: null,
        }
    },
    _create: function() {
        if (!this.options.base.close) {
            this.options.base.close = this._destroy.bind(this);
        }
        if (!this.options.base.resizeStop) {
            this.options.base.resizeStop = this.resize.bind(this);
        }
        // this.options.base.width = this.options.width;
        // this.options.base.height = this.options.height;
        this.options.base.width = $(window).width() / 2 - 20;
        this.options.base.height = $(window).height() / 2 - 20;
        this.options.base.title = this.options.title;
        this.options.base.focus = this.onFocus.bind(this);

        this.element.dialog(this.options.base).dialogExtend(this.options.extend);
        this.options.extend.help = this.help;
        this.options.extend.arrange_window = this.arrange_window;
        this.element.addClass('viz');
        this.element.data('instance', this);

        var titlebar = this.element.parent().find('.ui-dialog-titlebar-buttonpane')
        $('<a class="ui-dialog-titlebar-pin ui-corner-all ui-state-default" title="auto arrange windows" style="width: 19px; height: 18px; cursor: pointer"><span class="ui-icon ui-icon-pin-w"></span></a>')
            .appendTo(titlebar)
            .click(this.options.extend.arrange_window);
        $('<a class="ui-dialog-titlebar-help ui-corner-all ui-state-default" title="help" style="width: 19px; height: 18px; cursor: pointer"><span class="ui-icon ui-icon-help">?</span></a>')
            .appendTo(titlebar)
            .click(this.options.extend.help);
    },
    resize: function() {
        this.element.css("width", "auto");
        this.element.parents('.ui-dialog').css("height", 'auto');
    },
    _destroy: function() {
        $.publish("viz/close", this.element.attr("id"));
        this.element.dialog('destroy').remove();
    },
    help: function() {

    },

    onFocus: function() {
        $.publish('user/tool', this.options.tool);
        wb.log.log({
            operation: 'focused',
            item: this.options.tool,
            tool: this.options.tool,
            public: false
        });
    },

    arrange_window: function() {
        // auto arrange all opened windows
        var width = $(window).width(),
            height = $(window).height();

        var viz = $('.viz'),
            n = viz.length;
        if (n < 4 && n > 1) { // one row
            $(viz).each(function(i, el) {
                $(el).dialog('option', {
                    width: width/n, 
                    height: height-100,
                    position: {
                        my: 'left top',
                        at: 'left+' + width/n*i + ' top+100',
                        of: window
                    }
                });
                $(el).data('instance').resize();
            });
        } else if (n >=4) { // two rows
            var row = 2;
            var col = Math.ceil(n / 2);
            $(viz).each(function(i, el) {
                if (i < n/2) {
                    $(el).dialog('option', {
                        width: width/col, 
                        height: (height-100)/2,
                        position: {
                            my: 'left top',
                            at: 'left+' + width/col*(i%col) + ' top+100',
                            of: window
                        }
                    });
                } else {
                    $(el).dialog('option', {
                        width: width/col, 
                        height: (height-100)/2,
                        position: {
                            my: 'left bottom',
                            at: 'left+' + width/col*(i%col) + ' bottom',
                            of: window
                        }
                    });
                }
                $(el).data('instance').resize();
            });
        }
    }
})
