wb.viz.network = function() {
  var margin = { left: 5, right: 5, top: 5, bottom: 5 };
  var width = 960, height = 500;

  var zoom = null, brush = null, drag = null;

  var container = null;

  var scaleX, scaleY;

  var networkLayout;
  var brushable = false;
  var brushExtent = null;
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

  exports.brushable = function(_) {
    if (!arguments.length) return brushable;
    brushable = _;
    return exports;
  }

  exports.setBrush = function(extent) {
    if (!brush) return;
    brushExtent = extent;
    updateBehavior();
  }

  // API
  exports.state = function(_) {
    if (!arguments.length) return getState();
    return setState(_);

    function getState() {
      var state = {nodes: {}, transform: {}};

      container.selectAll('.node').each(function(d) {
        state.nodes[d.meta.id] = {
          id: d.meta.id,
          x: d.x,
          y: d.y,
          px: d.px,
          py: d.py,
          fixed: d.fixed,
          draggedFix: d.draggedFix
        };
      });
      state.transform = {
        translate: zoom.translate(),
        scale: zoom.scale()
      };
      return state;
    }

    function setState(state) {
      networkLayout.stop();
      var nodes = state.nodes,
          transform = state.transform;
      container.selectAll('.node').each(function(d) {
        if (!(d.meta.id in nodes)) return;
        d.x = nodes[d.meta.id].x;
        d.y = nodes[d.meta.id].y;
        d.px = nodes[d.meta.id].px;
        d.py = nodes[d.meta.id].py;
        d.fixed = nodes[d.meta.id].fixed;
        d.draggedFix = nodes[d.meta.id].draggedFix;
      });
      zoom.translate(transform.translate).scale(transform.scale);
      container.select('.chart')
        .attr("transform", "translate("
          + transform.translate[0] + "," + transform.translate[1]+ ")"
          + " scale(" + transform.scale + ")");
      container.select('.chartArea').call(zoom);
      tick();
    }
  }

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

  exports.defilter = function() {
    if (!container) return;
    brush.clear();
    container.select('.brush').transition().call(brush)
  }

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
        container.append('g').attr('class', 'brush');
        var chart = container.append('g')
          // .attr('clip-path', 'url(#clip-' + uuid + ')')
          .attr('class', 'chart');
        chart.append('g').attr('class', 'links');
        chart.append('g').attr('class', 'nodes');

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



      function brushing() {
        var e = brush.extent();
        container.selectAll(".node").classed("selected", function(d) {
          return  e[0][0] <= d.x && d.x <= e[1][0]
            && e[0][1] <= d.y && d.y <= e[1][1];
        });
      }

      function brushed() {
        var filter = [];
        container.selectAll('.node.selected').each(function(d) {
          filter.push(d)
        });
        var e = brush.extent()
        return dispatch.filter(filter, e);
      }

      function dragstart(d) {
        d3.select(this).on('mouseover', null).on('mouseout', null);
        if (window.mouseoverTimeout) clearTimeout(window.mouseoverTimeout)
        networkLayout.stop();

        // find connected links and set fixed = false;
        container.selectAll('.link').each(function(dd) {
          // if the node has been dragged, set it to fix
          if (dd.source.meta.id === d.meta.id) return dd.target.fixed = false || dd.target.draggedFix;
          if (dd.target.meta.id === d.meta.id) return dd.source.fixed = false || dd.target.draggedFix;
        });
      }

      function dragged(d) {
        d.px += d3.event.dx;
        d.py += d3.event.dy;
        d.x += d3.event.dx;
        d.y += d3.event.dy;
        tick();
      }

      function dragend(d) {
        d3.select(this).on('mouseover', onMouseOverNode).on('mouseout', onMouseOutNode);
        d.fixed = true;
        // if the node has been dragged, set it to fix
        d.draggedFix = true;
        tick();
        networkLayout.resume();
        if (d.primary.name === 'New York') console.log(d.x, d.y)
      }

      function update() {
        updateData();
        updateScale();
        updateLayout();
        updateLinks();
        updateNodes();
        updateBehavior();
      }

      function updateData() {
        // compare force data (if existed) to current data
        // and copy force data attributes (x, y, px, py) to current data if matched
        if (!networkLayout) return;

        var nodes = _.clone(networkLayout.nodes());
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

      function updateScale() {
        // keep zoom scale domain
        scaleX = zoom.x();
        scaleY = zoom.y();

        if (!scaleX || !scaleY) {
          scaleX = d3.scale.linear()
            .range([0, innerW])
            .domain([0, innerW]);
          scaleY = d3.scale.linear()
            .range([0, innerH])
            .domain([0, innerH]);
          zoom.x(scaleX).y(scaleY);
        } else {
          if (brush) {
            brushExtent = brush.extent();
          }
          var scale = zoom.scale(),
              translate = zoom.translate();
          scaleX.range([0, innerW])
            .domain([0, innerW]);
          scaleY.range([0, innerH])
            .domain([0, innerH]);
          // after zoom.x(), zoom is reset to scale 1 and translate [0,0]
          zoom.x(scaleX).y(scaleY);
          // set the scale and translate back
          zoom.scale(scale).translate(translate);
        }
      }

      function updateLayout() {
        container.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        container.select('.chartArea').attr('width', innerW).attr('height', innerH).call(zoom);
        container.select('clipPath rect').attr('width', innerW).attr('height', innerH);

        networkLayout = d3.layout.force()
          .nodes(dd.nodes)
          .links(dd.links)
          .charge(-400)
          .linkDistance(120)
          .size([innerW, innerH])
          .on('tick', tick);

        networkLayout.start();
      }

      function updateLinks() {
        var link = container.select('.links').selectAll('.link')
          .data(networkLayout.links(), function(d) { return d.meta.id; });

        link.exit().transition().duration(1000).style('opacity', 0).remove();

        var linkEnter = link.enter().append('g').attr('class', 'link')
          .on('mouseover', onMouseOverLink)
          .on('mouseout', onMouseOutLink);

        linkEnter
          .style('opacity', 0)
          .transition()
          .duration(1000)
          .style('opacity', 1);

        linkEnter.append('path')
          .attr('id', function(d) { return 'path-' + d.meta.id + '-' + uuid; });
        linkEnter.append('text').append('textPath');

        link.select('path')
          .style('marker-start', function(d) { return d.left ? 'url(#start-arrow-' + uuid + ')' : ''; })
          .style('marker-end', function(d) { return 'url(#end-arrow-' + uuid + ')'; })

        link.select('text')
          .attr('text-anchor', 'middle')
          .attr('dy', -5)
          .select('textPath')
          .attr('startOffset', '50%')
          .attr('xlink:href', function(d) { return '#path-' + d.meta.id + '-' + uuid; })
          .text(function(d) {
            return d.primary.relation;
          });

        function onMouseOverLink(d) {
          var pos = {top: d3.event.pageY, left: d3.event.pageX};
          window.mouseoverTimeout = setTimeout(function() {
            dispatch.elaborate(d, pos);
          }, 500)
        }

        function onMouseOutLink(d) {
          if (window.mouseoverTimeout) clearTimeout(window.mouseoverTimeout)
          setTimeout(function() {
            if (!$('.viewer:hover').length > 0) dispatch.delaborate(d);
          }, 300);
        }
      }

      function updateNodes() {
        var node = container.select('.nodes').selectAll('.node')
          .data(networkLayout.nodes(), function(d) { return d.meta.id; });

        node.exit().transition().style('opacity', 0).remove();

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
      }

      function onMouseOverNode(d) {
        var pos = {top: d3.event.pageY, left: d3.event.pageX};
        window.mouseoverTimeout = setTimeout(function() {
          dispatch.elaborate(d, pos);
        }, 500)
      }

      function onMouseOutNode(d) {
        if (window.mouseoverTimeout) clearTimeout(window.mouseoverTimeout)
        setTimeout(function() {
          if (!$('.viewer:hover').length > 0) dispatch.delaborate(d);
        }, 300);
      }
    });
  }

  function updateBehavior() {
    if (brushable) {
      zoom.on('zoom', null);
      brush.x(zoom.x())
        .y(zoom.y());
      if (brushExtent) brush.extent(brushExtent);

      container.select('.brush').style('display', '').call(brush);
    } else {
      container.select('.brush').style('display', 'none');
      container.on("mousemove.brush", null).on('mousedown.brush', null).on('mouseup.brush', null);
      zoom.on('zoom', zoomed);
    }
    container.selectAll('.node').call(drag);
  }

  function zoomed() {
    container.select('.chart').attr("transform", "translate("
      + d3.event.translate + ")"
      + " scale(" + d3.event.scale + ")");
  }

  return d3.rebind(exports, dispatch, 'on');
}
