// information viewer
//
$.widget('viz.vizviewer', {
  options: {
    editable: true, // whether showing edit and delete button
  },

  _create: function() {
    this.element.addClass('popup viewer');
    this.element.data('instance', this);
    this.element.draggable();
    this.element.hide();

    var html = ' \
      <h4 class="title"></h4> \
      <ul class="attr-list"> \
      </ul> \
    ';
    var controls = ' \
      <span class="viewer-controls"> \
        <button type="button" title="delete" class="close delete"><span class="glyphicon glyphicon-trash"></span></button> \
        <button type="button" title="edit" class="close edit"><span class="glyphicon glyphicon-pencil"></span></button> \
      </span> \
    '
    this.element.append(html);
    if (this.options.editable) {
      this.element.prepend(controls);
    }

    this.element.on('click', '.delete', this._onClickDelete.bind(this));
    this.element.on('click', '.edit', this._onClickEdit.bind(this));
    return this;
  },

  data: function(d, type) {
    this.clearFields();

    if ($.isEmptyObject(d)) {
      this.element.find('.title').text('Item does not exist');
      return this;
    }

    this.item = d;
    this.item_type = type; // item_type: 'entity' or 'relationship'

    if (type === 'entity')
      type = d.primary.entity_type;

    this.addTitle(type, d.primary.name || d.primary.relation);

    var attrs = wb.store.static[type];
    for (var i = 0, len = attrs.length; i < len; i++) {
      var attr = attrs[i], value = d.primary[attr];
      if (value)
        this.addField({key: attr, value: value});
    }
    var metas = wb.store.static.meta;
    for (var i = 0, len = metas.length; i < len; i++) {
      var attr = metas[i], value = d.meta[attr];
      if (value)
        this.addField({key: attr, value: value});
    }
    var others = d.other;
    for (var attr in others) {
      var value = others[attr];
      if (value)
        this.addField({key: attr, value: value});
    }
    return this;
  },

  addTitle: function(type, name) {
    var str = wb.utility.capfirst(type);
    str += ': ' + name;
    this.element.find('.title').text(str);
  },

  // @attr: object {key: <attr-name>, value: <attr-value>}
  addField: function(attr) {
    var key = attr.key, value = attr.value;
    var $element = $('\
      <li class="attr-item"> \
        <ul> \
          <li class="attr-key"></li> \
          <li class="attr-value"></li> \
        </ul> \
      </li> \
    ');
    $element.find('.attr-key').text(key + ': ');
    $element.find('.attr-value').text(wb.utility.parseEntityAttr(key, value));
    this.element.find('.attr-list').append($element);
    return this;
  },

  show: function(pos, tool) {
    var width = this.element.outerWidth();
    var height = this.element.outerHeight();
    this.tool = tool;
    this.element.show().css({
      top: pos.top - height - 10,
      left: pos.left - width/2
    });
    if (this.item) {
      if (this.item_type === 'relationship') {
        wb.log.log({
          operation: 'read',
          item: 'relationship',
          tool: this.tool,
          data: wb.log.logItem(this.item),
          public: false,
        });
      } else {
        wb.log.log({
          operation: 'read',
          item: this.item.primary.entity_type,
          tool: this.tool,
          data: wb.log.logItem(this.item),
          public: false
        });
      }
    }
    return this;
  },

  hide: function() {
    this.clearFields();
    this.item = null;
    this.item_type = null;
    this.tool = null;
    this.element.hide();
    return this;
  },

  clearFields: function() {
    this.element.find('.title').text('');
    this.element.find('.attr-list').empty();
    return this;
  },

  _onClickEdit: function() {
    var width = this.element.outerWidth();
    var height = this.element.outerHeight();
    var pos = this.element.position();

    wb.editor.data(this.item, this.item_type)
      .show({
        top: pos.top + 10 + height,
        left: pos.left + width/2
      }, this.tool);
    this.hide();
  },

  _onClickDelete: function() {
    var item = this.item;
    var item_type = this.item_type;
    var tool = this.tool;
    if (this.item_type === 'relationship') {
      $.ajax({
        url: GLOBAL_URL.relationship_id.replace('0', this.item.meta.id),
        data: {
          case: CASE,
          group: GROUP
        },
        type: 'DELETE',
        success: function(res) {
          wb.utility.notify('Deleted a relationship', 'success');
          wb.log.log({
            operation: 'deleted',
            item: 'relationship',
            tool: tool,
            data: wb.log.logItem(res.relationship),
          });
          $.publish('relationship/deleted', res.relationship);
          // if res includes entity, it means an entity has been updated due to the deletion of the relationship
          if (!$.isEmptyObject(res.entity)) {
            $.publish('entity/updated', res.entity);
          } 
          if (!$.isEmptyObject(res.annotation)) {
            $.publish('annotation/deleted', res.annotation);
          }
        },
        error: function(e) {
          console.log(e);
          wb.utility.notify('Sorry, failed to delete the relationship', 'error');
        }
      });

    } else { // if it is an entity
      $.ajax({
        url: GLOBAL_URL.entity_id.replace('0', this.item.meta.id),
        data: {
          case: CASE,
          group: GROUP
        },
        type: 'DELETE',
        success: function(res) {
          wb.utility.notify('Deleted an entity', 'success');
          $.publish('entity/deleted', res.entity);
          wb.log.log({
            operation: 'deleted',
            item: res.entity.primary.entity_type,
            tool: tool,
            data: wb.log.logItem(res.entity),
          });
          if (!$.isEmptyObject(res.relationship)) {
            $.publish('relationship/deleted', res.relationship);
          }
          if (!$.isEmptyObject(res.annotation)) {
            $.publish('annotation/deleted', res.annotation);
          }
        },
        error: function(e) {
          console.log(e);
          wb.utility.notify('Sorry, failed to delete the entity');
        }
      });
    }
  },
});
