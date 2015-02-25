$.widget('viz.vizentitytable', $.viz.vizbase, {
    _create: function() {
        this.options.base.resizeStop = this.resize.bind(this);
        this.options.extend.maximize = this.resize.bind(this);
        this.options.extend.restore  = this.resize.bind(this);
        this._super('_create');

        var columns = ['ID', 'Name'].concat(wb.static[this.options.entity]);
        this.table = wb.viz.table()
            .columns(columns)
            .height(this.element.height() - 80)
            .title(this.options.title + '_table')
            .editable(true)
            .on('edit', function(entity, attr) {
                $.publish('/entity/attribute/update', [entity, attr]);
            })
        ;
        this.updateData();
        this.update();
    },

    updateData: function() {
        var data = [];
        var entity_type = this.options.entity;
        var attrs = wb.static[entity_type];

        wb.shelf.entities.forEach(function(d) {
          var entity = wb.store.entities[d];
          if (entity && entity.primary.entity_type === entity_type) {
            var row = [entity.meta.id, entity.primary.name || ''];
            for (var i = 0, len = attrs.length; i < len; i++) {
              var attr = attrs[i];
              var value = wb.utility.parseEntityAttr(attr, entity.primary[attr]);

              row.push(value);
            }
            data.push(row);
          }
        });
        this.table.data(data);
    },
    update: function() {
        d3.select(this.element[0]).call(this.table);
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



