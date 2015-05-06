$.widget('viz.vizannotationtable', $.viz.vizbase, {
    _create: function() {
        this.options.base.resizeStop = this.resize.bind(this);
        this.options.extend.maximize = this.resize.bind(this);
        this.options.extend.restore  = this.resize.bind(this);
        this.element.addClass('annotation');
        this._super('_create');

        var columns = ['ID', 'Quote', 'Data Entry', 'Annotation', 'Entity'];
        this.table = wb.viz.table()
            .columns(columns)
            .height(this.element.height() - 80)
            .title('annotation_table')
            .on('filter', function(selected) {
              wb.store.shelf_by.annotations = selected;
              $.publish('data/filter', '#' + this.element.attr('id'));
              $('.viz.dataentry').data('instance').highlight(selected[selected.length - 1])
            }.bind(this))
        ;
        this.updateData();
        this.updateView();
    },

    updateData: function() {
        var data = [];

        for (var d in wb.store.items.annotations) {
          var ann = wb.store.items.annotations[d];
          var entity = ann.entity;
          if (entity.entity_type === 'relationship')
            entity = wb.store.items.relationships[entity.id];
          else
            entity = wb.store.items.entities[entity.id];
          var entry = wb.store.items.dataentries[ann.anchor];
          var row = [ann.id, ann.quote, entry.name || '', entity.primary.name || entity.primary.relation, ann.entity.entity_type];
          data.push(row);
        }
        this.table.data(data);
        d3.select(this.element[0]).call(this.table);
    },

    updateView: function() {
      this.table.filter(wb.store.shelf.annotations);
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




