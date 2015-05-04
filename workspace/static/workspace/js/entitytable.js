$.widget('viz.vizentitytable', $.viz.vizbase, {
    _create: function() {
        this.options.base.resizeStop = this.resize.bind(this);
        this.options.extend.maximize = this.resize.bind(this);
        this.options.extend.restore  = this.resize.bind(this);
        this.element.addClass('entity');
        this._super('_create');

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
              shelf_by.concat(selected);
              var entities = this.table.data().map(function(d) {
                return d[0];
              });
              shelf_by = wb.utility.diffArray(shelf_by, wb.utility.diffArray(entities, selected));
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
            var row = [entity.meta.id, entity.primary.name || ''];
            for (var i = 0, len = attrs.length; i < len; i++) {
              var attr = attrs[i];
              var value = wb.utility.parseEntityAttr(attr, entity.primary[attr]);

              row.push(value);
            }
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
    },

    highlight: function(item) {
      this.element.find('tr.odd, tr.even').each(function(i, row) {
        if ($(row).data('id') ==  item) {
          $(row).addClass('active');
          wb.utility.scrollTo(row, $(this).parents('.dataTables_scrollBody'));
        }
      });
    }
});



