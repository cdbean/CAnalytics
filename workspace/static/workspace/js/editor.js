$.widget('viz.vizeditor', {
  options: {

  },

  _create: function() {
    this.element.addClass('viewer');
    this.element.data('instance', this);
    if (this.options.relationship) this.element.data('relationship', this.options.relationship);
    if (this.options.entity) this.element.data('entity', this.options.entity);

    var html = ' \
      <span class="viewer-controls"> \
        <button type="button" title="delete" class="close delete"><span class="glyphicon glyphicon-remove"></span></button> \
        <button type="button" title="edit" class="close edit"><span class="glyphicon glyphicon-pencil"></span></button> \
      </span> \
      <ul class="attr-list"> \
      </ul> \
    ';
    this.element.append(html);
  },

  addField: function(options) {
    var $element = $('<li class="attr-item"></li>');
    $
  },

  show: function(location) {
    this.element.show().css({
      top: location.top,
      left: location.left
    });
  }
});

