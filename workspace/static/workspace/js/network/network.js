wb.viz.network = function() {
  var margin = { left: 5, right: 5, top: 5, bottom: 5 };
  var width = 960, height = 500;

  var zoom = null, brush = null, drag = null;

  var container = null;

  var networkLayout;
  var uuid = wb.utility.uuid();

  var dispatch = d3.dispatch('filter', 'elaborate', 'delaborate', 'drawn');

  exports.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return exports;
  }

  exports.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return exports;
  }

  exports.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return exports;
  }

  // controller
  exports.doZoom = function() {

  }

  exports.doFilter = function() {

  }

  exports.doDraw = function() {

  }
  // end controller

  // API
  exports.displaySome = function(data) {
    if (!container) return;

    container.selectAll('.node').attr('display', function(d) {
      return data.nodes.indexOf(d.meta.id) < 0 ? 'none': '';
    });
    container.selectAll('.link').attr('display', function(d) {
      return data.links.indexOf(d.meta.id) < 0 ? 'none': '';
    });
  }

  exports.displaySomeByType = function(types) {
    if (!container) return;

    container.selectAll('.node').attr('display', function(d) {
      return types.indexOf(d.primary.entity_type) < 0 ? 'none' : '';
    });

    container.selectall('.link').attr('display', function(d) {
      return (types.indexOf(d.source.primary.entity_type) < 0
        || types.indexOf(d.target.primary.entity_type) < 0)
        ? 'none' : '';
    });
  }

  function exports(selection) {
    selection.each(function(dd) {
      var innerW = width - margin.left - margin.right,
          innerH = height - margin.top - margin.bottom;

      init.apply(this);
      update.apply(this);

      function init() {
        if (container) return;

        container = d3.select(this).append('g').attr('class', 'networkVis');
        container.append('clipPath').attr('id', 'clip-' + uuid).append('rect');
        // react area for zooming
        container.append('rect').attr('class', 'chartArea');
        var chart = container.append('g')
          // .attr('clip-path', 'url(#clip-' + uuid + ')')
          .attr('class', 'chart');
        chart.append('g').attr('class', 'links');
        chart.append('g').attr('class', 'nodes');
        chart.append('g').attr('class', 'brush');

        // add svg meta, e.g. link arrow, image
        container.selectAll('defs')
          .data(wb.store.static.entity_types)
          .enter()
          .append('svg:defs')
          .append('svg:pattern')
          .attr('id', function(d) { return 'img-' + d + '-' + uuid; })
          .attr('patternUnits', 'userSpaceOnUse')
          .attr('x', 12)
          .attr('y', 12)
          .attr('height', 24)
          .attr('width', 24)
          .append('image')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', 24)
          .attr('height', 24)
          .attr('xlink:href', function(d) { return GLOBAL_URL.static + 'workspace/img/entity/' + d + '.svg' });

        // define arrow markers for links
        container.append('svg:defs').append('svg:marker')
            .attr('id', 'end-arrow-' + uuid)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 6)
            .attr('markerWidth', 5)
            .attr('markerHeight', 5)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('class', 'linkarrow');

        container.append('svg:defs').append('svg:marker')
            .attr('id', 'start-arrow-' + uuid)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 4)
            .attr('markerWidth', 5)
            .attr('markerHeight', 5)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M10,-5L0,0L10,5')
            .attr('class', 'linkarrow');

        zoom = d3.behavior.zoom()
          .on('zoom', zoomed);
        brush = d3.svg.brush()
          .on('brush', brushing)
          .on('brushend', brushed)
        drag = d3.behavior.drag()
          .on('dragstart', dragstart)
          .on('drag', dragged)
          .on('dragend', dragend);
      }

      function zoomed() {
        container.select('.chart').attr("transform", "translate("
          + d3.event.translate + ")"
          + " scale(" + d3.event.scale + ")");
      }

      function brushing() {

      }

      function brushed() {

      }

      function dragstart() {

      }

      function dragged() {

      }

      function dragend() {

      }

      function update() {
        updateData();
        updateLayout();
        updateLinks();
        updateNodes();
        updateBehavior();
      }

      function updateData() {
        // compare force data (if existed) to current data
        // and copy force data attributes (x, y, px, py) to current data if matched
        if (!networkLayout) return;

        var nodes = networkLayout.nodes();
        for (var i = 0, len = dd.nodes.length; i < len; i++) {
          for (var j = 0; j < nodes.length; j++) {
            if (nodes[j].meta.id === dd.nodes[i].meta.id) {
              dd.nodes[i].x = nodes[j].x;
              dd.nodes[i].y = nodes[j].y;
              dd.nodes[i].px = nodes[j].px;
              dd.nodes[i].py = nodes[j].py;
              dd.nodes[i].fixed = true;
              nodes.splice(j, 1);
              break;
            }
          }
        }
      }

      function updateLayout() {
        container.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        container.select('.chartArea').attr('width', innerW).attr('height', innerH);
        container.select('clipPath rect').attr('width', innerW).attr('height', innerH);

        networkLayout = d3.layout.force()
          .nodes(dd.nodes)
          .links(dd.links)
          .charge(-400)
          .linkDistance(120)
          .size([innerW, innerH])
          .on('tick', tick);

        networkLayout.start();

        function tick() {
          container.selectAll('.link path').attr('d', function(d) {
            var deltaX = d.target.x - d.source.x,
                deltaY = d.target.y - d.source.y,
                dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
                normX = deltaX / dist,
                normY = deltaY / dist,
                dr = dist / d.index, // the method is arbitary
                sourcePadding = d.left ? 17 : 12,
                targetPadding = d.right ? 17 : 12,
                sourceX = d.source.x + (sourcePadding * normX),
                sourceY = d.source.y + (sourcePadding * normY),
                targetX = d.target.x - (targetPadding * normX),
                targetY = d.target.y - (targetPadding * normY);
//                    return "M" + sourceX + "," + sourceY + "A" + dist + "," + dist + " 0 0,1 " + targetX + "," + targetY;
            if (d.index > 1) return 'M' + sourceX + ',' + sourceY + 'A' + dr + ',' + dr + ' 0 0,1' + targetX + ',' + targetY;
            else return 'M' + sourceX + ',' + sourceY + ' L' + targetX + ',' + targetY;
          });
          container.selectAll('.node').attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
          });
        }
      }

      function updateLinks() {
        var link = container.select('.links').selectAll('.link')
          .data(networkLayout.links(), function(d) { return d.meta.id; });

        link.exit().remove();

        var linkEnter = link.enter().append('g').attr('class', 'link')
          .on('mouseover', onMouseOverLink)
          .on('mouseout', onMouseOutLink);
        linkEnter.append('path')
          .attr('id', function(d) { return 'path-' + d.meta.id + '-' + uuid; });
        linkEnter.append('text');

        link.select('path')
          .style('marker-start', function(d) { return d.left ? 'url(#start-arrow-' + uuid + ')' : ''; })
          .style('marker-end', function(d) { return 'url(#end-arrow-' + uuid + ')'; })

        link.select('text')
          .attr('dx', -20)
          .attr('dy', -5)
          .append('textPath')
          .attr('xlink:href', function(d) { return '#path-' + d.meta.id + '-' + uuid; })
          .text(function(d) {
            return d.primary.relation;
          });

        function onMouseOverLink(d) {

        }

        function onMouseOutLink(d) {

        }
      }

      function updateNodes() {
        var node = container.select('.nodes').selectAll('.node')
          .data(networkLayout.nodes(), function(d) { return d.meta.id; });

        node.exit().transition().attr('r', 0).remove();

        var nodeEnter = node.enter().append('g').attr('class', 'node')
          .on('mouseover', onMouseOverNode)
          .on('mouseout', onMouseOutNode);
        nodeEnter
          .style('opacity', 0)
          .transition()
          .duration(1000)
          .style('opacity', 1)

        nodeEnter.append('circle')
        nodeEnter.append('text');


        node.call(networkLayout.drag);
        node.select('circle')
          .attr('r', 12)
          .attr('fill', function(d) { return 'url(#img-' + d.primary.entity_type + '-' + uuid + ')'; });
        node.select('text')
          .attr('x', 0)
          .attr('y', -12)
          .style('text-anchor', 'middle')
          .attr('dy', '-.35em')
          .text(function(d) {
            var name = d.primary.name;
            return name.length < 20 ? name : name.substring(0, 20) + '..';
          })
          .style("-webkit-user-select", "none"); // disable text selection when dragging mouse

        function onMouseOverNode(d) {

        }

        function onMouseOutNode(d) {

        }
      }

      function updateBehavior() {
        container.select('.chartArea').call(zoom);
      }
    });
  }

  return exports;
}
