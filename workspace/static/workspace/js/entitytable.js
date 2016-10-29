$.widget('viz.vizentitytable', $.viz.vizbase, {
    _create: function() {
        this.options.base.resizeStop = this.resize.bind(this);
        this.options.extend.maximize = this.resize.bind(this);
        this.options.extend.restore  = this.resize.bind(this);
        this.options.extend.help = this.help;
        this.element.addClass('entity');
        this.element.addClass(this.options.entity);
        this._super('_create');

        // two empty title columns: for one collapse, the other for delete
        var columns = ['ID', '', 'Name'].concat(wb.store.static[this.options.entity]);

        var _this = this;
        this.table = wb.viz.table()
            .columns(columns)
            .height(this.element.height() - 80)
            .title(this.options.title + '_table')
            .editable(true)
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
          if (entity.meta.deleted) continue;
          if (entity && entity.primary.entity_type === entity_type) {
            // the two null values are for the two special columns
            var row = [entity.meta.id, '<img src="' + GLOBAL_URL.static + '/workspace/img/details_open.png' + '" class="control"></img>', entity.primary.name || ''];
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
