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

  var scaleX, scaleY;
  var svg;
  var axis;

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
      svg = d3.select(this).append('svg')
        .attr('width', outwidth)
        .attr('height', outheight);
      g = svg.append('g')
        .attr("transform", "translate(" + margin.left + "," + margin.top +  ")");
        ;
      g.append('clipPath')
        .attr('id', 'clip')
        .append('rect')
        .attr('width', width)
        .attr('height', height);
      var chart = g.append('g')
        .attr('class', 'chart')
        .attr('clip-path', 'url(#clip)');

      var zoom = d3.behavior.zoom()
        .x(scaleX)
        .on('zoom', zoomed);

      chart.append('rect')
        .attr('class', 'chart-rect')
        .attr('width', width)
        .attr('height', height)
        .call(zoom);

      chart.selectAll('g')
        .data(data)
        .enter()
        .append('svg')
        .attr('x', function(d) { return scaleX(d.start); })
        .attr('y', function(d) { return scaleY(d.track); })
        .attr('width', function(d) {
          var width = scaleX(d.end) - scaleX(d.start);
          return width < 100 ? 100 : width;
        })
        .attr("height", itemHeight)
        .attr("class", function (d) { return d.instant ? "item instant" : "item interval"; });

      var intervals = chart.selectAll('.interval')
      intervals.append("rect")
        .attr("width", "100%")
        .attr("height", "100%");
      intervals.append("text")
        .attr("class", "intervalLabel")
        .attr("x", 1)
        .attr("y", 10)
        .text(function (d) { return d.label; });

      var instants = chart.selectAll(".instant");
      instants.append("circle")
        .attr("cx", itemHeight / 2)
        .attr("cy", itemHeight / 2)
        .attr("r", 5);
      instants.append("text")
        .attr("class", "instantLabel")
        .attr("x", 15)
        .attr("y", 10)
        .text(function (d) { return d.label; });

      // x axis
      axis = d3.svg.axis()
        .scale(scaleX)
        .orient("bottom")
        // .tickSize(6, 0)

      var xAxis = g.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + height  + ")")
        .call(axis);

      exports.redraw();
    });
  }

  exports.redraw = function() {
    width = outwidth - margin.left - margin.right;
    height = outheight - margin.top - margin.bottom;
    trackHeight = Math.min(height / tracks.length, 20);
    itemHeight = trackHeight * .8;

    scaleX.rangeRound([0, width]);

    svg.attr('width', outwidth).attr('height', outheight);
    svg.select('#clip').select('rect').attr('width', width).attr('height', height);
    svg.select('.chart-rect').attr('width', width).attr('height', height);

    svg.selectAll('.item')
      .attr("x", function (d) { return scaleX(d.start);})
      .attr("y", function (d) { return scaleY(d.track);})
      .attr("width", function (d) {
          var width = scaleX(d.end) - scaleX(d.start);
          return Math.max(width, itemMinWidth);
      })
      .attr("height", itemHeight)
      .selectAll('circle')
      .attr("cx", itemHeight / 2)
      .attr("cy", itemHeight / 2);


    svg.select('.axis')
      .attr("transform", "translate(0," + height  + ")")
      .call(axis);

    return exports;
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
    console.log('zoom');
    tracks = calculateTracks(data);
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
        if (item.end == "") {
            item.end = new Date(item.start.getTime() + instantOffset);
            item.instant = true;
        } else {
            item.end = parseDate(item.end);
            item.instant = false;
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
    var format = d3.time.format("%m/%d/%Y-%H:%M:%S");
    return format.parse(d);
  }


  return exports;
};

