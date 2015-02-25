$.widget('viz.vizeditor', {
  options: {

  },

  _create: function() {
    this.element.addClass('editor');
    this.element.data('instance', this);
    if (this.options.relationship) this.element.data('relationship', this.options.relationship);
    if (this.options.entity) this.element.data('entity', this.options.entity);

    var html = ' \
      <ul class="attr-list"> \
      </ul> \
    ';
    this.element.append(html);
  },

  addField: function(options) {
    var $element = $('<li class="attr-item"></li>');
    $
  },

  show: function(pos) {
    this.element.show().css({
      top: pos.top,
      left: pos.left
    });
  }
});

