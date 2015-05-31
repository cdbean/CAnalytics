$.widget("viz.viznetwork", $.viz.vizbase, {
    _create: function() {
        this.options.base.resizeStop = this.resize.bind(this);
        this.options.extend.maximize = this.resize.bind(this);
        this.options.extend.restore  = this.resize.bind(this);
        this.options.extend.help = this.help;
        this.element.addClass('network');
        this._super('_create');

        this._setupUI();
        this._setupForceLayout();

        this.updateData();
        this.updateView();

    },

    _setupForceLayout: function() {
        this.margin = {top: 35, bottom: 5, left: 13, right: 5};
        this.width  = this.element.width() - this.margin.left - this.margin.right;
        this.height = this.element.height() - this.margin.top - this.margin.bottom;
        this.nodeMap = {};
        this.nodes = [];
        this.links = [];
        // mouse event vars
        this.selected_node = null,
        this.selected_link = null;
        this.mousedown_link = null;
        this.mousedown_node = null;
        this.mouseup_node = null;

        this.svg = d3.select(this.element[0])
            .each(function() { this.focus(); })
            .append("svg:svg")
            .attr('width', this.width)
            .attr('height', this.height)
            .attr("pointer-events", "all")
        ;
        // define node image
        for (var i = 0; i < wb.store.static.entity_types.length; i++) {
            var entity_type = wb.store.static.entity_types[i];
            this.svg.append('svg:defs')
                .append('svg:pattern').attr('id', 'img-'+entity_type).attr('patternUnits', 'userSpaceOnUse').attr('x', '12').attr('y', '12').attr('height','24').attr('width','24')
                .append('image').attr('x', '0').attr('y', '0').attr('width', 24).attr('height', 24).attr('xlink:href', GLOBAL_URL.static + 'workspace/img/entity/' + entity_type + '.png')
            ;
        }

        // define arrow markers for links
        this.svg.append('svg:defs').append('svg:marker')
            .attr('id', 'end-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 6)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('class', 'linkarrow')
        ;

        this.svg.append('svg:defs').append('svg:marker')
            .attr('id', 'start-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 4)
            .attr('markerWidth', 3)
            .attr('markerHeight', 3)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M10,-5L0,0L10,5')
            .attr('class', 'linkarrow');

        this.force = d3.layout.force()
            .nodes(this.nodes)
            .links(this.links)
            .charge(-400)
            .linkDistance(120)
            .size([this.width, this.height])
            .on("tick", this._tick.bind(this))
        ;

        // d3 behaviors
        this.zoom = d3.behavior.zoom();
        this.brush = d3.svg.brush();
        this.drag = this.force.drag();

        var g = this.svg.append('svg:g')
        ;

        g.append('svg:rect')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('fill', 'white')
            .attr('class', 'chart-area')
            .call(this.zoom)
        ;

        this.chart = this.svg.append('g');

        this.link = this.chart.selectAll("path");
        this.node = this.chart.selectAll("g");

        // line displayed when dragging new nodes
        this.drag_line = this.chart.append('svg:path')
            .attr('class', 'dragline hidden')
            .attr('d', 'M0,0L0,0');
    },

    _tick: function() {
        this.link.attr('d', function(d) {
                var deltaX = d.target.x - d.source.x,
                    deltaY = d.target.y - d.source.y,
                    dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
                    normX = deltaX / dist,
                    normY = deltaY / dist,
                    sourcePadding = d.left ? 17 : 12,
                    targetPadding = d.right ? 17 : 12,
                    sourceX = d.source.x + (sourcePadding * normX),
                    sourceY = d.source.y + (sourcePadding * normY),
                    targetX = d.target.x - (targetPadding * normX),
                    targetY = d.target.y - (targetPadding * normY);
//                    return "M" + sourceX + "," + sourceY + "A" + dist + "," + dist + " 0 0,1 " + targetX + "," + targetY;
                return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
            })
        ;

        this.node.attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
        });
    },

    _setupUI: function() {
      // filter bar
      var entity_types = wb.store.static.entity_types;
      var filterbar = '<div class="network-filterbar"><ul>';
      for (var i = 0; i < entity_types.length; i++) {
          filterbar += '<li><input type="checkbox" id="'
                      + entity_types[i]
                      + '-check" checked value="'
                      + entity_types[i]
                      + '" style="margin-right: 5px;"/><label for="'
                      + entity_types[i]
                      + '-check">'
                      + entity_types[i]
                      + '</label>'
          ;
      }
      filterbar += '</ul></div>';
      this.element.append(filterbar);

      $('.network-filterbar :checkbox').change(this._onSetFilter.bind(this));

      var html = ' \
        <ul class="controls"> \
          <li class="control filter" title="Filter"> \
          <li class="control draw" title="Draw"> \
        </ul> \
      ';
      this.element.append(html);

      var _this = this;

      this.element.find('.control').click(function() {
        $(this).toggleClass('selected');
        if ($(this).hasClass('selected')) {
          if ($(this).hasClass('filter'))
            _this.setMode('filter');
          else if ($(this).hasClass('draw')) {
            alert ('The function has not been implemented yet!');
            return;
            _this.setMode('draw');
          }
        } else {
          _this.setMode('normal');
        }
      });
    },


    _onSetFilter: function(e) {
      var display = '';
      var value = e.target.value;

      if (! e.target.checked) {
          // hide node and associated links
          display = 'none';
      }
      this.svg.selectAll('.node').transition().style('display', function(o) {
          var entity = wb.store.items.entities[o.id];
          if (entity.primary.entity_type === value) {
              return display;
          } else {
              return this.style.display;
          }
      });
      this.svg.selectAll('.link').transition().style('display', function(o) {
          var source_ent = wb.store.items.entities[o.source.id];
          var target_ent = wb.store.items.entities[o.target.id];
          if ((source_ent.primary.entity_type === value) || (target_ent.primary.entity_type === value)) {
              return display;
          } else {
              return this.style.display;
          }
      });

    },

    _onSetMode: function(e) {
      if (d3.event.shiftKey) {
          this.mode = "filter";
      }
      else if (d3.event.altKey) {
          this.mode = "draw";
      }
      else {
          this.mode = "normal";
      }
      this.setMode(this.mode);
    },

    _onExitMode: function(e) {
      this.mode = "normal";
      this.setMode(this.mode);
    },

    _onViewerEdit: function(e) {
      var $viewer = $('.network-viewer');
      var link = $viewer.data('link');
      var node = $viewer.data('node');

      $viewer.hide();

      if (link) {
        this.showLinkEditor(link);
      }
      if (node) {
        this.showNodeEditor(node);
      }
    },

    _onViewerDelete: function(e) {
      var $viewer = $('.network-viewer');
      var link = $viewer.data('link');
      var node = $viewer.data('node');

      if (link) {
        // delete a relationship
        $.ajax({
          url: 'relationship',
          type: 'DELETE',
          data: JSON.stringify({
            source: link.source.id,
            target: link.target.id,
            rel: link.relation,
            id: link.id
          }),
          contentType: 'application/json; charset=utf-8',
          dataType: 'json',
          success: function(d) { // return deleted relationship
            $.publish('/relationship/delete', [[d.relationship]]);
            wb.utility.notify('1 relationship deleted', 'success');
          }
        });
      }
      if (node) {
        // delete an entity
      }

      $viewer.hide();

    },

    _onEditorCancel: function(e) {
      $('.network-editor form')[0].reset();
      $('.network-editor').hide();
      var link = $('.network-editor').data('link');

      // // delete the link
      // var i = this.findLink(link);
      // if (i >= 0) {
      //   this.links.splice(i, 1);
      // }
      $('.network-editor').data('link', null);
      this.selected_link = null;

      this.restart();
    },

    _onEditorSave: function(e) {
      var link = $('.network-editor').data('link');
      var rel = $('.network-editor #relation').val();
      var desc = $('.network-editor #desc').val();
      link.relation = rel;
      link.description = desc;
      $.post('relationship', {
          source: link.source.id,
          target: link.target.id,
          rel: rel,
          desc: desc
      }, function(d) {
          $('.network-editor form')[0].reset();
          $('.network-editor').hide();

          // add attr to link
          var rel = d.relationship;
          link.id = rel.primary.id;
          link.created_by = rel.primary.created_by;
          link.created_at = rel.primary.created_at;

          if (d.created) {
            // the link could be created or simply updated
            $.publish('/relationship/add', [[rel]]);
            wb.utility.notify('1 relationship added!', 'success');
          } else {
            // because only the attribute of the relationship changes, we do
            // not need to publish the event
            $.publish('/relationship/update', [[rel]]);
            wb.utility.notify('1 relationship updated!', 'success');
          }


          $('.network-editor').data('link', null);
          this.selected_link = null;
      });

    },


    setMode: function(mode) {
        this.exitAllModes();
        switch (mode) {
            case "normal":
                this.setNormalMode();
                break;
            case "draw":
                this.setDrawMode();
                break;
            case "filter":
                this.setFilterMode();
                break;
        }
    },

    setDrawMode: function() {
        var _this = this;
        this.svg.on("mousemove", function(d) {
            if(!_this.mousedown_node) {
                return;
            }
            _this.drag_line.attr('d', 'M' + _this.mousedown_node.x + ',' + _this.mousedown_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);

            _this.restart();
        })

        this.svg.on("mouseup", function() {
            if(_this.mousedown_node) {
                // hide drag line
                _this.drag_line
                    .classed('hidden', true)
                    .style('marker-end', '');
            }

            // because :active only works in WebKit?
            _this.svg.classed('active', false);

            // clear mouse event vars
            _this.resetMouseVars();
        })

        this.node.on("mousedown", function(d) {
            // select node
            _this.mousedown_node = d;
            if(_this.mousedown_node === _this.selected_node) _this.selected_node = null;
            else _this.selected_node = _this.mousedown_node;
            _this.selected_link = null;

            // reposition drag line
            _this.drag_line
                .style('marker-end', 'url(#end-arrow)')
                .classed('hidden', false)
                .attr('d', 'M' + _this.mousedown_node.x + ',' + _this.mousedown_node.y + 'L' + _this.mousedown_node.x + ',' + _this.mousedown_node.y);

            // _this.restart();
            _this.force.stop();
        })

        this.node.on("mouseup", function(d) {
            if(!_this.mousedown_node) return;

            // needed by FF
            _this.drag_line
                .classed('hidden', true)
                .style('marker-end', '');

            // check for drag-to-self
            _this.mouseup_node = d;
            if(_this.mouseup_node === _this.mousedown_node) { _this.resetMouseVars(); return; }

            // unenlarge target node
            d3.select(this).attr('transform', '');

            // add link to graph (update if exists)
            // NB: links are strictly source < target; arrows separately specified by booleans
            var source, target;
            source = _this.mousedown_node;
            target = _this.mouseup_node;

            var link;
            link = _this.links.filter(function(l) {
                return (l.source === source && l.target === target);
            })[0];

            if(link) {

            } else {
                link = {source: source, target: target};
                _this.links.push(link);
            }

            // select new link
            _this.selected_link = link;
            _this.selected_node = null;

            // _this.showLinkEditor(link);
            var pos = {top: d3.event.pageY, left: d3.event.pageX};
            wb.editor.data({
              primary: {source: source.id, target: target.id}
            }, 'relationship').show(pos);


            _this.restart();
        });

    },

    setFilterMode: function() {
        var _this = this;
        var brushX=d3.scale.linear().range([0, this.width]),
            brushY=d3.scale.linear().range([0, this.height]);

        this.chart.append('g')
            .attr('class', 'brush')
            .call(this.brush
                .on("brush", brushing)
                .on("brushend", brushend)
                .x(brushX)
                .y(brushY)
            )
        ;

        function brushstart() {
            // do whatever you want on brush start
        }

        function brushing() {
            var e = _this.brush.extent();
            var selected_nodes = [], selected_relationships = [];
            d3.selectAll(".node").classed("selected", function(d) {
                return  e[0][0] <= brushX.invert(d.x) && brushX.invert(d.x) <= e[1][0]
                    && e[0][1] <= brushY.invert(d.y) && brushY.invert(d.y) <= e[1][1];
            });
            d3.selectAll(".link").classed("selected", function(d) {
                return  (e[0][0] <= brushX.invert(d.source.x)
                    && brushX.invert(d.source.x) <= e[1][0]
                    && e[0][1] <= brushY.invert(d.source.y)
                    && brushY.invert(d.source.y) <= e[1][1])
                    || (e[0][0] <= brushX.invert(d.target.x)
                    && brushX.invert(d.target.x) <= e[1][0]
                    && e[0][1] <= brushY.invert(d.target.y)
                    && brushY.invert(d.target.y) <= e[1][1]);
            });
        }

        function brushend() {
            d3.select(this).call(d3.event.target);
            var e = _this.brush.extent();
            // empty brush deselects all nodes
            if (_this.brush.empty()) {
                wb.store.shelf_by.relationships = [];
                d3.selectAll(".node").classed("selected", function(d) {
                    return d.selected = false;
                });

                $('.filter-div .filter-item').filter(function(i, item) {
                  return $(item).find('a').data('item') === 'relationship';
                }).remove();

                wb.log({
                    operation: 'removed filter in',
                    item: 'network',
                    tool: 'network'
                });
            }
            else {
                var rels_id = [];
                var selected_names = [];
                d3.selectAll('.link.selected').each(function(d) {
                    var r = wb.store.items.relationships[d.id];
                    rels_id.push(d.id);
                    selected_names.push(r.primary.relation);
                })
                wb.store.shelf_by.relationships = rels_id;
                
                $('.filter-div .filter-item').filter(function(i, item) {
                  return $(item).find('a').data('item') === 'relationship';
                }).remove();
                rels_id.forEach(function(d) {
                  var rel = wb.store.items.relationships[d];
                  wb.filter.add('relation: ' + rel.primary.relation, {
                    item: 'relationship',
                    id: d
                  });
                });
                wb.log({
                    operation: 'filtered in',
                    item: 'network',
                    tool: 'network',
                    data: {
                      'id': rels_id.join(','),
                      'name': selected_names.join(',')
                    }
                });
            }
            $.publish('data/filter', '#' + _this.element.attr("id"));
        }
    },

    setNormalMode: function() {
        var _this = this;

        this.zoom.on('zoom', zoomed);
        this.node.call(this.drag
            .on("dragstart", dragstarted)
            .on("drag", dragged)
            .on("dragend", dragend)
        );
        this.node
            .on('mouseover', this.onMouseOverNode.bind(this))
            .on('mouseout', this.onMouseOutNode.bind(this))
            .on('click', this.onClickNode.bind(this))
        ;

        function dragstarted(d) {
            d3.event.sourceEvent.stopPropagation();
            d3.select(this).classed("dragging", true);
        }

        function dragged(d) {
//            d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
        }

        function dragend(d) {
            d3.select(this).classed("dragging", false);
            d.fixed = true;
        }
        function zoomed() {
            _this.chart.attr("transform",
                "translate(" + d3.event.translate + ")"
                    + " scale(" + d3.event.scale + ")");
        }
    },

    exitAllModes: function() {
        // exit draw mode
        this.svg.on("mousemove", null).on("mouseup", null);
        this.node.on("mousemove", null).on("mouseup", null).on("mousedown", null);
        // exit zoom mode
        this.zoom.on('zoom', null);
//        this.svg.select('g.zoom').remove();
        // exit brush mode
        this.svg.select('.brush').remove();
        this.svg.on("mousemove.brush", null).on('mousedown.brush', null).on('mouseup.brush', null);
        // exit drag mode
        this.node.on('mousedown.drag', null);
    },

    showLinkEditor: function(l) {
      // var $editor = $('.network-editor').show()
      //     // .css('top', (this.mouseup_node.y + this.mousedown_node.y)/2.0)
      //     // .css('left', (this.mouseup_node.x + this.mousedown_node.x)/2.0)
      //     .css('top', (l.source.y + l.target.y)/2.0)
      //     .css('left', (l.source.x + l.target.x)/2.0)
      //     .data('link', l)
      // ;
      //
      // var node_type = l.source.id.split('-')[0];
      // if (node_type === 'dataentry') {
      //   var source = 'dataentry';
      // } else {
      //   var source = l.source.primary.name;
      // }
      // var target = l.target.primary.name;
      // $editor.find('.rel-source').text(source);
      // $editor.find('.rel-target').text(target);
      // // add link attributes if any
      // $editor.find('#relation').val(l.relation);
      // $editor.find('#desc').val(l.description);
    },


    showNodeEditor: function(d) {

    },

    showLinkInfo: function(l, pos) {
        $('.network-viewer .attr-list').remove();
        var rel = wb.store.items.relationships[l.id];
        var str = "<table class='attr-list'>";
        for (var attr in rel) {
          if (attr !== 'source' && attr !== 'target' && attr !== 'id'
              && attr !== 'created_by' && attr !== 'last_edited_by' && l[attr]) {
            str += "<tr><th>" + wb.utility.capfirst(attr)
                  + ": </th><td>" + rel[attr] + "</td></tr>";
          }
        }
        str += "<tr><th>Created by: </th><td>" + wb.info.users[rel.meta.created_by].name + "</td></tr>";
        str += "<tr><th>Last edited by: </th><td>" + wb.info.users[rel.meta.last_edited_by].name + "</td></tr>";
        str += "</table>";
        $(str).appendTo($('.network-viewer'));

        $('.network-viewer').data('link', l);

        var width = $('.network-viewer').outerWidth();
        var height = $('.network-viewer').outerHeight();
        $('.network-viewer')
          .css('left', pos.left - width/2 + 'px')
          .css('top', pos.top - height - 10 + 'px')
          .css('position', 'absolute')
          .css('display', 'block')
        ;
    },

    hideLinkInfo: function() {
        setTimeout(function() {
          if (!$('.network-viewer:hover').length) {
            $('.network-viewer').hide();
            $('.network-viewer').data('link', null);
          }
        }, 300);
    },

    hideNodeInfo: function() {
        setTimeout(function() {
          if (!$('.network-viewer:hover').length) {
            $('.network-viewer').hide();
            $('.network-viewer').data('node', null);
          }
        }, 300);
    },

    findNode: function(id) {
        return this.nodeMap[id];
    },

    findLink: function(link) {
      if (link.id) {
        for (var i = 0, len = this.links.length; i < len; i++) {
          if (link.id === this.links[i].id) return i;
        }
        return -1;
      } else {
        for (var i = 0, len = this.links.length; i < len; i++) {
          if (link.source === this.links[i].source
             && link.target === this.links[i].target
             && link.relation === this.links[i].relation) {
               return i;
             }
        }
        return -1;
      }
    },

    addNode: function(id) {
        var existed_node = this.findNode(id);
        if (existed_node) {
            return existed_node;
        } else {
            var entity = { id: id };
            this.nodeMap[id] = entity;
            this.nodes.push(entity);
            return entity;
        }
    },

    addLink: function(rel) {
        var source = this.addNode(rel.primary.source);
        var target = this.addNode(rel.primary.target);
        var link = {
            source: source,
            target: target,
            id: rel.meta.id,
        };
        var i = this.findLink(link);
        if (i < 0) {
          this.links.push(link);
        }
    },

    updateData: function() {
        var _this = this;

        this.links = [];

        for (var d in wb.store.items.relationships) {
          var rel = wb.store.items.relationships[d];
          _this.addLink(rel)
        }
        this.restart();
        this.setMode('normal');
    },

    updateView: function() {
      var nodes = [];
      this.svg.selectAll('.link').attr('display', function(d) {
        if (wb.store.shelf.relationships.indexOf(d.id) > -1) {
          nodes.push(d.source.id);
          nodes.push(d.target.id);
          return '';
        }
        return 'none';
      });
      this.svg.selectAll('.node').attr('display', function(d) {
        if (nodes.indexOf(d.id) > -1) return '';
        return 'none';
      });
    },

    reload: function() {
        this.updateData();
        this.update();
    },

    resetMouseVars: function() {
        this.mousedown_node = null;
        this.mouseup_node = null;
        this.mousedown_link = null;
    },

    restart: function() {
        var _this = this;

        this.link = this.link.data(this.links);
        this.link.enter().append("svg:path")
            .attr("class", "link")
            .style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
            .style('marker-end', function(d) { return 'url(#end-arrow)'; })
            .on("mouseover", this.onMouseOverLink.bind(this))
            .on("mouseout", this.onMouseOutLink.bind(this))
            .on('click', this.onClickLink.bind(this))
        ;
        // this.selected_link && this.selected_link.style('stroke-dasharray', '10,2');

        this.link.append('svg:title')
            .text(function(d) { return d.rel; })
        ;
        this.link.exit().remove();

        this.node = this.node.data(this.nodes, function(d) { return d.id; });

        var g = this.node.enter().append("svg:g").attr('class', 'node');

        g.append("svg:circle")
            .attr('r', 12)
            .attr('fill', function(d) {
                var entity = wb.store.items.entities[d.id];
                return "url(#img-" + entity.primary.entity_type + ")";
            })
        ;

        g.append("text")
            .attr('class', 'node-text')
            .attr("x", 0)
            .attr("y", 4)
            .style("text-anchor", "middle")
            .attr("dy", "-.95em")
            .text(function(d) {
                var ent = wb.store.items.entities[d.id];
                return ent.primary.name.length < 20 ? ent.primary.name : ent.primary.name.substring(0, 20) + '...';
            })
            .style("-webkit-user-select", "none"); // disable text selection when dragging mouse

        this.node.exit().remove();


        // calculate the link length
        //            var k = Math.sqrt(nodes.length / (this.width * this.height));
        //            force.charge(-10 / k)
        //                .gravity(100 * k)

        this.force.start();
    },

    resize: function() {
        this._super('resize');
        this.width = this.element.width() - this.margin.left - this.margin.right;
        this.height = this.element.height() - this.margin.top - this.margin.bottom;
        this.element.find('svg').attr('width', this.width).attr('height', this.height);
        this.element.find('svg').find('rect').attr('width', this.width).attr('height', this.height);
        this.force.size([this.width, this.height]).resume();
        this.force.start();
    },

    onMouseOverNode: function(d) {
      // this.highlightNode(d);

      var pos = {top: d3.event.pageY, left: d3.event.pageX};
      this.showNodeInfoTimer = setTimeout(function() {
        var entity = wb.store.items.entities[d.id];
        wb.viewer.data(entity, 'entity').show(pos);
      }, 500);
    },

    onMouseOutNode: function(d) {
      // this.unhighlightNode(d);
      clearTimeout(this.showNodeInfoTimer);
      setTimeout(function() {
        if (!$('.viewer:hover').length) {
          wb.viewer.hide();
        }
      }, 300);
    },

    onClickNode: function(d) {
      var highlighted;
      this.node.each(function(o) {
        if (o.id === d.id) {
          // whether the svg has class active
          // jquery hasClass() failed on svg
          highlighted = /active/.test($(this).attr('class'));
          return false;
        }
      });
      if (highlighted) {
        this.unhighlightNode(d);
      } else {
        this.highlightNode(d);
      }
    },

    onMouseOverLink: function(d) {
      // this.highlightLink(d);
      var pos = {top: d3.event.pageY, left: d3.event.pageX};
      this.showLinkInfoTimer = setTimeout(function() {
        var rel = wb.store.items.relationships[d.id];
        wb.viewer.data(rel, 'relationship').show(pos);
      }, 500);
    },

    onMouseOutLink: function(d) {
      // this.unhighlightLink(d);
      clearTimeout(this.showLinkInfoTimer);
      setTimeout(function() {
        if (!$('.viewer:hover').length) {
          wb.viewer.hide();
        }
      }, 300);
    },

    onClickLink: function(d) {
      var highlighted;
      this.link.each(function(o) {
        if (o.id === d.id) {
          highlighted = /active/.test($(this).attr('class'));
          return false;
        }
      });
      if (highlighted) {
        this.unhighlightLink(d);
      } else {
        this.highlightLink(d);
      }

    },

    highlight: function(item) {
      // highlight relationship
      this.highlightLink({id: +item});
    },

    highlightLink: function(d) {
      var container = d3.select(this.element[0]);
      container.selectAll('.link').classed('dim', function(o) {
        if (o.id !== d.id) {
          d3.select(this).classed('active', false);
          return true;
        } else {
          d3.select(this).classed('active', true);
          return false;
        }
      });
      container.selectAll('.node').classed('dim', function(o) {
        if (o.id === d.source.id || o.id === d.target.id) {
          d3.select(this).classed('active', true);
          return false;
        } else {
          d3.select(this).classed('active', true);
          return false;
        }
      });
    },

    unhighlightLink: function() {
      var container = d3.select(this.element[0]);
      container.selectAll('.node').classed({
        'dim': false,
        'active': false
      });
      container.selectAll('.link').classed({
        'dim': false,
        'active': false
      });

    },

    highlightNode: function(nodeData) {
        var container = d3.select(this.element[0]);
        var connected_nodes = [nodeData.id];

        container.selectAll('.link').classed('dim', function(o) {
          if (o.source.id === nodeData.id) {
            connected_nodes.push(o.target.id);
            d3.select(this).classed('active', true);
            return false;
          } else if (o.target.id === nodeData.id) {
            connected_nodes.push(o.source.id);
            d3.select(this).classed('active', true);
            return false;
          } else {
            d3.select(this).classed('active', false);
            return true;
          }
        });
        container.selectAll('.node').classed('dim', function(o) {
          if(connected_nodes.indexOf(o.id) < 0) {
            d3.select(this).classed('active', false);
            return true;
          } else {
            d3.select(this).classed('active', true);
            return false;
          }
        });
        // transverse link again
        // highlight links if both its source and target are highlighted
        container.selectAll('.link').classed('dim', function(o) {
          if (connected_nodes.indexOf(o.source.id) > -1
              && connected_nodes.indexOf(o.target.id) > -1) {
            d3.select(this).classed('active', true);
            return false;
          }
          d3.select(this).classed('active', false);
          return true;
        })

        // d3.select(this).select('circle').attr('transform', 'scale(1.5)');
    },

    unhighlightNode: function() {
      var container = d3.select(this.element[0]);

      container.selectAll('.node').classed({
        'dim': false,
        'active': false
      });
      container.selectAll('.link').classed({
        'dim': false,
        'active': false
      });
      // d3.select(this).select('circle').attr('transform', '');
    },

    destroy: function() {
      this._super('destroy');
    },

    help: function() {
      var hint = new EnjoyHint({});
      hint.set(wb.help.network);
      hint.run();
    }
});


