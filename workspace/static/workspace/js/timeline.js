$.widget('viz.viztimeline', $.viz.vizbase, {
    options: {
    },
    _create: function() {
      this.options.base.resizeStop = this.resize.bind(this);
      this.options.extend.maximize = this.resize.bind(this);
      this.options.extend.restore  = this.resize.bind(this);
      this.element.addClass('timeline');
      this._super('_create');

      var width = this.element.innerWidth() - 20;
      var height = this.element.innerHeight() - 20;
      // this.timeline = wb.viz.timeline(this.element[0]).width(width).height(height);
      this.timeline = wb.viz.timeline()
        .width(width)
        .height(height);
      this.updateData();
      this.update();
      return this;
    },
    _destroy: function() {
      this._super('_destroy');
    },

    updateData: function() {
      var data = [];
      for (var d in wb.store.entities) {
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
      }
      this.timeline.data(data);
      d3.select(this.element[0]).call(this.timeline);
    },

    update: function() {
      this.timeline.redraw();
    },

    resize: function() {
      this._super('resize');
      var width = this.element.innerWidth() - 20;
      var height = this.element.innerHeight() - 20;
      this.timeline.width(width).height(height).redraw();
    }
});

