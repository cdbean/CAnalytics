$.widget('viz.vizeditor', {
  options: {

  },

  _create: function() {
    this.element.addClass('popup editor');
    this.element.data('instance', this);
    this.element.hide();
    if (this.options.relationship) this.element.data('relationship', this.options.relationship);
    if (this.options.entity) this.element.data('entity', this.options.entity);

    var html = ' \
      <form> \
        <input class="title" placeholder="Describe..."> \
        <ul class="attr-list"> \
        </ul> \
        <div class="editor-controls"> \
          <button type="button" title="Save" class="close save">Save</button> \
          <button type="button" title="Cancel" class="close cancel">Cancel</button> \
        </div> \
      </form> \
    ';
    this.element.append(html);

    this.element.on('click', '.attr-add-btn', this._onClickAdd.bind(this));
    this.element.on('click', '.attr-remove-btn', this._onClickRemove.bind(this));
    this.element.on('click', '.save', this._onClickSave.bind(this));
    this.element.on('click', '.cancel', this._onClickCancel.bind(this));
  },

  data: function(d, type) {
    this.clearFields();

    this.item = d;
    this.item_type = type;
    if (! d) {
      d = {primary: {}, meta: {}, other: {}};
    }
    this.addTitle(type, d.primary.name || d.primary.relation);

    if (type === 'entity')
      type = d.primary.entity_type;
    var attrs = wb.store.static[type];
    for (var i = 0, len = attrs.length; i < len; i++) {
      var attr = attrs[i], value = d.primary[attr];
      this.addField(attr, value, 'primary');
    }
    var others = d.other;
    for (var attr in others) {
      var value = others[attr];
      this.addField(attr, value, 'other');
    }
    return this;
  },

  addField: function(attr, value, primary) {
      attr = attr || '';
      value  = value || '';
      primary = primary || 'other';

      var row = '<li><ul class="attr-item ' + primary + '">';
      row += '<li><input class="attr-key" placeholder="Attribute..." value="' + attr + '"/></li>';
      row += '<li><input class="attr-value" placeholder="Unknown" value="' + value + '"/></li>';

      var lastrow = this.element.find('.attr-item:last');
      if (lastrow.length) { // if there is already an attribute row
          row += '<li><button type="button" class="btn btn-default attr-remove-btn"><span class="glyphicon glyphicon-minus"></span></button></li></ul></li>';
          var $row = $(row).insertBefore(lastrow.parent()); // lastrow is <ul>, lastrow's parent is <li>
      } else { // if it is the first attribute row
          row += '<li><button type="button" class="btn btn-default attr-add-btn"><span class="glyphicon glyphicon-plus"></span></button></li></ul></li>';
          var $row = $(row).appendTo(this.element.find('.attr-list'));
      }

      this._styleInput(attr, value, $row.find('.attr-value'));

      return this;
  },

  _onClickAdd: function(e) {
    var lastrow = this.element.find('.attr-item:last');
    lastrow.find('button').removeClass('attr-add-btn').addClass('attr-remove-btn')
      .find('span').removeClass('glyphicon-plus').addClass('glyphicon-minus');
    this.addField();
  },

  _onClickRemove: function(e) {
    var row = $(e.target).parents('.attr-item');
    if (row.hasClass('primary')) {
        row.find('.attr-value').val('');
    } else {
        row.parent().remove();
    }
  },

  _styleInput: function(attr, value, input) {
    if (/date/.test(attr)) {
      input.datetimepicker();
    } else if (attr === 'address') {
      // initialize as google place search
      var autocomplete = new google.maps.places.Autocomplete(input[0]);
      input.data('autocomplete', autocomplete);
    } else if (attr === 'priority') {
      // initialize as select drop down
      input.val(5)
    } else if (attr === 'people') {
      var opts = this.prepareSelectOptions('person');
      $(input).selectize({
          options: opts.opts,
          labelField: 'label',
          valueField: 'value',
          searchField: 'label',
          create: true,
          closeAfterSelect: true
        });
    } else if (attr === 'organizations') {
      var opts = this.prepareSelectOptions('organization');
      $(input).selectize({
          options: opts.opts,
          labelField: 'label',
          valueField: 'value',
          searchField: 'label',
          create: true,
          closeAfterSelect: true
        });
    } else if (attr === 'location') {
      var opts = this.prepareSelectOptions('location');
      $(input).selectize({
          options: opts.opts,
          labelField: 'label',
          valueField: 'value',
          searchField: 'label',
          create: true,
          closeAfterSelect: true
      });
    } else if (attr === 'source' || attr === 'target') {
      var opts = this.prepareSelectOptions();
      $(input).selectize({
          options: opts.opts,
          labelField: 'label',
          valueField: 'value',
          searchField: 'label',
          create: true,
          closeAfterSelect: true
      });
    }

  },

  show: function(pos) {
    var width = this.element.outerWidth();
    var height = this.element.outerHeight();
    this.element.show().css({
      top: pos.top - height - 10,
      left: pos.left - width/2
    });
    return this;
  },

  addTitle: function(type, name) {
    if (name)
      this.element.find('.title').val(name);
    return this;
  },

  clearFields: function() {
    this.element.find('.title').text('');
    this.element.find('.attr-list').empty();
    return this;
  },

  hide: function() {
    this.clearFields();
    this.item = null;
    this.item_type = null;
    this.element.hide();
    return this;
  },


  prepareSelectOptions: function(group) {
    // if group is provided, only get options for that group
    var opts = [], optgroups = [];
    for (var key in wb.store.items.entities) {
      var entity = wb.store.items.entities[key];
      if (group) {
        if (entity.primary.entity_type !== group) continue;
      }
      opts.push({
        entity_type: entity.primary.entity_type,
        value: entity.meta.id,
        label: entity.primary.name
      });
    }
    optgroups = wb.store.static.entity_types.map(function(entity) {
      return {value: entity, label: wb.utility.capfirst(entity)};
    });

    return {opts: opts, optgroups: optgroups};
  },

  _onClickSave: function() {
    var data = {};
    data.attribute = this.serialize();
    var url;
    data.id = this.item.meta && this.item.meta.id;
    data.name = this.element.find('.title').val();
    data.case = wb.info.case;
    data.group = wb.info.group;
    if (this.item_type === 'entity') {
      url = GLOBAL_URL.entity_id.replace(/\/0/, data.id ? '': '/' + data.id);
      data.entity_type = this.item.primary.entity_type;
    } else if (this.item_type === 'relationship') {
      url = GLOBAL_URL.relationship_id.replace(/\/0/, data.id ? '': '/' + data.id);
    }
    $.post(url, {data: JSON.stringify(data)}, function(d) {
      $.publish('entity/updated', d.entity);
      if (d.relationship)
        $.publish('relationship/updated', d.relationship);
      wb.utility.notify('Entity successfully updated!', 'success');
    });

    this.hide();
  },

  _onClickCancel: function() {
    this.hide();
  },

  serialize: function() {
    var res = {};
    $('.attr-item', this.element).each(function(i, row) {
        var attr = $(row).find('.attr-key').val();
        var value = $(row).find('.attr-value').val();
        if (attr) {
          if (attr === 'address') {
            var autocomplete = $(row).find('.attr-value').data('autocomplete');
            var place = autocomplete.getPlace();
            res['geometry'] = {};
            res['geometry']['geometry'] = [place.geometry.location.lng(), place.geometry.location.lat()];
            res['geometry']['address'] = place.formatted_address;
          } else if (attr === 'people') {
            if (value) value = value.split(',');
            else value = [];
            res[attr] = value;
          } else if (attr === 'organizations') {
            if (value) value = value.split(',');
            else value = [];
            res[attr] = value;
          } else {
            res[attr] = value;
          }
        }
    });
    return res;
  },
});

