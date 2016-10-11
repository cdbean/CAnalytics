$.widget('viz.viztimeline', $.viz.vizbase, {
    options: {
    },
    _create: function() {
      this.options.base.resizeStop = this.resize.bind(this);
      this.options.extend.maximize = this.resize.bind(this);
      this.options.extend.restore  = this.resize.bind(this);
      this.options.extend.help = this.help;
      this.element.addClass('timeline');
      this._super('_create');

      this.setupUI();

      var width = this.element.innerWidth() - 20;
      var height = this.element.innerHeight() - 20;

      this.timeline = wb.viz.timeline()
        .width(width)
        .height(height)
        .on('filter', this.onFilter.bind(this));

      this.updateData();
      this.updateView();
      return this;
    },

    _destroy: function() {
      this._super('_destroy');
    },

    onFilter: function(filter) {
      var shelf_by = wb.store.shelf_by.entities.slice();
      shelf_by = wb.utility.uniqueArray(shelf_by.concat(filter));

      wb.store.shelf_by.entities = shelf_by;
      $('.filter-div .filter-item').filter(function(i, item) {
        return $(item).find('a').data('item') === 'event';
      }).remove();
      if (!filter.length) {
        wb.log.log({
          operation: 'defiltered',
          item: 'events',
          tool: 'timeline',
          public: false
        });
      } else {
        var selected_events = [];
        filter.forEach(function(d) {
          var e = wb.store.items.entities[d];
          wb.filter.add('event: ' + e.primary.name, {
            item: 'event',
            id: e.meta.id,
            tool: 'timeline',
          });
          selected_events.push(e);
        });
        wb.log.log({
          operation: 'filtered',
          item: 'events',
          tool: 'timeline',
          data: wb.log.logItems(selected_events),
          public: false
        });
      }
      $.publish('data/filter', '#' + this.element.attr('id'));
    },

    updateData: function() {
      var data = [];
      for (var d in wb.store.items.entities) {
        var entity = wb.store.items.entities[d];
        if (entity.meta.deleted) continue;
        if (entity.primary.entity_type === 'event') {
          if (entity.primary.start_date) {
            if (entity.primary.repeated) {
              var repeat_delta = 1000 * 3600 * 24 * 7; // hard code: repeat every week
              var repeated_until = wb.utility.Date(entity.primary.repeated_until) || wb.info.case.end_date;
              var start_date = wb.utility.Date(entity.primary.start_date);
              var end_date = wb.utility.Date(entity.primary.end_date);
              var delta = end_date - start_date;
              var date = start_date;
              var index = 0;
              while (date <= repeated_until) {
                data.push({
                  start: date,
                  end: new Date(date.getTime() + delta),
                  label: entity.primary.name,
                  lid: entity.meta.id + '-' + index, // local id, for viz only
                  id: entity.meta.id
                });
                date = new Date(date.getTime() + repeat_delta);
                index ++;
              }
            } else {
              data.push({
                start: wb.utility.Date(entity.primary.start_date),
                end: wb.utility.Date(entity.primary.end_date),
                label: entity.primary.name,
                id: entity.meta.id,
                lid: entity.meta.id
              });
            }
          }
        }
      }

      d3.select(this.element[0])
        .select('svg.chart')
        .datum(data)
        .call(this.timeline);
      return this;
    },

    updateView: function() {
      this.timeline.filter(wb.store.shelf.entities);
      return this;
    },

    setupUI: function() {
      var html = ' \
        <select class="controls" style=""> \
          <option value="">Group by...</option> \
          <option value="person">person</option> \
          <option value="location">location</option> \
          <option value="resource">resource</option> \
          <option value="organization">organization</option> \
        </select> \
        <ul class="controls" style="margin-top:40px;"> \
          <li class="control filter" title="Filter"> \
        </ul> \
        <svg class="chart"></svg> \
      ';
      this.element.append(html);
      d3.select(this.element[0]).select('svg')
        .attr('width', this.element.innerWidth() - 20)
        .attr('height', this.element.innerHeight() - 30)

      var _this = this;

      this.element.find('select').change(function(e) {
        _this.timeline.trackBy(this.value);
        d3.select(_this.element[0])
          .select('svg.chart')
          .call(_this.timeline)
      })

      this.element.find('.control').click(function() {
        $(this).toggleClass('selected');
        _this.timeline.brushable($(this).hasClass('selected'));
        d3.select(_this.element[0])
          .select('svg.chart')
          .call(_this.timeline)
      });
    },

    resize: function() {
      this._super('resize');
      var width = this.element.innerWidth() - 20;
      var height = this.element.innerHeight() - 30;
      this.timeline.width(width).height(height);
      d3.select(this.element[0])
        .select('svg.chart')
        .attr('width', width)
        .attr('height', height)
        .call(this.timeline);
      return this;
    },

    help: function() {
      var hint = new EnjoyHint({});
      hint.set(wb.help.timeline);
      hint.run();
      return this;
    }
});
