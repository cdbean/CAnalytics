wb.viz.timeline = function() {
  var margin = {top: 20, right: 30, bottom: 30, left: 80},
      width = 960,
      height = 500
  ;
  var tracks = [],
      itemPadding = 5,
      itemHeight = 20,
      itemMinWidth = 100;

  var trackBy = '';
  var brushable = false;
  var zoom = null, brush = null;

  var container = null;

  var dispatch = d3.dispatch('filter');

  var formatDate = d3.time.format("%m/%d/%Y-%H:%M:%S");

  exports.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return exports
  }

  exports.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return exports
  }

  exports.filter = function() {
    // TODO: filter view
  }

  exports.trackBy = function(by) {
    trackBy = by;
    return exports;
  }

  exports.brushable = function(_) {
    brushable = _;
    return exports;
  }

  function exports(selection) {
    selection.each(function(dd) {
      var innerW = width - margin.left - margin.right,
          innerH = height - margin.top - margin.bottom;
      var scaleX, axis;
      var timelineLayout;


      function zoomed() {
        updateLayout()
        updateItems()
        updateTracks()
        updateAxis()
      }

      function brushing() {
        var ext = brush.extent()
        container.selectAll('.item').classed('active', function(d) {
          return (d.start <= ext[1]  && d.start >= ext[0])
            || (d.end >= ext[0] && d.end <= ext[1])
            || (d.start <= ext[0] && d.end >= ext[1]);
        });
      }

      function brushed() {
        var filter = [];
        container.selectAll('.item.active').each(function(d) {
          filter.push(d.id);
        });
        return dispatch.filter(filter);
      }

      init.apply(this);
      update.apply(this);

      function init() {
        if (d3.select(this).select('.timelineVis').empty()) {
          container = d3.select(this).append('g').attr('class', 'timelineVis')
          container.append('clipPath').attr('id', 'clip')
            .append('rect');
          container.append('rect').attr('class', 'chartArea');
          var g = container.append('g').attr('clip-path', 'url(#clip)')
          g.append('g').attr('class', 'items');
          container.append('g').attr('class', 'tracks');
          container.append('g').attr('class', 'axis');
          container.append('g').attr('class', 'brush');

          zoom = d3.behavior.zoom()
            .on('zoom', zoomed)
          brush = d3.svg.brush()
            .on('brush', brushing)
            .on('brushend', brushed)
        }
      }

      function update() {
        updateScale(dd);
        updateLayout();
        updateItems();
        updateTracks();
        updateAxis();
        updateBehavior();
      }

      // zoom, brush, etc.
      function updateBehavior() {
        if (brushable) {
          // enable brush and disable zoom
          zoom.on('zoom', null);
          brush.x(scaleX);
          container.select('.brush')
            .style('display', '')
            .attr('height', height)
            .call(brush);
          container.select('.brush')
            .selectAll('rect')
            .attr('y', 0)
            .attr('height', height)
        } else { // enable zoom and disable brush
          container.select('.brush').style('display', 'none');
          container.on("mousemove.brush", null).on('mousedown.brush', null).on('mouseup.brush', null);
          zoom.on('zoom', zoomed);
        }
      }

      function updateLayout() {
        container.attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')')

        container.select('.chartArea').attr('width', width).attr('height', height).call(zoom)

        container.select('clipPath rect').attr('width', width).attr('height', height);

        container.select('.axis').attr('transform', 'translate(0,' + innerH + ')')
        timelineLayout = d3.timelineLayout()
          .data(dd)
          .width(innerW)
          .height(innerH)
          .trackBy(trackBy)
          .scale(scaleX)
          .layout();
      }

      function updateScale(dd) {
        scaleX = zoom.x()

        if (!scaleX) {
          var min = d3.min(dd, function(d) { return d.start; })
          var max = d3.max(dd, function(d) { return d.end; })
          scaleX = d3.time.scale()
            .domain([min, max])
            .rangeRound([0, innerW])
            .nice(d3.time.week)


          zoom.x(scaleX);
        } else {
          scaleX.rangeRound([0, innerW])
        }

        axis = d3.svg.axis()
          .scale(scaleX)
          .orient('bottom')
      }

      function updateItems() {
        var item = container.select('.items').selectAll('.item')
          .data(timelineLayout.nodes())

        item.exit().remove()

        var itemEnter = item.enter().append('g').attr('class', 'item')
        itemEnter.append('rect')
        itemEnter.append('text')

        item.select('rect')
          .attr('x', function(d) { return d.x; })
          .attr('y', function(d) { return d.y; })
          .attr('width', function(d) { return d.width; })
          .attr('height', function(d) { return d.height; })
          .style('fill', 'steelblue')

        item.select('text')
          .attr('x', function(d) { return d.x; })
          .attr('y', function(d) { return d.y + itemHeight/2; })
          .attr('dy', '.35em')
          .attr('text-anchor', 'start')
          .text(function(d) { return d.label; })
      }

      function updateTracks() {
        var track = container.select('.tracks').selectAll('.track')
          .data(d3.values(timelineLayout.tracks()))

        track.exit().remove()

        var trackEnter = track.enter().append('g').attr('class', 'track')
        trackEnter.append('text')
        trackEnter.append('path')

        track.select('text')
          .attr('x', 0)
          .attr('y', function(d, i) { return d.start - d.height/2; })
          .attr('dy', '.35em')
          .attr('dx', '-5px')
          .attr('text-anchor', 'end')
          .text(function(d) { return d.label; })
          .style('fill', '#aaa');

        track.select('path')
          .attr('d', function(d) {
            var y = d.start - d.height - itemPadding/2;
            return 'M0,' + y + 'L' + innerW + ',' + y;
          })
          .style('stroke', '#ccc');
      }

      function updateAxis() {
        container.select('.axis').call(axis)
      }
    })
  }

  return d3.rebind(exports, dispatch, 'on');
};
