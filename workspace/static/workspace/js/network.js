$.widget("viz.viznetwork", $.viz.vizbase, {
    _create: function() {
        this.options.base.resizeStop = this.resize.bind(this);
        this.options.extend.maximize = this.resize.bind(this);
        this.options.extend.restore  = this.resize.bind(this);
        this.options.extend.help = this.help;

        // track the position of node in this.nodes
        this.nodeMap = {};
        // store nodes data, refed by this.force and node svgs
        this.nodes = [];
        // similar to node
        this.linkMap = {};
        this.links = [];

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
                .append('image').attr('x', '0').attr('y', '0').attr('width', 24).attr('height', 24).attr('xlink:href', GLOBAL_URL.static + 'workspace/img/entity/' + entity_type + '.svg')
            ;
        }

        // define arrow markers for links
        this.svg.append('svg:defs').append('svg:marker')
            .attr('id', 'end-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 6)
            .attr('markerWidth', 5)
            .attr('markerHeight', 5)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('class', 'linkarrow')
        ;

        this.svg.append('svg:defs').append('svg:marker')
            .attr('id', 'start-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 4)
            .attr('markerWidth', 5)
            .attr('markerHeight', 5)
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
        this.scaleX = d3.scale.linear().range([0, this.width]).domain([0, this.width]);
        this.scaleY = d3.scale.linear().range([0, this.height]).domain([0, this.height]);
        this.zoom = d3.behavior.zoom().x(this.scaleX).y(this.scaleY);
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

        // line displayed when dragging new nodes
        this.drag_line = this.chart.append('svg:path')
            .attr('class', 'dragline hidden')
            .attr('d', 'M0,0L0,0');
    },

    _tick: function() {
        this.chart.selectAll('path.link').attr('d', function(d) {
                d.linknum = d.linknum || 1;
                var deltaX = d.target.x - d.source.x,
                    deltaY = d.target.y - d.source.y,
                    dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
                    normX = deltaX / dist,
                    normY = deltaY / dist,
                    dr = dist / d.linknum, // completely arbitary
                    sourcePadding = d.left ? 17 : 12,
                    targetPadding = d.right ? 17 : 12,
                    sourceX = d.source.x + (sourcePadding * normX),
                    sourceY = d.source.y + (sourcePadding * normY),
                    targetX = d.target.x - (targetPadding * normX),
                    targetY = d.target.y - (targetPadding * normY);
//                    return "M" + sourceX + "," + sourceY + "A" + dist + "," + dist + " 0 0,1 " + targetX + "," + targetY;
                if (d.linknum > 1) return 'M' + sourceX + ',' + sourceY + 'A' + dr + ',' + dr + ' 0 0,1' + targetX + ',' + targetY;
                else return 'M' + sourceX + ',' + sourceY + ' L' + targetX + ',' + targetY;
            })
        ;

        this.chart.selectAll('.node').attr("transform", function(d) {
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
            _this.setMode('draw');
          }
        } else {
          _this.setMode('normal');
        }
      });


      var list_html = ' \
                      <div class="rel-div"> \
                        <input type="checkbox" id="label-control" checked> Show link labels \
                        <ul class="rel-list"> \
                        </ul> \
                      </div> \
      ';
      $(list_html).appendTo(this.element)
        .on('click', 'input[type=checkbox]', this.onFilterRel.bind(this))
        .on('mouseover', '.rel-item', this.onMouseOverRel.bind(this))
        .on('mouseout', '.rel-item', this.onMouseOutRel.bind(this));
      this.element.find('#label-control').click(this.onShowLinkLabel.bind(this));
  },

  onShowLinkLabel: function() {
    this.svg.selectAll('.link-text').classed('hidden', function(d) {
      return !d3.select(this).classed('hidden');
    });
  },

  onMouseOutRel: function(e) {
    this.svg.selectAll('path.link').transition().style('stroke', '#ccc');
  },

  onMouseOverRel: function(e) {
    var tar = $(e.target).find(':checkbox');
    if (!tar.length) return;
    var value = tar.val();
    var isvisible = tar[0].checked;
    var display = isvisible ? '' : 'none';
    this.svg.selectAll('path.link').transition().style('stroke', function(d) {
      var rel = wb.store.items.relationships[d.id];
      if (rel.primary.relation === value) return 'steelblue';
      else return '#ccc';
    });
  },

  onFilterRel: function(e) {
    var tar = $(e.target);
    var value = tar.val();
    var isvisible = tar[0].checked;
    var display = isvisible ? '' : 'none';
    this.svg.selectAll('.link').transition().style('display', function(d) {
      var rel = wb.store.items.relationships[d.id];
      if (rel.primary.relation === value) return d.display = display;
      else return d.display;
    });
  },

  // rels is a dictionary
  // { rel-label: number }
  showRelList: function(rels) {
    var el = this.element.find('.rel-list');
    el.empty();
    for (rel in rels) {
      var n = rels[rel];
      var html = '<li class="rel-item"><label><input type="checkbox" checked value="'
        + rel + '">'
        + rel + ' (' + n + ')'
        + '</label></li>';
      $(html).appendTo(this.element.find('.rel-list'));
    }
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
            var mouse = d3.mouse(_this.chart[0][0]);
            _this.drag_line.attr('d', 'M' + _this.mousedown_node.x + ',' + _this.mousedown_node.y + 'L' + mouse[0] + ',' + mouse[1]);

            // _this.restart();
        });

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
            _this.restart();
        });

        this.chart.selectAll('.node').on("mousedown", function(d) {
            // select node
            _this.force.stop();
            _this.mousedown_node = d;
            if(_this.mousedown_node === _this.selected_node) _this.selected_node = null;
            else _this.selected_node = _this.mousedown_node;
            _this.selected_link = null;

            // reposition drag line
            _this.drag_line
                .style('marker-end', 'url(#end-arrow)')
                .classed('hidden', false)
                .attr('d', 'M' + _this.mousedown_node.x + ',' + _this.mousedown_node.y + 'L' + _this.mousedown_node.x + ',' + _this.mousedown_node.y);
        });

        this.chart.selectAll('.node').on("mouseup", function(d) {
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

            link = {source: source, target: target};
            // track the temp link, delete it later
            _this.links.push(link);
            _this.linkMap['_tempdraw'] = _this.links.length - 1;


            // select new link
            _this.selected_link = link;
            _this.selected_node = null;

            // _this.showLinkEditor(link);
            var pos = {top: d3.event.pageY, left: d3.event.pageX};
            wb.editor.data({
              primary: {source: source.id, target: target.id}
            }, 'relationship').show(pos, 'network', function(action) {
              if ('_tempdraw' in _this.linkMap) {
                _this.links.splice([_this.linkMap['_tempdraw']], 1);
                delete _this.linkMap['_tempdraw'];
                _this.restart();
              }
            });


            // _this.restart();
        });

    },

    setFilterMode: function() {
        var _this = this;

        this.svg.append('g')
            .attr('class', 'brush')
            .call(this.brush
                .on("brush", brushing)
                .on("brushend", brushend)
                .x(this.zoom.x())
                .y(this.zoom.y())
            )
        ;

        function brushstart() {
            // do whatever you want on brush start
        }

        function brushing() {
            var e = _this.brush.extent();
            var selected_nodes = [], selected_relationships = [];
            d3.selectAll(".node").classed("selected", function(d) {
                return  e[0][0] <= d.x && d.x <= e[1][0]
                    && e[0][1] <= d.y && d.y <= e[1][1];
            });
            // d3.selectAll(".link").classed("selected", function(d) {
            //     return  (e[0][0] <= d.source.x
            //         && d.source.x <= e[1][0]
            //         && e[0][1] <= d.source.y
            //         && d.source.y <= e[1][1])
            //         || (e[0][0] <= d.target.x
            //         && d.target.x <= e[1][0]
            //         && e[0][1] <= d.target.y
            //         && d.target.y <= e[1][1]);
            // });
        }

        function brushend() {
            d3.select(this).call(d3.event.target);
            var e = _this.brush.extent();
            $('.filter-div .filter-item').filter(function(i, item) {
              return $(item).find('a').data('tool') === 'network';
            }).remove();
            // empty brush deselects all nodes
            if (_this.brush.empty()) {
                wb.store.shelf_by.entities = [];
                // d3.selectAll(".node").classed("selected", function(d) {
                //     return d.selected = false;
                // });
                wb.log.log({
                    operation: 'defiltered',
                    item: 'entities',
                    tool: 'network',
                    public: false
                });
            }
            else {
                var ents_id = [];
                d3.selectAll('.node.selected').each(function(d) {
                    var r = wb.store.items.entities[d.id];
                    ents_id.push(d.id);
                })
                wb.store.shelf_by.entities = ents_id;

                selected_entities = []
                ents_id.forEach(function(d) {
                  var entity = wb.store.items.entities[d];
                  selected_entities.push(entity);
                  wb.filter.add(entity.primary.entity_type + ': ' + entity.primary.name, {
                    item: entity.primary.entity_type,
                    id: entity.meta.id,
                    tool: 'network'
                  });
                });
                wb.log.log({
                    operation: 'filtered',
                    item: 'entities',
                    tool: 'network',
                    data: wb.log.logItems(selected_entities),
                    public: false
                });
            }
            $.publish('data/filter', '#' + _this.element.attr("id"));
        }
    },

    setNormalMode: function() {
        var _this = this;

        this.zoom.on('zoom', zoomed);
        this.chart.selectAll('.node').call(this.drag
            .on("dragstart", dragstarted)
            .on("drag", dragged)
            .on("dragend", dragend)
        );
        this.chart.selectAll('.node')
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
        this.chart.selectAll('.node').on("mousemove", null).on("mouseup", null).on("mousedown", null);
        // exit zoom mode
        this.zoom.on('zoom', null);
//        this.svg.select('g.zoom').remove();
        // exit brush mode
        this.svg.select('.brush').remove();
        this.svg.on("mousemove.brush", null).on('mousedown.brush', null).on('mouseup.brush', null);
        // exit drag mode
        this.chart.selectAll('.node').on('mousedown.drag', null);
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
        var source = this.findNode(rel.primary.source);
        var target = this.findNode(rel.primary.target);
        // only add a link when both source and target exist
        if (source && target) {
          var link = {
              source: source,
              target: target,
              id: rel.meta.id,
              relation: rel.primary.relation
          };
          var i = this.findLink(link);
          if (i < 0) {
            this.links.push(link);
          }
        }
    },

    updateData: function() {
        var _this = this;

        // first add all entities as nodes 
        for (var d in wb.store.items.entities) {
          var ent = wb.store.items.entities[d];
          if (ent.meta.deleted) continue;
          if (ent.meta.id in this.nodeMap) {
            this.nodes[this.nodeMap[ent.meta.id]].temp_exist = true;
          } else {
            this.nodes.push({ id: ent.meta.id, temp_exist: true });
            this.nodeMap[ent.meta.id] = this.nodes.length - 1;
          }
        }
        // remove items that is not in wb.store
        // iterate backward
        for (var i = this.nodes.length - 1; i >= 0; i--) {
          if (!this.nodes[i].temp_exist) {
            delete this.nodeMap[this.nodes[i].id];
            this.nodes.splice(i, 1);
            // update position in nodeMap after i
            for (var j = i; j < this.nodes.length; j++) {
              this.nodeMap[this.nodes[j].id] = j;
            }
          } else {
            delete this.nodes[i].temp_exist;
          } 
        }

        // add relationships as links
        for (var d in wb.store.items.relationships) {
          var rel = wb.store.items.relationships[d];
          if (rel.meta.deleted) continue;
          if (rel.meta.id in this.linkMap) {
            var k = this.linkMap[rel.meta.id];
            this.links[k].temp_exist = true;
            this.links[k].relation = rel.primary.relation;
          } else {
            var source = this.nodeMap[rel.primary.source];
            var target = this.nodeMap[rel.primary.target];
            if ((source >=0) && (target >=0)) {
              this.links.push({
                source: source,
                target: target,
                id: rel.meta.id,
                temp_exist: true,
                relation: rel.primary.relation
              });
              this.linkMap[rel.meta.id] = this.links.length - 1;
            }
          }
        }
        for (var i = this.links.length - 1; i >= 0; i--) {
          if (this.links[i]) {
            if (!this.links[i].temp_exist) {
              delete this.linkMap[this.links[i].id];
              this.links.splice(i, 1); 
              // update position in linkMap after i
              for (var j = i; j < this.links.length; j++) {
                this.linkMap[this.links[j].id] = j;
              }
            } else {
              delete this.links[i].temp_exist;
            } 
          }
        }

        // compute linknum for multiple links between nodes
        // first sort links
        // since we use linkMap to track the position of links, we do not want to sort the original links
        // make a copy of the links first
        var links_temp = JSON.parse(JSON.stringify(this.links));
        links_temp.sort(function(a, b) {
          if (a.source > b.source) {return 1;}
          else if (a.source < b.source) {return -1;}
          else {
              if (a.target > b.target) {return 1;}
              if (a.target < b.target) {return -1;}
              else {return 0;}
          }
        });
        //any links with duplicate source and target get an incremented 'linknum'
        for (var i=0; i < links_temp.length; i++) {
          if (i != 0 &&
            links_temp[i].source == links_temp[i-1].source &&
            links_temp[i].target == links_temp[i-1].target) {
              links_temp[i].linknum = links_temp[i-1].linknum + 1;
          }
          else {
            links_temp[i].linknum = 1;
          }
          this.links[this.linkMap[links_temp[i].id]].linknum = links_temp[i].linknum;
        }

        this.restart();
        // determine mode
        if ($('.control.filter.selected').length) this.setMode('filter');
        else if ($('.control.draw.selected').length) this.setMode('draw');
        else this.setMode('normal');
    },

    updateView: function() {
      var nodes = [];
      var rels = {};

      if (this.nodes.length === 0) {
        return d3.select(this.element[0]).append('div')
          .attr('class', 'center-block placeholder')
          .attr('width', '200px')
          .style('text-align', 'center')
          .html('No entities created yet');
      } 
      else d3.select(this.element[0]).selectAll('.placeholder').remove(); 

      this.svg.selectAll('.link').attr('display', function(d) {
        if (wb.store.shelf.relationships.indexOf(d.id) > -1) {
          nodes.push(d.source.id);
          nodes.push(d.target.id);

          // calculate relations
          var rel = wb.store.items.relationships[d.id];
          if (rel.primary.relation in rels) rels[rel.primary.relation]++;
          else rels[rel.primary.relation] = 1; 

          return '';
        }
        return 'none';
      });
      this.svg.selectAll('.node').attr('display', function(d) {
        // either relationship is selected or entities are selected
        if (nodes.indexOf(d.id) > -1 || wb.store.shelf.entities.indexOf(d.id) > -1) return '';
        return 'none';
      });

      this.showRelList(rels);
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

        var link_d = this.chart.selectAll('.linkg').data(this.links);
        var link_g = link_d.enter().append("g").attr("class", "linkg")
          .on("mouseover", this.onMouseOverLink.bind(this))
          .on("mouseout", this.onMouseOutLink.bind(this))
          .on('click', this.onClickLink.bind(this));
        link_g.append('path')
          .attr('class', 'link')
          .attr('id', function(d) {
            return 'path-' + d.id; 
          })
          .style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
          .style('marker-end', function(d) { return 'url(#end-arrow)'; })
        ;
        link_g.append('svg:text')
          .attr('class', 'link-text')
          .attr('dx', -20)
          .attr('dy', -5)
          .append('textPath')
          // .attr("stroke", "black")
          .attr("xlink:href", function(d) {
            return '#path-' + d.id;
          })
          .attr('startOffset', '50%')
          .text(function(d) {
            return d.relation;
          });

        // this.selected_link && this.selected_link.style('stroke-dasharray', '10,2');

        // this.link.append('svg:title')
        //     .text(function(d) { return d.rel; })
        // ;
        link_d.exit().remove();

        var node_d = this.chart.selectAll('.node').data(this.nodes, function(d) { return d.id; });

        var g = node_d.enter().append("svg:g").attr('class', 'node');

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

        node_d.exit().remove();


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
        this.scaleX .range([0, this.width]).domain([0, this.width]);
        this.scaleY .range([0, this.width]).domain([0, this.width]);
        this.force.size([this.width, this.height]).resume();
        this.force.start();
    },

    onMouseOverNode: function(d) {
      if (d3.event.defaultPrevented) return;

      // this.highlightNode(d);

      var pos = {top: d3.event.pageY, left: d3.event.pageX};
      this.showNodeInfoTimer = setTimeout(function() {
        var entity = wb.store.items.entities[d.id];
        wb.viewer.data(entity, 'entity').show(pos, 'network');
      }, 1000);
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
      if (d3.event.defaultPrevented) return;
      var highlighted;
      this.chart.selectAll('.node').each(function(o) {
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
        wb.viewer.data(rel, 'relationship').show(pos, 'network');
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
      this.chart.selectAll('.linkg').each(function(o) {
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
      container.selectAll('.linkg').classed('dim', function(o) {
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
      container.selectAll('.linkg').classed({
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


