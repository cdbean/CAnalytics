$.widget('viz.vizbase', {
    options: {
        title: '',
        width: 800,
        height: 500,
        base: { // for jquery dialog
            modal : false,
            resizable : true,
            draggable : true,
            closeOnEscape: false,
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
        this.element.dialog(this.options.base).dialogExtend(this.options.extend);
        this.options.extend.help = this.help;
        this.element.addClass('viz');
        this.element.data('instance', this);

        $('<a class="ui-dialog-titlebar-help ui-corner-all ui-state-default" style="width: 19px; height: 18px; cursor: pointer"><span class="ui-icon ui-icon-help">?</span></a>').appendTo(this.element.parent().find('.ui-dialog-titlebar-buttonpane'))
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
})
