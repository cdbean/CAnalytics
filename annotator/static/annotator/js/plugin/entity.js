var _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Annotator.Plugin.Entity = (function(_super) {
    __extends(Entity, _super);

    function Entity() {
        this.initEntityNameField = __bind(this.initEntityNameField, this);
        this.updateEntityNameField = __bind(this.updateEntityNameField, this);
        this.setEntityName = __bind(this.setEntityName, this);
        this.initEntityTypeField = __bind(this.initEntityTypeField, this);
        this.updateEntityTypeField = __bind(this.updateEntityTypeField, this);
        this.initAttrField = __bind(this.initAttrField, this);
        this.updateAttrField = __bind(this.updateAttrField, this);
        this.setEntityAttr = __bind(this.setEntityAttr, this);
        this.applyToAll = __bind(this.applyToAll, this);
        this.updateViewer = __bind(this.updateViewer, this);
        _ref = Entity.__super__.constructor.apply(this, arguments);
        return _ref;
    }

    Entity.prototype.pluginInit = function() {
        var self = this;

        if (!Annotator.supported()) {
            return;
        }
        this.entityNameField = this.annotator.editor.addField({
            type: 'custom',
            html_content: '<input class="entity_name" ></input>',
            init: this.initEntityNameField,
            load: this.updateEntityNameField,
            submit: this.setEntityName
        });
        this.entityTypeField = this.annotator.editor.addField({
            type: 'custom',
            html_content: '<select class="entity_type"/>',
            init: this.initEntityTypeField,
            load: this.updateEntityTypeField,
            submit: this.setEntityType
        });
        this.attrField = this.annotator.editor.addField({
            type: 'custom',
            html_content: '<div>\n    <p class="annotator-title">Entity attributes</p>\n\n</div>',
            init: this.initAttrField,
            load: this.updateAttrField,
            submit: this.setEntityAttr
        });
        this.applyAllField = this.annotator.editor.addField({
            type: 'checkbox',
            label: Annotator._t('Apply to all data'),
            submit: this.applyToAll
        });

        this.subscribe('entity/type/update', function(value) {
          // do when the entity type is changed
          // put entity attributes in the list
          var entity = self.annotation.entity;
         
          var attribute_widget = $(self.attrField).find('.annotator-attribute-widget').data('instance');
          attribute_widget.reset();
          var attributes = wb.store.static[value];
          if (attributes) {
            for (var i = 0, len = attributes.length; i < len; i++) {
              var attr = attributes[i];
              var val = null;
              if (entity && entity.temp && attr in entity.temp) val = entity.temp[attr];
              attribute_widget.add(attr, val, 'primary');
            }
          }
        });

        this.subscribe('entity/name/update', function(value) {
            var entity = wb.store.items.entities[value];
            if (!self.annotation.entity) {
                self.annotation.entity = {};
            }
            self.annotation.entity.id = entity.primary.id;
            self.annotation.entity.entity_type = entity.primary.entity_type;
            self.annotation.entity.name = entity.primary.name;
            self.updateEntityTypeField('', self.annotation);
            self.updateAttrField('', self.annotation);
        });

        $.subscribe('entity/change', function(e, entity) {
          var opt = {
            entity_type: entity.primary.entity_type,
            value: entity.meta.id,
            label: entity.primary.name
          }
          $('select', self.relatedField).data('selectize').addOption(opt);
          self.initEntityNameField(self.entityNameField);
        });

        this.annotator.viewer.addField({
            load: this.updateViewer
        });

        return this.input = $(this.field).find(':input');
    };

    Entity.prototype.capitalizeFirstLetter = function(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    };

    Entity.prototype.prepareSelectOptions = function(group) {
      // if group is provided, only get options for that group
      var _this = this;
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
        return {value: entity, label: _this.capitalizeFirstLetter(entity)};
      });

      return {opts: opts, optgroups: optgroups};
    };

    Entity.prototype.initEntityNameField = function(field) {
        var opts = this.prepareSelectOptions();
        $(field).find('.entity_name').autocomplete({
                source: opts.opts,
                placeholder: "Entity name or your annotation...",
                select: function(e, ui) {
                    if (ui.item.value) {
                        // update the attribute list to the attribute of the entity
                        $.publish('entity/name/update', ui.item.value);
                    }
                }
            })
        ;
    };


    Entity.prototype.updateEntityNameField = function(field, annotation) {
        var name;
        if (annotation.entity) {
            var entity;
            if (annotation.entity.entity_type === 'relationship')
              entity = wb.store.items.relationships[annotation.entity.id];
            else
              entity = wb.store.items.entities[annotation.entity.id];
            name = entity.primary.name || entity.primary.relation;
        } else {
            name = annotation.quote;
        }
        $(field).find('.entity_name').val(name);
    };


    Entity.prototype.setEntityName = function(field, annotation) {
        if (! annotation.entity) {
            annotation.entity = {};
        }
        var name = $(field).find('.entity_name').val();
        if (name) {
            annotation.entity.name = name;
        } else {
            alert ('Entity name is required!'); // TODO: more elegant form validation
        }
    },

    Entity.prototype.initEntityTypeField = function(field) {
        var self = this;
        $(field).find('.entity_type').selectize({
                valueField: 'value',
                labelField: 'title',
                searchField: 'title',
                create: false,
                options: [
                    {value: 'person', title: 'Person'},
                    {value: 'organization', title: 'Organization'},
                    {value: 'resource', title: 'Resource'},
                    {value: 'location', title: 'Location'},
                    {value: 'event', title: 'Event'},
                    {value: 'relationship', title: 'Relationship'}
                ],
                placeholder: 'Mark the annotation as ...',
                create: false,
                onChange: function(value) {
                    self.publish('entity/type/update', [value]);
                }
            }
        );
    };

    Entity.prototype.updateEntityTypeField = function(field, annotation) {
        this.annotation = annotation;

        var selectize = $(field).find('.entity_type').data('selectize');
        selectize.clear();
        if (annotation.entity && annotation.entity.entity_type) {
            selectize.addItem(annotation.entity.entity_type);
        }
        if (annotation.entity && annotation.entity.id) {
          // if the entity has already been set
          // do not allow to change the type
          selectize.disable();
        } else {
          selectize.enable();
        }
    };

    Entity.prototype.setEntityType = function(field, annotation) {
        if (! annotation.entity) {
            annotation.entity = {};
        }
        var entity_type = $(field).find('.entity_type').val();
        if (!entity_type) {
            alert ('Entity type is required!'); // TODO: more elegant form validation
            return;
        }
        annotation.entity.entity_type = entity_type; // the type could be relationship
    };


    Entity.prototype.initAttrField = function(field, annotation) {
        var $content = $(field).children(':first');
        $content.append('<div>');
        $content.find('div').attribute_widget();
    };

    Entity.prototype.updateAttrField = function(field, annotation) {
        var attribute_widget = $(field).find('.annotator-attribute-widget').data('instance');
        attribute_widget.reset();
        if (annotation.entity && annotation.entity.id) {
            var entity;
            if (annotation.entity.entity_type === 'relationship')
              entity = wb.store.items.relationships[annotation.entity.id];
            else
              entity = wb.store.items.entities[annotation.entity.id];
            var attrs = wb.store.static[entity.primary.entity_type || 'relationship'];
            for (var i = 0, len = attrs.length; i < len; i++) {
                var attr = attrs[i];
                attribute_widget.add(attr, entity.primary[attr], 'primary');
            }
            for (var attr in entity.other) {
                attribute_widget.add(attr, entity.other[attr], 'other');
            }
        } else {
            this.detectEntity();
        }
    };

    Entity.prototype.setEntityAttr = function(field, annotation) {
        if (annotation.entity) {
            var attribute_widget = $(field).find('.annotator-attribute-widget').data('instance');
            var attribute = attribute_widget.serialize();
            annotation.entity.attribute = $.extend({}, attribute);
            if (annotation.entity.entity_type === 'relationship')
              annotation.entity.attribute.relation = annotation.entity.attribute.relation || annotation.entity.name;
        }
        delete annotation.entity.temp;
    };

    Entity.prototype.applyToAll = function(field, annotation) {

      if ($(field).find(':checkbox').prop('checked')) {
        // Let annotator to deal with it
        this.publish('/annotation/applyall', [annotation]);
      }
    };

    Entity.prototype.updateViewer = function(field, annotation) {
        if (annotation.entity) {
            var table = '<table id="annotator-viewer-table">';
            var entity;
            if (annotation.entity.entity_type === 'relationship')
              entity = wb.store.items.relationships[annotation.entity.id];
            else
              entity = wb.store.items.entities[annotation.entity.id];
            var primary = entity.primary || entity;
            table += '<tr><th>' + this.capitalizeFirstLetter(primary.entity_type || 'relationship') + ':</th><td>' + (primary.name || primary.relation) + '</td></tr>';
            var attrs = wb.store.static[entity.primary.entity_type || 'relationship'];
            for (var i = 0, len = attrs.length; i < len; i++) {
              var attr = attrs[i];
              var value = wb.utility.parseEntityAttr(attr, primary[attr]);
              if (value)
                table += '<tr><th>' + this.capitalizeFirstLetter(attr) + ':</th><td>' + value + '</td></tr>';
            }
            var other = entity.other;
            for (var attr in other) {
                if (attr) {
                    table += '<tr><th>' + wb.utility.capfirst(attr) + ':</th><td>' + other[attr] + '</td></tr>';
                }
            }
            if (annotation.created_by) {
              table += '<tr><th>Created by: </th><td>' + wb.info.users[annotation.created_by].name + '</td></tr>';
            }
            if (annotation.created_at) {
              table += '<tr><th>Created at: </th><td>' + annotation.created_at + '</td></tr>';
            }
            table += '</table>';
            $(field).append($(table));
        } else {
            return field.remove();
        }
    };

    Entity.prototype.detectEntity = function() {
        this.annotation.entity = this.annotation.entity || {};
        this.annotation.entity.temp = this.annotation.entity.temp || {};
        var entity_temp = this.annotation.entity.temp;
        var highlights = this.annotation.highlights;
        for (var i = 0, len = highlights.length; i < len; i++) {
            var hl = highlights[i];
            if ($(hl.parentElement).hasClass('annotator-hl')) {
                var entities = findEntity($(hl.parentElement), []);

                for (var j = 0; j < entities.length; j++) {
                    var ent = entities[j];
                    if (entity_temp[ent.entity_type]) entity_temp[ent.entity_type].push(ent.id)
                    else entity_temp[ent.entity_type] = [ent.id];
                }
            }
        }

        function findEntity($el, entities) {
            if ($el.hasClass('annotator-hl')) {
               var ann = $el.data('annotation');
               if (ann) {
                    var ent = ann.entity;
                    if (ent.id && ent.entity_type) entities.push(ent);
                    return findEntity($el.parent(), entities);
               }
            }
            else return entities;
        }
    };

    return Entity;

})(Annotator.Plugin);
