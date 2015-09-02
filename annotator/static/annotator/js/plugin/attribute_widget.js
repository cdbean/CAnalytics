// widget used for entity attribute
$.widget('custom.attribute_widget', {
    options: {

    },
    _create: function() {
        // receive <ul>
        var wrap = '<ul class="annotator-attributes"></ul>';
        this.element.addClass('annotator-attribute-widget')
        this.content = $(wrap).appendTo(this.element);
        this.add();
        this.element.data('instance', this);
        return this;
    },
    add: function(attr, value, primary) { // if it is primary, the row cannot be deleted
        attr = attr || '';
        value  = value || '';
        primary = primary || 'other';

        var row = '<li><ul class="annotator-attribute annotator-attribute-' + primary + '">';
        row += '<li><input class="annotator-attribute-input" placeholder="Attribute..." value="' + attr + '"/></li>';
        row += '<li><input class="annotator-attribute-value" placeholder="Unknown" value="' + value + '"/></li>';
        var lastrow = this.content.find('.annotator-attribute:last');
        if (lastrow.length) { // if there is already an attribute row
            row += '<li><button type="button" class="btn btn-default attribute-remove-btn"><span class="glyphicon glyphicon-minus"></span></button></li></ul></li>';
            var $row = $(row).insertBefore(lastrow.parent()); // lastrow is <ul>, lastrow's parent is <li>
            $row.find('.attribute-remove-btn').click(function() {
                var row = $(this).parents('.annotator-attribute');
                if (row.hasClass('annotator-attribute-primary')) {
                    row.find('.annotator-attribute-value').val('');
                } else {
                    row.parent().remove();
                }
            });
        } else { // if it is the first attribute row
            row += '<li><button type="button" class="btn btn-default attribute-add-btn"><span class="glyphicon glyphicon-plus"></span></button></li></ul></li>';
            var $row = $(row).appendTo(this.content);
            $row.find('.attribute-add-btn').click(_.bind(function(){
                var lastrow = this.content.find(".annotator-attribute:last");
                // lastrow.find('button').removeClass('attribute-add-btn').addClass('attribute-remove-btn').off('click')
                    // .find("span").removeClass('glyphicon-plus').addClass('glyphicon-minus');

                var attr = lastrow.find('.annotator-attribute-input');
                var value = lastrow.find('.annotator-attribute-value');
                this.add(attr.val(), value.val());
                attr.val('');
                value.val('');
            }, this));
        }

        this.styleInput(attr, value, $row.find('.annotator-attribute-value'));

        // this.sort();
    },

    update: function(attr, value) {
        var attr_input = this.content.find('.annotator-attribute-input[value="' + attr + '"]');
        var value_input = attr_input.parent().find('.annotator-attribute-value');
        this.styleInput(attr, value, value_input);
    },

    reset: function() {
        this.element.empty();
        this._create();
    },
    sort: function() {
        $('> li', this.content).sort(function(a, b) {
            var a_val = $(a).find('.annotator-attribute-value').val();
            var b_val = $(b).find('.annotator-attribute-value').val();
            return a_val < b_val;
        }).appendTo(this.content);
    },

    serialize: function() {
        var res = {};
        $('> li', this.content).each(function(i, row) {
            var attr = $(row).find('.annotator-attribute-input').val();
            var value = $(row).find('.annotator-attribute-value').val();
            if (attr) {
              if (attr === 'address') {
                res['geometry'] = {};
                var autocomplete = $(row).find('.annotator-attribute-value').data('autocomplete');
                var place = autocomplete.getPlace();
                if (place && place.geometry) {
                  res['geometry']['geometry'] = [place.geometry.location.lng(), place.geometry.location.lat()];
                  res['geometry']['address'] = place.formatted_address;
                } else {
                  res['geometry']['geometry'] = null;
                  res['geometry']['address']= $(row).find('.annotator-attribute-value').val();
                }
              } else if (attr === 'person') {
                if (value) value = value.split(',');
                else value = [];
                res[attr] = value;
              } else if (attr === 'organization') {
                if (value) value = value.split(',');
                else value = [];
                res[attr] = value;
              } else if (attr === 'repeated') {
                value = $(row).find('.annotator-attribute-value')[0].checked;
                res[attr] = value;
              } else {
                attr = Annotator.Util.escape(attr);
                value = Annotator.Util.escape(value);
                res[attr] = value;
              }
            }
        });
        return res;
    },

    styleInput: function(attr, value, input) {
      if (attr === 'start_date') {
        input.datetimepicker({
          onShow: function() {
            var $input = $('.annotator-attribute-input[value=end_date]');
            var date = $input.parent().next().children().val();
            this.setOptions({
              value: date
            });
          }
        });
      } else if (attr === 'end_date') {
        input.datetimepicker({
          onShow: function() {
            var $input = $('.annotator-attribute-input[value=start_date]');
            var date = $input.parent().next().children().val();
            this.setOptions({
              value: date
            });
          }
        });
      } else if (attr === 'repeated') {
        var html = '<input class="annotator-attribute-value" type="checkbox" name="repeated" value="true">weekly';
        input.replaceWith(html);

      } else if (attr === 'repeated_until') {
        input.datetimepicker({
          onShow: function() {
            var $input = $('.annotator-attribute-input[value=end_date]');
            var date = $input.parent().next().children().val();
            this.setOptions({
              value: date
            });
          }
        });
      } else if (attr === 'address') {
        // initialize as google place search
        var autocomplete = new google.maps.places.Autocomplete(input[0]);
        input.data('autocomplete', autocomplete);
        if (!value) {
          input.val($('.annotator-widget .entity_name').val()); // if address is empty, put the entity name as default
        }
      } else if (attr === 'priority') {
        // initialize as select drop down
        input.val(5)
      } else if (attr === 'person') {
        var opts = this.prepareSelectOptions('person');
        $(input).selectize({
            options: opts.opts,
            labelField: 'label',
            valueField: 'value',
            searchField: 'label',
            create: true,
            closeAfterSelect: true
          });
      } else if (attr === 'organization') {
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
            optgroups: opts.optgroups,
            optgroupField: 'entity_type',
            labelField: 'label',
            valueField: 'value',
            searchField: 'label',
            create: false,
            closeAfterSelect: true
        });
      }
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
    }
});



