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
      <ul class="history-list"> \
      </ul> \
    ';
    var controls = ' \
      <span class="viewer-controls"> \
        <button type="button" title="archive" class="close delete"><span class="glyphicon glyphicon-trash"></span></button> \
        <button type="button" title="edit" class="close edit"><span class="glyphicon glyphicon-pencil"></span></button> \
        <button type="button" title="restore" class="close restore"><span class="glyphicon glyphicon-repeat"></span></button> \
        <button type="button" title="history" class="close history"><span class="glyphicon glyphicon-time"></span></button> \
      </span> \
    '
    this.element.append(html);
    if (this.options.editable) {
      this.element.prepend(controls);
    }

    this.element.on('click', '.delete', this._onClickDelete.bind(this));
    this.element.on('click', '.edit', this._onClickEdit.bind(this));
    this.element.on('click', '.restore', this._onClickRestore.bind(this));
    this.element.on('click', '.history', this._onClickHistory.bind(this));
    this.element.click(function(e) {
      e.stopPropagation();
    })
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
    this.deleted = d.meta.deleted;

    if (type === 'entity')
      type = d.primary.entity_type;

    var title = d.primary.name || d.primary.relation;

    this.element.find('.close').removeClass('hidden');
    if (this.deleted) {
      this.addTitle('deleted ' + type, title);
      this.element.find('.close.delete, .close.edit').addClass('hidden');
    } else {
      this.addTitle(type, title);
      this.element.find('.close.restore').addClass('hidden');
    }

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
    return this;
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
    this.element.find('.history-list').empty();
    return this;
  },

  _onClickHistory: function() {
    this.element.find('.attr-list').empty().end()
      .find('.history-list').empty();
    var url;
    if (this.item_type === 'relationship') url = GLOBAL_URL.relationship_history.replace('0', this.item.meta.id);
    if (this.item_type === 'entity') url = GLOBAL_URL.entity_history.replace('0', this.item.meta.id);

    var el = this.element.find('.history-list');
    $.get(url, function(res) {
      res.forEach(function(d) {
        $('<li class="history-item"><span class="timestamp"></span><span class="operation"></span> by <span class="username"></span></li>')
          .appendTo(el)
          .find('.timestamp').text(d.time).end()
          .find('.operation').text(d.operation).end()
          .find('.username').text(wb.info.users[d.user].name || 'Unknown')
      });
    });
  },

  _onClickRestore: function() {
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
        type: 'RESTORE',
        success: function(res) {
          wb.store.updateItems(res.annotation, 'annotations');
          wb.store.updateItems(res.entity, 'entities');
          wb.store.updateItems(res.relationship, 'relationships');
          $.publish('data/updated');
          wb.utility.notify('Relationship is restored', 'success');
          wb.log.log({
            operation: 'restored',
            item: 'relationship',
            tool: tool,
            data: wb.log.logItem(res.relationship),
          });
        },
        error: function(e) {
          console.log(e);
          wb.utility.notify('Sorry, failed to restore the relationship');
        }
      });
    } else {
      $.ajax({
        url: GLOBAL_URL.entity_id.replace('0', this.item.meta.id),
        data: {
          case: CASE,
          group: GROUP
        },
        type: 'RESTORE',
        success: function(res) {
          wb.store.updateItems(res.annotation, 'annotations');
          wb.store.updateItems(res.entity, 'entities');
          wb.store.updateItems(res.relationship, 'relationships');
          $.publish('data/updated');
          wb.utility.notify('Entity is restored', 'success');
          wb.log.log({
            operation: 'restored',
            item: res.entity.primary.entity_type,
            tool: tool,
            data: wb.log.logItem(res.entity),
          });
        },
        error: function(e) {
          console.log(e);
          wb.utility.notify('Sorry, failed to restore the entity');
        }
      });
    }
    this.hide();
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
          wb.store.updateItems(res.annotation, 'annotations');
          wb.store.updateItems(res.entity, 'entities');
          wb.store.updateItems(res.relationship, 'relationships');
          $.publish('data/updated');

          wb.utility.notify('Relationship is archived', 'success');
          wb.log.log({
            operation: 'deleted',
            item: 'relationship',
            tool: tool,
            data: wb.log.logItem(res.relationship),
          });
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
          wb.store.updateItems(res.annotation, 'annotations');
          wb.store.updateItems(res.entity, 'entities');
          wb.store.updateItems(res.relationship, 'relationships');
          $.publish('data/updated');

          wb.utility.notify('Entity is archived', 'success');
          wb.log.log({
            operation: 'deleted',
            item: res.entity.primary.entity_type,
            tool: tool,
            data: wb.log.logItem(res.entity),
          });
        },
        error: function(e) {
          console.log(e);
          wb.utility.notify('Sorry, failed to archive the entity');
        }
      });
    }
    this.hide();
  },
});
