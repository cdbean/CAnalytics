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

      this.updateSize();

      this.setupUI();

      this.detailTimeline = wb.viz.timeline()
        .width(this.width)
        .height(this.detailTimelineHeight)
        .on('zoom', this.onDetailZoom.bind(this))
        .on('filter', this.onDetailFilter.bind(this));

      this.overviewTimeline = wb.viz.timeline()
        .width(this.width)
        .height(this.overviewTimelineHeight)
        .itemHeight(10)
        .itemMinWidth(5)
        .itemMaxWidth(10)
        .itemPadding(2)
        .showLabel(false) // do not show labels
        .brushable(true)
        .on('filter', this.onOverviewFilter.bind(this));

      this.updateData();
      this.updateView();
      return this;
    },

    updateSize() {
      this.width = this.element.innerWidth() - 20,
      this.height = this.element.innerHeight() - 20;

      var detailTimelineHeightRatio = .75,
          overviewTimelineHeightRatio = .25;

      this.detailTimelineHeight = this.height * detailTimelineHeightRatio,
      this.overviewTimelineHeight = this.height * overviewTimelineHeightRatio;
    },

    _destroy: function() {
      this._super('_destroy');
    },

    onDetailZoom: function(domain) {
      this.overviewTimeline.setBrush(domain);
    },

    onDetailFilter: function(filter) {
      var filter_id = filter.map(function(d) { return d.id; })

      if (!filter.length) {
        wb.filter.remove('timeline');
      } else {
        wb.filter.set(filter_id, 'timeline', '#' + this.element.attr('id'));
      }
    },

    onOverviewFilter: function(filter, timeDomain) {
      var domain = timeDomain || this.overviewTimeline.domain();
      d3.select(this.element[0])
        .select('svg#detailTimeline')
        .call(this.detailTimeline.domain(domain));
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
        .select('svg#detailTimeline')
        .datum(data)
        .call(this.detailTimeline);

      d3.select(this.element[0])
        .select('svg#overviewTimeline')
        .datum(data)
        .call(this.overviewTimeline)

      this.data = data;

      return this;
    },

    updateView: function() {
      this.detailTimeline.filter(wb.store.shelf.entities);
      this.overviewTimeline.filter(wb.store.shelf.entities);
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
        <svg id="detailTimeline"></svg> \
        <svg id="overviewTimeline"></svg> \
      ';
      this.element.append(html);

      d3.select(this.element[0])
        .select('svg#detailTimeline')
        .attr('width', this.width)
        .attr('height', this.detailTimelineHeight);

      d3.select(this.element[0])
        .select('svg#overviewTimeline')
        .attr('width', this.width)
        .attr('height', this.overviewTimelineHeight);

      // register events
      var _this = this;
      this.element.find('select').change(function(e) {
        _this.detailTimeline.trackBy(this.value);
        _this.overviewTimeline.trackBy(this.value);

        d3.select(_this.element[0])
          .select('svg#detailTimeline')
          .call(_this.detailTimeline);

        d3.select(_this.element[0])
          .select('svg#overviewTimeline')
          .call(_this.overviewTimeline);
      });

      this.element.find('.control').click(function() {
        $(this).toggleClass('selected');
        _this.detailTimeline.brushable($(this).hasClass('selected'));
        d3.select(_this.element[0])
          .select('svg#detailTimeline')
          .call(_this.detailTimeline)
      });
    },

    resize: function() {
      this._super('resize');
      this.updateSize();

      this.detailTimeline.width(this.width).height(this.detailTimelineHeight);
      this.overviewTimeline.width(this.width).height(this.overviewTimelineHeight);

      d3.select(this.element[0])
        .select('svg#detailTimeline')
        .attr('width', this.width)
        .attr('height', this.detailTimelineHeight)
        .call(this.detailTimeline);

      d3.select(this.element[0])
        .select('svg#overviewTimeline')
        .attr('width', this.width)
        .attr('height', this.overviewTimelineHeight)
        .call(this.overviewTimeline);

      return this;
    },

    help: function() {
      var hint = new EnjoyHint({});
      hint.set(wb.help.timeline);
      hint.run();
      return this;
    }
});
