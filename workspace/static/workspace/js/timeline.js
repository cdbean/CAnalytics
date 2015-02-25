$.widget('viz.viztimeline', $.viz.vizbase, {
    options: {
    },
    _create: function() {
      this.options.base.resizeStop = this.resize.bind(this);
      this.options.extend.maximize = this.resize.bind(this);
      this.options.extend.restore  = this.resize.bind(this);
      this._super('_create');

      var width = this.element.width() - 15;
      var height = this.element.height() - 15;
      this.timeline = wb.viz.timeline(this.element[0], width, height);
      this.updateData();
      this.update();
      return this;
    },
    _destroy: function() {
      this._super('_destroy');
    },

    updateData: function() {
      var data = [];
      wb.shelf.entities.forEach(function(d) {
        var entity = wb.store.entities[d];
        if (entity.primary.entity_type === 'event') {
          if (entity.primary.start_date) {
            data.push({
              start: entity.primary.start_date,
              end: entity.primary.end_date,
              label: entity.primary.name,
              id: entity.meta.id
            });
          }
        }
      });
      this.timeline.data(data).init();
    },

    update: function() {
      this.timeline.redraw();
    },

    resize: function() {
      this._super('resize');
      this.update();
    }
});

