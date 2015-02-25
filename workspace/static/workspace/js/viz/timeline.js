// adapted from http://bl.ocks.org/rengel-de/5603464
//
wb.viz.timeline = function (domElement, width, height) {

    //--------------------------------------------------------------------------
    //
    // chart
    //

    // chart geometry
    this.width = width || 960;
    this.height = height || 500;
    var margin = {top: 20, right: 20, bottom: 40, left: 20};
    width = this.width - margin.left - margin.right;
    height = this.height - margin.top - margin.bottom;

    // global timeline variables
    var timeline = {},   // The timeline
        data = {},       // Container for the data
        components = [], // All the components of the timeline for redrawing
        bandGap = 25,    // Arbitray gap between to consecutive bands
        band = {},      // Registry for all the bands in the timeline
        bandY = 0,       // Y-Position of the next band
        bandNum = 0,     // Count of bands for ids
        tracks = [];

    // Create svg element
    var svg = d3.select(domElement).append("svg")
        .attr("class", "svg")
        .attr("id", "svg")
        .attr("width", this.width)
        .attr("height", this.height)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top +  ")");

    svg.append("clipPath")
        .attr("id", "chart-area")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    var chart = svg.append("g")
            .attr("class", "chart")
            .attr("clip-path", "url(#chart-area)" );

    var tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("visibility", "visible");

    //--------------------------------------------------------------------------
    //
    // data
    //

    timeline.data = function(items) {

        var today = new Date(),
            tracks = [],
            instantOffset = 1000 * 60 * 60;

        data.items = items;

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
              data.items.sort(compareAscending);
          else
              data.items.sort(compareDescending);
        }

        data.items.forEach(function (item){
            item.start = parseDate(item.start);
            if (item.end == "") {
                //console.log("1 item.start: " + item.start);
                //console.log("2 item.end: " + item.end);
                item.end = new Date(item.start.getTime() + instantOffset);
                //console.log("3 item.end: " + item.end);
                item.instant = true;
            } else {
                //console.log("4 item.end: " + item.end);
                item.end = parseDate(item.end);
                item.instant = false;
            }
        });

        sortData('descending');
        data.minDate = d3.min(data.items, function (d) { return d.start; });
        data.maxDate = d3.max(data.items, function (d) { return d.end; });

        return timeline;
    };

    //----------------------------------------------------------------------
    //
    // band
    //

    timeline.band = function () {

        band.id = "band" + bandNum;
        band.x = 0;
        band.y = bandY;
        band.w = width;
        band.h = height - margin.top;
        band.trackOffset = 4;
        // Prevent tracks from getting too high
        band.trackHeight = Math.min((band.h - band.trackOffset) / tracks.length, 20);
        band.itemHeight = band.trackHeight * 0.8,
        band.parts = [],
        band.instantWidth = 100; // arbitray value

        band.xScale = d3.time.scale()
            .domain([data.minDate, data.maxDate])
            .range([0, band.w]);

        band.yScale = function (track) {
            return band.h - band.itemHeight - (band.trackOffset + track * band.trackHeight);
        };


        band.g = chart.append("g")
            .attr("id", band.id)
            .attr("transform", "translate(0," + band.y +  ")");

        var zoom = d3.behavior.zoom()
          .x(band.xScale)
          .on('zoom', zoomed);

        band.g.append("rect")
            .attr("class", "band")
            .attr("width", band.w)
            .attr("height", band.h)
            .call(zoom);

        // Items
        calculateTracks(data.items);
        var items = band.g.selectAll("g")
            .data(data.items)
            .enter().append("svg")
            .attr("y", function (d) { return band.yScale(d.track); })
            .attr("height", band.itemHeight)
            .attr("class", function (d) { return d.instant ? "part instant" : "part interval";});

        var intervals = d3.select("#band" + bandNum).selectAll(".interval");
        intervals.append("rect")
            .attr("width", "100%")
            .attr("height", "100%");
        intervals.append("text")
            .attr("class", "intervalLabel")
            .attr("x", 1)
            .attr("y", 10)
            .text(function (d) { return d.label; });

        var instants = d3.select("#band" + bandNum).selectAll(".instant");
        instants.append("circle")
            .attr("cx", band.itemHeight / 2)
            .attr("cy", band.itemHeight / 2)
            .attr("r", 5);
        instants.append("text")
            .attr("class", "instantLabel")
            .attr("x", 15)
            .attr("y", 10)
            .text(function (d) { return d.label; });

        band.addActions = function(actions) {
            // actions - array: [[trigger, function], ...]
            actions.forEach(function (action) {
                items.on(action[0], action[1]);
            })
        };

        band.redraw = function () {
            items
                .attr("x", function (d) { return band.xScale(d.start);})
                .attr("y", function (d) { return band.yScale(d.track);})
                .attr("width", function (d) {
                    var width = band.xScale(d.end) - band.xScale(d.start);
                    if (width < 100) width = 100;
                    return width;
                });
            band.parts.forEach(function(part) { part.redraw(); })
        };

        components.push(band);
        // Adjust values for next band
        bandY += band.h + bandGap;
        bandNum += 1;

        return timeline;
    };

    //----------------------------------------------------------------------
    //
    // labels
    //

    timeline.labels = function () {

        var labelWidth = 46,
            labelHeight = 20,
            labelTop = band.y + band.h - 10,
            y = band.y + band.h + 1,
            yText = 15;

        var labelDefs = [
                ["start", "bandMinMaxLabel", 0, 4,
                    function(min, max) { return toYear(min); },
                    "Start of the selected interval", band.x + 30, labelTop],
                ["end", "bandMinMaxLabel", band.w - labelWidth, band.w - 4,
                    function(min, max) { return toYear(max); },
                    "End of the selected interval", band.x + band.w - 152, labelTop],
            //     ["middle", "bandMidLabel", (band.w - labelWidth) / 2, band.w / 2,
            //         function(min, max) { return max.getUTCFullYear() - min.getUTCFullYear(); },
            //         "Length of the selected interval", band.x + band.w / 2 - 75, labelTop]
            ];

        var bandLabels = chart.append("g")
            .attr("class",  "timeline-label")
            .attr("transform", "translate(0," + (band.y + band.h + 1) +  ")")
            .selectAll(".timeline-label")
            .data(labelDefs)
            .enter().append("g")
            .on("mouseover", function(d) {
                tooltip.html(d[5])
                    .style("top", d[7] + "px")
                    .style("left", d[6] + "px")
                    .style("visibility", "visible");
                })
            .on("mouseout", function(){
                tooltip.style("visibility", "hidden");
            });

        bandLabels.append("rect")
            .attr("class", "bandLabel")
            .attr("x", function(d) { return d[2];})
            .attr("width", labelWidth)
            .attr("height", labelHeight)
            .style("opacity", 1);

        var labels = bandLabels.append("text")
            .attr("class", function(d) { return d[1];})
            .attr("id", function(d) { return d[0];})
            .attr("x", function(d) { return d[3];})
            .attr("y", yText)
            .attr("text-anchor", function(d) { return d[0];});

        labels.redraw = function () {
            var min = band.xScale.domain()[0],
                max = band.xScale.domain()[1];

            labels.text(function (d) { return d[4](min, max); })
        };

        band.parts.push(labels);
        components.push(labels);

        return timeline;
    };

    //----------------------------------------------------------------------
    //
    // tooltips
    //

    timeline.tooltips = function () {

        band.addActions([
            // trigger, function
            ["mouseover", showTooltip],
            ["mouseout", hideTooltip]
        ]);

        function getHtml(element, d) {
            var html;
            if (/interval/.test(element.attr("class"))) {
                html = d.label + "<br>" + d.start + " - " + d.end;
            } else {
                html = d.label + "<br>" + d.start;
            }
            return html;
        }

        function showTooltip (d) {

            var x = d3.event.pageX < band.x + band.w / 2
                    ? d3.event.pageX + 10
                    : d3.event.pageX - 110,
                y = d3.event.pageY < band.y + band.h / 2
                    ? d3.event.pageY + 30
                    : d3.event.pageY - 30;

            tooltip
                .html(getHtml(d3.select(this), d))
                .style("top", y + "px")
                .style("left", x + "px")
                .style("visibility", "visible");
        }

        function hideTooltip () {
            tooltip.style("visibility", "hidden");
        }

        return timeline;
    };

    //----------------------------------------------------------------------
    //
    // xAxis
    //

    timeline.xAxis = function () {

        var axis = d3.svg.axis()
            .scale(band.xScale)
            .orient("bottom")
            .tickSize(6, 0)
            // .tickFormat(function (d) { return d; });

        var zoom = d3.behavior.zoom()
          .x(band.xScale)
          .on('zoom', zoomed);

        var xAxis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0," + (band.y + band.h)  + ")")
            .call(zoom);

        xAxis.redraw = function () {
            xAxis.call(axis);
        };

        band.parts.push(xAxis); // for brush.redraw
        components.push(xAxis); // for timeline.redraw

        return timeline;
    };

    //----------------------------------------------------------------------
    //
    // brush
    //

    timeline.brush = function (bandName, targetNames) {

        var brush = d3.svg.brush()
            .x(band.xScale.range([0, band.w]))
            .on("brush", function() {
                var domain = brush.empty()
                    ? band.xScale.domain()
                    : brush.extent();
                // targetNames.forEach(function(d) {
                //     bands[d].xScale.domain(domain);
                //     bands[d].redraw();
                // });
            });

        var xBrush = band.g.append("svg")
            .attr("class", "x brush")
            .call(brush);

        xBrush.selectAll("rect")
            .attr("y", 4)
            .attr("height", band.h - 4);

        return timeline;
    };

    //----------------------------------------------------------------------
    //
    // redraw
    //

    timeline.redraw = function () {
        components.forEach(function (component) {
            component.redraw();
        })
    };


    timeline.init = function() {
      timeline.band()
        .xAxis()
        .tooltips()
        .labels()
      ;
    };

    //--------------------------------------------------------------------------
    //
    // Utility functions
    //

    function zoomed() {
      calculateTracks(data.items)
      timeline.redraw();
    }

   function calculateTracks(items, timeOrder) {
        var i, track;

        timeOrder = timeOrder || "backward";   // "forward", "backward"
        tracks = [];

        function sortBackward() {
            // older items end deeper
            items.forEach(function (item) {
                for (i = 0, track = 0; i < tracks.length; i++, track++) {
                    if (band.xScale(item.end) + 100 < tracks[i]) { break; }
                }
                item.track = track;
                tracks[track] = band.xScale(item.start);
            });
        }
        function sortForward() {
            // younger items end deeper
            items.forEach(function (item) {
                for (i = 0, track = 0; i < tracks.length; i++, track++) {
                    if (item.start > tracks[i]) { break; }
                }
                item.track = track;
                tracks[track] = item.end;
            });
        }

        if (timeOrder === "forward")
            sortForward();
        else
            sortBackward();
    }


    function parseDate(dateString) {
        // 'dateString' must either conform to the ISO date format YYYY-MM-DD
        // or be a full year without month and day.
        // AD years may not contain letters, only digits '0'-'9'!
        // Invalid AD years: '10 AD', '1234 AD', '500 CE', '300 n.Chr.'
        // Valid AD years: '1', '99', '2013'
        // BC years must contain letters or negative numbers!
        // Valid BC years: '1 BC', '-1', '12 BCE', '10 v.Chr.', '-384'
        // A dateString of '0' will be converted to '1 BC'.
        // Because JavaScript can't define AD years between 0..99,
        // these years require a special treatment.

        var format = d3.time.format("%m/%d/%Y-%H:%M:%S"),
            date;

        date = format.parse(dateString);
        if (date !== null) return date;

        return date;
    }

    function toYear(date) {
        // bcString is the prefix or postfix for BC dates.
        // If bcString starts with '-' (minus),
        // if will be placed in front of the year.
        var year = date.getUTCFullYear();
        if (year > 0) return year.toString();
    }

    return timeline;
};
