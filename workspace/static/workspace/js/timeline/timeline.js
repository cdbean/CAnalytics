wb.viz.timeline = function() {
  var margin = {top: 20, right: 20, bottom: 20, left: 80},
      width = 960,
      height = 500 ;
  var innerW = width - margin.left - margin.right,
      innerH = height - margin.top - margin.bottom;
  var tracks = [],
      itemPadding = 5,
      itemMinHeight = 15,
      itemWidth = 50;
  var axis;
  var timelineLayout;
  var clipId = wb.utility.uuid();
  var data;

  var showLabel = true;

  var trackBy = '';
  var brushable = false;
  var brushExtent = null; // record brush extent before scale changes
  var zoom = null, brush = null;

  var container = null;

  var scaleY;

  var dispatch = d3.dispatch('filter', 'zoom', 'elaborate', 'delaborate', 'zoomstart');

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

  exports.itemMinHeight = function(_) {
    if (!arguments.length) return itemMinHeight;
    itemMinHeight = _;
    return exports
  }

  exports.itemWidth = function(_) {
    if (!arguments.length) return itemWidth;
    itemWidth = _;
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
      if (scaleY) {
        return scaleY.domain();
      }
      else {
        return
      }
    }
    if (scaleY) {
      scaleY.domain(_);
    }
    if (zoom) zoom.x(scaleY)
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
    brushExtent = extent;
    var domain = scaleY.domain()
    // set extent within the range of domain
    extent[0] = Math.max(extent[0], domain[0]);
    extent[1] = Math.min(extent[1], domain[1]);
    updateBehavior();
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
    container.select('.brush').call(brush)
  }

  // zoom, brush, etc.
  function updateBehavior() {
    if (brushable) {
      // enable brush and disable zoom
      zoom.on('zoom', null).on('zoomstart', null);
      brush.y(scaleY);
      if (brushExtent) brush.extent(brushExtent);

      container.select('.brush')
        .style('display', '')
        .attr('width', innerW)
        .call(brush);
      container.select('.brush')
        .selectAll('rect')
        .attr('x', 0)
        .attr('width', innerW)
    } else { // enable zoom and disable brush
      container.select('.brush').style('display', 'none');
      container.on("mousemove.brush", null).on('mousedown.brush', null).on('mouseup.brush', null);
      zoom.on('zoom', zoomed)
        .on('zoomstart', zoomstart);
    }
  }

  function zoomstart() {
    dispatch.zoomstart();
  }

  function zoomed() {
    updateLayout()
    updateItems()
    updateTracks()
    updateAxis()
    dispatch.zoom(zoom.y().domain())
  }


  function updateLayout() {
    container.attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')')

    container.select('.chartArea').attr('width', innerW).attr('height', innerH).call(zoom)

    container.select('clipPath rect').attr('width', innerW).attr('height', innerH);

    timelineLayout = wb.viz.timelineLayout()
      .data(data)
      .width(innerW)
      .height(innerH)
      .trackBy(trackBy)
      .scale(scaleY)
      .nodeWidth(itemWidth)
      .nodeMinHeight(itemMinHeight)
      // .nodeMaxWidth(itemMaxWidth)
      .nodePadding(itemPadding)
      .layout();
  }

  function updateScale() {
    // keep zoom scale domain
    scaleY = zoom.y();

    if (!scaleY) { // if scale has not been defined
      var min = d3.min(data, function(d) { return d.start; })
      var max = d3.max(data, function(d) { return d.end; })
      max = max || min; // max might be undefined if events are all instant events
      scaleY = d3.time.scale()
        .domain([min, max])
        .rangeRound([0, innerH])
        .nice(d3.time.week)
      zoom.y(scaleY);
    } else {
      if (brush) {
        brushExtent = brush.extent();
      }
      scaleY.rangeRound([0, innerH])
    }

    axis = d3.svg.axis()
      .scale(scaleY)
      .orient('left')
  }

  function updateItems() {
    var item = container.select('.items').selectAll('.item')
      .data(timelineLayout.nodes());

    item.exit().transition().duration(1000).style('opacity', 0).remove();

    var itemEnter = item.enter().append('g').attr('class', 'item')
      .on('mouseover', function(d) {
        var pos = {top: d3.event.pageY, left: d3.event.pageX};
        window.mouseoverTimeout = setTimeout(function() {
          dispatch.elaborate(d, pos);
        }, 500)
      })
      .on('mouseout', function(d) {
        if (window.mouseoverTimeout) clearTimeout(window.mouseoverTimeout)
        setTimeout(function() {
          if (!$('.viewer:hover').length > 0) dispatch.delaborate(d);
        }, 300);
      });

    itemEnter.style('opacity', 0)
      .transition()
      .duration(1000)
      .style('opacity', 1);

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
        .attr('y', function(d) { return d.y; })
        .attr('dy', '1em')
        .attr('text-anchor', 'start')
        .text(function(d) { return d.label; })
        .call(wrap); // cut text to fit in rect
    }

    // thanks to https://bl.ocks.org/mbostock/7555321
    function wrap(text) {
      text.each(function(d) {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            width = d.width,
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = text.text(null).append("tspan").attr("y", y).attr("dy", dy + "em");
        while (word = words.pop()) {
          line.push(word);
          tspan.text(line.join(" "));
          if (tspan.node().getComputedTextLength() > width) {
            line.pop();
            tspan.text(line.join(" "));
            line = [word];
            tspan = text.append("tspan").attr('x', d.x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
          }
        }
      });
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
      .attr('x', function(d, i) { return d.start + d.width/2; })
      .attr('y', 0)
      .attr('dy', '.35em')
      .attr('text-anchor', 'middle')
      .text(function(d) {
        return showLabel ? d.label : d.label[0];
      })
      .style('fill', '#aaa');

    track.select('path')
      .attr('d', function(d, i) {
        if (i < trackNum - 1) {
          var x = d.start + d.width - itemPadding/2;
          return 'M' + x + ',0L' + x + ',' + innerH;
        } else {
          return null;
        }
      })
      .style('stroke', '#ccc');
  }

  function updateAxis() {
    container.select('.axis').call(axis)
  }

  function brushing() {
    var ext = brush.extent();
    container.selectAll('.item').classed('selected', function(d) {
      return (d.start <= ext[1]  && d.start >= ext[0])
        || (d.end >= ext[0] && d.end <= ext[1])
        || (d.start <= ext[0] && d.end >= ext[1]);
    });
  }

  function brushed() {
    var filter = [];
    container.selectAll('.item.selected').each(function(d) {
      filter.push(d);
    });
    var ext = brush.empty() ? null : brush.extent();
    return dispatch.filter(filter, ext);
  }

  function exports(selection) {
    selection.each(function(dd) {
      innerW = width - margin.left - margin.right;
      innerH = height - margin.top - margin.bottom;
      data = dd;

      init.apply(this);
      update.apply(this);

      function init() {
        if (!container) {
          container = d3.select(this).append('g').attr('class', 'timelineVis');
          container.append('clipPath').attr('id', 'clip-' + clipId)
            .append('rect');
          container.append('rect').attr('class', 'chartArea');
          var g = container.append('g').attr('clip-path', 'url(#clip-' + clipId + ')');
          g.append('g').attr('class', 'items');
          container.append('g').attr('class', 'tracks');
          container.append('g').attr('class', 'axis');
          container.append('g').attr('class', 'brush');

          zoom = d3.behavior.zoom()
            .on('zoom', zoomed)
            .on('zoomstart', zoomstart);
          brush = d3.svg.brush()
            .on('brush', brushing)
            .on('brushend', brushed);
        }
      }

      function update() {
        updateScale();
        updateLayout();
        updateItems();
        updateTracks();
        updateAxis();
        updateBehavior();
      }
    });
  }

  return d3.rebind(exports, dispatch, 'on');
};
