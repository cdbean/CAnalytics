$.widget('viz.vizentitytable', $.viz.vizbase, {
    _create: function() {
        this.options.base.resizeStop = this.resize.bind(this);
        this.options.extend.maximize = this.resize.bind(this);
        this.options.extend.restore  = this.resize.bind(this);
        this.options.extend.help = this.help;
        this.element.addClass('entity');
        this._super('_create');

        // two empty title columns: for one collapse, the other for delete
        var columns = ['ID', 'Name'].concat(wb.store.static[this.options.entity]);

        this.table = wb.viz.table()
            .columns(columns)
            .height(this.element.height() - 80)
            .title(this.options.title + '_table')
            .editable(true)
            .on('edit', function(entity, attr) {
                $.publish('/entity/attribute/update', [entity, attr]);
            })
            .on('filter', function(selected) {
              var shelf_by = wb.store.shelf_by.entities;
              shelf_by = shelf_by.concat(selected);
              var entities = this.table.data().map(function(d) {
                return d[0];
              });
              shelf_by = wb.utility.diffArray(shelf_by, wb.utility.diffArray(entities, selected));
              wb.store.shelf_by.entities = shelf_by;

              $('.filter-div .filter-item').filter(function(i, item) {
                return wb.store.static.entity_types.indexOf($(item).find('a').data('item')) > -1;
              }).remove();
              shelf_by.forEach(function(d) {
                var entity = wb.store.items.entities[d];
                wb.filter.add(entity.primary.entity_type + ': ' + entity.primary.name, {
                  item: entity.primary.entity_type,
                  id: entity.meta.id
                });
              });
              $.publish('data/filter', '#' + this.element.attr('id'));
            }.bind(this))
        ;
        this.updateData();
        this.updateView();
    },

    updateData: function() {
        var data = [];
        var entity_type = this.options.entity;
        var attrs = wb.store.static[entity_type];

        for (var d in wb.store.items.entities) {
          var entity = wb.store.items.entities[d];
          if (entity && entity.primary.entity_type === entity_type) {
            // the two null values are for the two special columns
            var row = [entity.meta.id, entity.primary.name || ''];
            for (var i = 0, len = attrs.length; i < len; i++) {
              var attr = attrs[i];
              var value = wb.utility.parseEntityAttr(attr, entity.primary[attr]);

              row.push(value);
            }
            row.push(null);
            data.push(row);
          }
        }
        this.table.data(data);
        d3.select(this.element[0]).call(this.table);
    },

    updateView: function() {
      this.table.filter(wb.store.shelf.entities);
    },

    reload: function() {
        this.element.empty();
        this.updateData();
        this.update();
    },
    resize: function() {
        this._super('resize');
        this.element.find('.dataTables_scrollBody').css('height', (this.element.height() - 80))
        this.table.resize();
    },

    highlight: function(item) {
      this.element.find('tr.odd, tr.even').each(function(i, row) {
        if ($(row).data('id') ==  item) {
          $(row).addClass('highlighted');
          wb.utility.scrollTo(row, $(this).parents('.dataTables_scrollBody'));
        }
      });
    },

    help: function() {
      var hint = new EnjoyHint({});
      hint.set(wb.help.table);
      hint.run();
    }
});



