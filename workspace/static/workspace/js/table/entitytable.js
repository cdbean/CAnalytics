$.widget('viz.vizentitytable', $.viz.vizbase, {
    _create: function() {
        this.options.base.resizeStop = this.resize.bind(this);
        this.options.extend.maximize = this.resize.bind(this);
        this.options.extend.restore  = this.resize.bind(this);
        this.options.extend.help = this.help;
        this.element.addClass('entity');
        this.element.addClass(this.options.entity);
        this._super('_create');

        // empty title column for collapse
        var columns = ['ID', 'Detail', 'Name', 'Created by', 'Created at', 'Last edited by', 'Last edited at', 'Deleted'];

        var _this = this;
        this.table = wb.viz.table()
            .columns(columns)
            .height(this.element.height() - 80)
            .title(this.options.title + '_table')
            // .editable(true) // not editable
            .on('edit', function(entity, attr) {
                $.publish('/entity/attribute/update', [entity, attr]);
            })
            .on('filter', function(selected) {
              if (selected.length) {
                wb.filter.set(selected, _this.options.title + ' table', '#' + _this.element.attr('id'));
              } else {
                wb.filter.remove('#' + _this.element.attr('id'));
              }
            })
        ;
        this.updateData();
        this.updateView();
        return this;
    },

    updateData: function() {
        var data = [];
        var entity_type = this.options.entity;
        var attrs = wb.store.static[entity_type];

        for (var d in wb.store.items.entities) {
          var entity = wb.store.items.entities[d];
          if (entity && entity.primary.entity_type === entity_type) {
            var row = [
              entity.meta.id,
              '<i class="glyphicon glyphicon-list-alt control"></i>',
              entity.primary.name || '',
              wb.info.users[entity.meta.created_by].name,
              entity.meta.created_at,
              wb.info.users[entity.meta.last_edited_by].name,
              entity.meta.last_edited_at,
              entity.meta.deleted ? 'Yes' : 'No'
            ];
            // add archived entities to the end, and normal entities to front
            data.push(row);
          }
        }
        this.table.data(data);
        d3.select(this.element[0]).call(this.table);
        return this;
    },

    updateView: function() {
      this.table.filter(wb.store.shelf.entities);
      return this;
    },

    filter: function() {

    },

    defilter: function() {
      this.table.defilter();
    },

    reload: function() {
        this.element.empty();
        this.updateData();
        this.update();
        return this;
    },
    resize: function() {
        this._super('resize');
        this.element.find('.dataTables_scrollBody').css('height', (this.element.height() - 80))
        this.table.resize();
        return this;
    },

    highlight: function(item) {
      this.element.find('tr.odd, tr.even').each(function(i, row) {
        if ($(row).data('id') ==  item) {
          $(row).addClass('highlighted');
          wb.utility.scrollTo(row, $(this).parents('.dataTables_scrollBody'));
        }
      });
      return this;
    },

    help: function() {
      var hint = new EnjoyHint({});
      hint.set(wb.help.table);
      hint.run();
      return this;
    }
});
