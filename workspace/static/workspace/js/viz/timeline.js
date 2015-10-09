wb.viz.timeline = function() {
  var margin = {top: 20, right: 30, bottom: 30, left: 50},
      outwidth = 960,
      outheight = 500,
      width,
      height
  ;
  var data = [];
  var tracks = [];
  var trackHeight, itemHeight, itemMinWidth = 100;
  var ratio = .8; // the ratio of the height of the main view

  var scaleX, scaleY;
  var svg, chart, xAxis, xBrush;
  var axis, zoom, brush;

  var dispatch = d3.dispatch('filter');

  var formatDate = d3.time.format("%m/%d/%Y-%H:%M:%S");

  function exports(selection) {
    width = outwidth - margin.left - margin.right;
    height = outheight - margin.top - margin.bottom;
    var min = d3.min(data, function(d) { return d.start; })
    var max = d3.max(data, function(d) { return d.end; })
    scaleX = d3.time.scale()
      .domain([min, max])
      .rangeRound([0, width])
      .nice(d3.time.week)
    ;
    scaleY = function(track) {
      return height - (track * trackHeight) - 20;
    };

    tracks = calculateTracks(data);
    trackHeight = Math.min(height / tracks.length, 20);
    itemHeight = trackHeight * .8;

    selection.each(function() {
      if (data.length === 0) {
        return d3.select(this).append('div')
          .attr('class', 'center-block placeholder')
          .attr('width', '200px')
          .style('text-align', 'center')
          .html('No events created yet');
      } 
      else d3.select(this).selectAll('.placeholder').remove();

      if (!svg)  {
        svg = d3.select(this).append('svg')
          .attr('width', outwidth)
          .attr('height', outheight);

        var g = svg.append('g')
          .attr("transform", "translate(" + margin.left + "," + margin.top +  ")");
          ;

        g.append('clipPath')
          .attr('id', 'clip')
          .append('rect')
          .attr('width', width)
          .attr('height', height);
        chart = g.append('g')
          .attr('class', 'chart')
          .attr('clip-path', 'url(#clip)');

        zoom = d3.behavior.zoom()
          .on('zoom', zoomed);

        chart.append('rect')
          .attr('class', 'chart-rect')
          .attr('width', width)
          .attr('height', height)
          .call(zoom);

        brush = d3.svg.brush()
          .on('brush', brushing)
          .on('brushend', brushed);

        xBrush = g.append('svg')
          .attr('class', 'x brush');

        xAxis = g.append("g")
          .attr("class", "axis")
          .attr("transform", "translate(0," + height  + ")")
      }

      zoom.x(scaleX);
      brush.x(scaleX);

      var items = chart.selectAll('svg')
        .data(data, function(d) {
          return d.lid; // local id
      });

      items.exit().remove();

      new_items = items.enter()
        .append('svg')
        .attr('x', function(d) { return scaleX(d.start); })
        .attr('y', function(d) { return scaleY(d.track); })
        .attr('width', function(d) {
          var width = scaleX(d.end) - scaleX(d.start);
          return Math.max(width, itemMinWidth);
        })
        .attr("height", itemHeight)
        .attr("class", function (d) { return d.instant ? "item instant" : "item interval"; })
        .on('mouseover', onMouseOver)
        .on('mouseout', onMouseOut);

      var intervals = new_items.filter('.interval')
      intervals.append("rect")
        .attr("width", "100%")
        .attr("height", "100%");
      intervals.append("text")
        .attr("class", "intervalLabel")
        .attr("x", 1)
        .attr("y", 10)
        .text(function (d) { return d.label; });

      var instants = new_items.filter(".instant");
      instants.append("circle")
        .attr("r", 5);
      instants.append("text")
        .attr("class", "instantLabel")
        .attr("x", 15)
        .attr("y", 10)
        .text(function (d) { return d.label; });

      items.selectAll('.item.instant circle')
        .attr("cx", itemHeight / 2)
        .attr("cy", itemHeight / 2);

      // x axis
      axis = d3.svg.axis()
        .scale(scaleX)
        .orient("bottom")
        // .tickSize(6, 0)

      xAxis.call(axis);

    });
  }

  exports.redraw = function() {
    tracks = calculateTracks(data);
    width = outwidth - margin.left - margin.right;
    height = outheight - margin.top - margin.bottom;
    trackHeight = Math.min(height / tracks.length, 20);
    itemHeight = trackHeight * .8;

    scaleX.rangeRound([0, width]);

    svg.attr('width', outwidth).attr('height', outheight);
    svg.select('#clip').select('rect').attr('width', width).attr('height', height);
    svg.select('.chart-rect').attr('width', width).attr('height', height);

    chart.selectAll('.item')
      .attr('x', function(d) { return scaleX(d.start); })
      .attr('y', function(d) { return scaleY(d.track); })
      .attr('width', function(d) {
        var width = scaleX(d.end) - scaleX(d.start);
        return Math.max(width, itemMinWidth)
      })
      .attr("height", itemHeight)
    chart.selectAll('.item.instant')
      .selectAll('circle')
      .attr("cx", itemHeight / 2)
      .attr("cy", itemHeight / 2)

    svg.select('.axis')
      .attr("transform", "translate(0," + height  + ")")
      .call(axis);

    return exports;
  };

  exports.filter = function(subset) {
    if (svg)
      svg.selectAll('.item')
        .attr('display', function(d) {
          if (subset.indexOf(d.id) > -1) return '';
          else return 'none';
        });
  };

  exports.setBrushMode = function() {
    zoom.on('zoom', null);
    brush.x(scaleX);
    xBrush.style('display', '').attr('height', height).call(brush);
    xBrush.selectAll('rect').attr('y', 0).attr('height', height);
  };

  exports.setNormalMode = function() {
    xBrush.style('display', 'none');
    svg.on("mousemove.brush", null).on('mousedown.brush', null).on('mouseup.brush', null);
    zoom.on('zoom', zoomed);
  }

  exports.height = function(_) {
    if (!arguments.length) return outheight;
    outheight = _;
    return exports;
  };

  exports.width = function(_) {
    if (!arguments.length) return outwidth;
    outwidth = _;
    return exports;
  };

  exports.data = function(_) {
    if (!arguments.length) return data;
    data = _;
    processData(data);
    return exports;
  };


  function zoomed() {
    exports.redraw();
  };

  function processData(data) {
    var instantOffset = 1000 * 60 * 60;

    function compareAscending(item1, item2) {
        // Every item must have two fields: 'start' and 'end'.
        var result = item1.start - item2.start;
        // earlier first
        if (result < 0) { return -1; }
        if (result > 0) { return 1; }
        // longer first
        result = item2.end - item1.end;
        if (result < 0) { return -1; }
        if (result > 0) { return 1; }
        return 0;
    }

    function compareDescending(item1, item2) {
        // Every item must have two fields: 'start' and 'end'.
        var result = item1.start - item2.start;
        // later first
        if (result < 0) { return 1; }
        if (result > 0) { return -1; }
        // shorter first
        result = item2.end - item1.end;
        if (result < 0) { return 1; }
        if (result > 0) { return -1; }
        return 0;
    }

    function sortData(sortOrder) {
      if (sortOrder === "ascending")
          data.sort(compareAscending);
      else
          data.sort(compareDescending);
    }

    data.forEach(function (item){
        item.start = parseDate(item.start);
        if (item.end) {
            item.end = parseDate(item.end);
            item.instant = false;
        } else {
            item.end = new Date(item.start.getTime() + instantOffset);
            item.instant = true;
        }
    });
    sortData('descending');
  }

  function calculateTracks(items, timeOrder) {
    var tracks = [];
    var i, track;

    timeOrder = timeOrder || "backward";   // "forward", "backward"

    function sortBackward() {
      // older items end deeper
      items.forEach(function (item) {
        for (i = 0, track = 0; i < tracks.length; i++, track++) {
          if (scaleX(item.end) + 100 < tracks[i]) { break; }
        }
        item.track = track;
        tracks[track] = scaleX(item.start);
      });
    }
    function sortForward() {
      // younger items end deeper
      items.forEach(function (item) {
        for (i = 0, track = 0; i < tracks.length; i++, track++) {
          if (scaleX(item.start) > tracks[i]) { break; }
        }
        item.track = track;
        tracks[track] = scaleX(item.end);
      });
    }

    if (timeOrder === "forward")
      sortForward();
    else
      sortBackward();

    return tracks;
  }


  function parseDate(d) {
    if (typeof d === 'string') return formatDate.parse(d);
    return d;
  }


  function onMouseOver(d) {
    var pos = {top: d3.event.pageY, left: d3.event.pageX};
    showNodeInfoTimer = setTimeout(function() {
      var entity = wb.store.items.entities[d.id];
      wb.viewer.data(entity, 'entity').show(pos, 'timeline');
    }, 500);
  }

  function onMouseOut(d) {
    clearTimeout(showNodeInfoTimer);
    setTimeout(function() {
      if (!$('.viewer:hover').length) {
        wb.viewer.hide();
      }
    }, 300);
  }

  function brushing() {
    var ext = brush.extent()
    svg.selectAll('.item').classed('active', function(d) {
      return (d.start <= ext[1]  && d.start >= ext[0])
        || (d.end >= ext[0] && d.end <= ext[1])
        || (d.start <= ext[0] && d.end >= ext[1]);
    });
  }

  function brushed() {
    var shelf_by = wb.store.shelf_by.entities.slice();
    data.forEach(function(d) {
      var i = shelf_by.indexOf(d.id);
      if (i > -1) shelf_by.splice(i, 1);
    });
    svg.selectAll('.item.active').each(function(d) {
      shelf_by.push(d.id);
    });
    wb.store.shelf_by.entities = shelf_by;
    $('.filter-div .filter-item').filter(function(i, item) {
      return $(item).find('a').data('item') === 'event';
    }).remove();
    if (brush.empty()) {
      wb.log.log({
        operation: 'defiltered',
        item: 'events',
        tool: 'timeline',
        public: false
      });
    } else {
      var selected_events = [];
      shelf_by.forEach(function(d) {
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
    dispatch.filter();
  }


  return d3.rebind(exports, dispatch, 'on');
};

