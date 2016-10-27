wb.viz.timeline = function() {
  var margin = {top: 20, right: 30, bottom: 30, left: 80},
      width = 960,
      height = 500
  ;
  var tracks = [],
      itemPadding = 5,
      itemHeight = 20,
      itemMinWidth = 10,
      itemMaxWidth = 100;

  var showLabel = true;

  var trackBy = '';
  var brushable = false;
  var zoom = null, brush = null;

  var container = null;

  var scaleX;

  var dispatch = d3.dispatch('filter', 'zoom', 'elaborate', 'delaborate');

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

  exports.itemMinWidth = function(_) {
    if (!arguments.length) return itemMinWidth;
    itemMinWidth = _;
    return exports
  }

  exports.itemMaxWidth = function(_) {
    if (!arguments.length) return itemMaxWidth;
    itemMaxWidth = _;
    return exports
  }

  exports.itemHeight = function(_) {
    if (!arguments.length) return itemHeight;
    itemHeight = _;
    return exports
  }

  exports.itemPadding = function(_) {
    if (!arguments.length) return itemPadding;
    itemPadding = _;
    return exports
  }

  exports.showLabel = function(_) {
    if (!arguments.length) return showLabel;
    showLabel = _;
    return exports
  }

  exports.domain = function(_) {
    if (!arguments.length) {
      if (scaleX) {
        return scaleX.domain();
      }
      else {
        return
      }
    }
    if (scaleX) {
      scaleX.domain(_);
    }
    if (zoom) zoom.x(scaleX)
    return exports
  }

  exports.trackBy = function(by) {
    trackBy = by;
    return exports;
  }

  exports.brushable = function(_) {
    brushable = _;
    return exports;
  }

  exports.setBrush = function(extent) {
    if (!brush) return;
    var domain = scaleX.domain()
    if (extent[0] <= domain[0] || extent[1] > domain[1]) {
      brush.clear()
    } else {
      brush.extent(extent);
    }
    container.select('.brush').transition().call(brush);
    // fire brushstart, brushmove, brushend events
    // brush.event(container.select(".brush"))
  }

  exports.filter = function(subset) {
    if (container)
      container.selectAll('.item')
        .attr('display', function(d) {
          if (subset.indexOf(d.id) > -1) return '';
          else return 'none';
        });
  }

  exports.defilter = function() {
    if (!container) return;
    brush.clear();
    container.select('.brush').transition().call(brush)
  }

  function exports(selection) {
    selection.each(function(dd) {
      var innerW = width - margin.left - margin.right,
          innerH = height - margin.top - margin.bottom;
      var axis;
      var timelineLayout;
      var clipId = wb.utility.uuid();


      function zoomed() {
        updateLayout()
        updateItems()
        updateTracks()
        updateAxis()
        dispatch.zoom(zoom.x().domain())
      }

      function brushing() {
        var ext = brush.extent();
        container.selectAll('.item').classed('active', function(d) {
          return (d.start <= ext[1]  && d.start >= ext[0])
            || (d.end >= ext[0] && d.end <= ext[1])
            || (d.start <= ext[0] && d.end >= ext[1]);
        });
      }

      function brushed() {
        var filter = [];
        container.selectAll('.item.active').each(function(d) {
          filter.push(d);
        });
        var ext = brush.empty() ? null : brush.extent();
        return dispatch.filter(filter, ext);
      }

      init.apply(this);
      update.apply(this);

      function init() {
        if (!container) {
          container = d3.select(this).append('g').attr('class', 'timelineVis')
          container.append('clipPath').attr('id', 'clip-' + clipId)
            .append('rect');
          container.append('rect').attr('class', 'chartArea');
          var g = container.append('g').attr('clip-path', 'url(#clip-' + clipId + ')')
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
          .nodeHeight(itemHeight)
          .nodeMinWidth(itemMinWidth)
          .nodeMaxWidth(itemMaxWidth)
          .nodePadding(itemPadding)
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
          .on('mouseover', function(d) {
            var pos = {top: d3.event.pageY, left: d3.event.pageX};
            window.mouseoverTimeout = setTimeout(function() {
              dispatch.elaborate(d, pos);
            }, 500)
          })
          .on('mouseout', function(d) {
            if (window.mouseoverTimeout) clearTimeout(window.mouseoverTimeout)
            dispatch.delaborate(d);
          });
        itemEnter.append('rect');
        if (showLabel) {
          itemEnter.append('text');
        }

        item.select('rect')
          .attr('x', function(d) { return d.x; })
          .attr('y', function(d) { return d.y; })
          .attr('width', function(d) { return d.width; })
          .attr('height', function(d) { return d.height; })
          .style('fill', 'steelblue')

        if (showLabel) {
          item.select('text')
            .attr('x', function(d) { return d.x; })
            .attr('y', function(d) { return d.y + itemHeight/2; })
            .attr('dy', '.35em')
            .attr('text-anchor', 'start')
            .text(function(d) { return d.label; })
            .each(wrap); // cut text to fit in rect
        }

        function wrap(d) {
          var self = d3.select(this),
              textLength = self.node().getBBox().width,
              text = self.text(),
              width = d.width,
              limitLength = width / (textLength / text.length);

          text = text.substring(0, limitLength);
          self.text(text)
        }
      }

      function updateTracks() {
        var dd = d3.values(timelineLayout.tracks());
        var trackNum = dd.length;
        var track = container.select('.tracks').selectAll('.track')
          .data(dd)

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
          .attr('d', function(d, i) {
            if (i < trackNum - 1) {
              var y = d.start - d.height - itemPadding/2;
              return 'M0,' + y + 'L' + innerW + ',' + y;
            } else {
              return null;
            }
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
