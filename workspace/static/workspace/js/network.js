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

        this.usersInWatch = []; // users who are watching my view
        this.watchUser = null;  // the user I am watching

        this._setupUI();
        this._setupForceLayout();

        this.updateData();
        this.updateView();
        // restore the view state, if previously saved
        var state = JSON.parse(localStorage.getItem('network_state'));
        if (state) this.useState(state);
        this._registerAutoSave();
        return this;
    },

    _registerAutoSave: function() {
        this.autoSaveInterval = 1000; // auto save every 1s
        var _this = this;
        this.autoSave = setInterval(function() {
          var network_state = _this._getState();
          localStorage.setItem('network_state', JSON.stringify(network_state));
        }, this.autoSaveInterval)
    },

    useState: function(state, id) { // id is the id of the view
      // since we use the state of the view [id], we mark the view as the parent of the current view
      this.element.find('.ui-layout-center>svg').data('parent', id);

      this.chart.selectAll('.nodeg').attr("transform", function(d) {
       if (d.id in state.nodes) {
          var n = state.nodes[d.id];
          d.px = d.x = n.x;
          d.py = d.y = n.y;
        }
        return "translate(" + d.x + "," + d.y + ")";
      })
      .classed('dim', function(d) {
        if (d.id in state.nodes)
          return d.dim = state.nodes[d.id].dim || false; // do not dim by default
        return false;
      })
      // .style('display', function(d) {
      //   if (d.id in state.nodes)
      //     return (d.display = state.nodes[d.id].display || false) ? '' : 'none'; // hide by default
      //   return 'none'; // if the item is not in the state, the item might not have been created at the time when the state was created
      // });
      this.chart.selectAll('.linkg').select('path').attr('d', function(d) {
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
        // return "M" + sourceX + "," + sourceY + "A" + dist + "," + dist + " 0 0,1 " + targetX + "," + targetY;
        if (d.linknum > 1) return 'M' + sourceX + ',' + sourceY + 'A' + dr + ',' + dr + ' 0 0,1' + targetX + ',' + targetY;
        else return 'M' + sourceX + ',' + sourceY + ' L' + targetX + ',' + targetY;
      });
      this.chart.selectAll('.linkg')
        .classed('dim', function(d) {
          if (d.id in state.links)
            return d.dim = state.links[d.id].dim || false; // do not dim by default
          return false;
        })
        // .style('display', function(d) {
        //   if (d.id in state.links)
        //     return (d.display = state.links[d.id].display || false) ? '' : 'none'; // show by default
        //   return 'none'; // if the item is not in the state, the item might not have been created at the time when the state was created
        // });
      var z = state.zoom;
      this.zoom.translate(z.translate).scale(z.scale);
      this.chart.attr("transform", "translate(" + z.translate[0] + "," + z.translate[1]+ ")"
              + " scale(" + z.scale + ")");
      this.chart.select('.chart-area').call(this.zoom)
    },

    _getState: function() {
      var network_state = {nodes: {}, links: {}, zoom: {}}; // network state info
      this.chart.selectAll('.nodeg').each(function(d) {
        network_state.nodes[d.id] = {
          id: d.id,
          x: d.x,
          y: d.y,
          display: d.display, // whether the node is shown
          dim: d.dim // whether the node is dimmed
        };
      });
      this.chart.selectAll('.linkg').each(function(d) {
        network_state.links[d.id] = {
          id: d.id,
          display: d.display, // whether the node is shown
          dim: d.dim // whether the node is dimmed
        };
      });
      network_state.zoom = {
        translate: this.zoom.translate(),
        scale: this.zoom.scale()
      };
      return network_state;
    },

    _setupForceLayout: function() {
        var el = this.element.find('.ui-layout-center');
        this.margin = {top: 35, bottom: 5, left: 13, right: 5};
        this.width  = el.width() - this.margin.left - this.margin.right;
        this.height = el.height() - this.margin.top - this.margin.bottom;
        // mouse event vars
        this.selected_node = null,
        this.selected_link = null;
        this.mousedown_link = null;
        this.mousedown_node = null;
        this.mouseup_node = null;

        // set a uuid for each svg to avoid cross reference
        this.uuid = wb.utility.uuid();
        this.svg = d3.select(el[0])
            .each(function() { this.focus(); })
            .append("svg:svg")
            .attr('xmlns', 'http://www.w3.org/2000/svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr("pointer-events", "all")
            .attr('id', this.uuid)
        ;
        // define node image
        for (var i = 0; i < wb.store.static.entity_types.length; i++) {
            var entity_type = wb.store.static.entity_types[i];
            this.svg.append('svg:defs')
                .append('svg:pattern').attr('id', 'img-'+entity_type+'-'+this.uuid).attr('patternUnits', 'userSpaceOnUse').attr('x', '12').attr('y', '12').attr('height','24').attr('width','24')
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
        this.chart.selectAll('.linkg').select('path').attr('d', function(d) {
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

        this.chart.selectAll('.nodeg').attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
        });
    },

    _setupUI: function() {
      var html = '\
        <div class="ui-layout-center"> \
        </div> \
        <div class="ui-layout-west"> \
          <h4 style="padding: 3px;">Links</h4> \
        </div> \
        <div class="ui-layout-east"> \
          <h4 style="padding: 3px;">Team shared views</h4> \
          <ul id="view-list" class="sidebar-nav"> \
          </ul> \
        </div> \
      '
      var el = $(html).appendTo(this.element);
      var _this = this;
      this.layout = this.element.layout({ // jquery layout plugin, save this.layout because it is referred in resize()
        applyDemoStyles: true,
        west__size: 100,
        east__size: 300,
        east__initClosed: true,
        onresize: function() {
          _this.resizeNetwork();
        }
      });

      // filter bar
      var entity_types = wb.store.static.entity_types;
      var filterbar = '<div class="network-filterbar">';
      filterbar += '<button id="share-btn" class="btn btn-success btn-xs pull-right">Share</button>';
      // show user icons
      for (var i in wb.info.users) {
        if (i == USER) continue; // skip the user himself, add him later
        var u = wb.info.users[i];
        filterbar += '<div class="user-view-container pull-right"><a class="badge user-icon" href="#" data-user=' + i
          + ' title="View ' + u.name + '">' + u.name[0].toUpperCase() + '</a><span class="glyphicon glyphicon-eye-open hidden watching-icon"></span></div>';
      }
      // put current user first
      filterbar += '<a class="badge user-icon pull-right active" href="#" data-user=' + USER
        + ' title="Go back to your own view">' + wb.info.users[USER].name[0].toUpperCase() + '</a>';
      filterbar += '<ul>'
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
      filterbar += '</ul>';
      filterbar += '</div>'
      this.element.find('.ui-layout-center').append(filterbar);

      this.updateViewAvailability();

      $('.network-filterbar :checkbox').change(this._onSetFilter.bind(this));
      this.element.find('#share-btn').click(this._shareState.bind(this));
      this.element.on('click', '#clone-btn', this.cloneView.bind(this));
      this.element.find('.network-filterbar .user-icon').click(function(e) {
        if ($(e.target).hasClass('disabled')) return false;

        $(e.target).parent().parent().find('.user-icon').removeClass('active');
        var user = $(e.target).data('user');
        if (wb.info.online_users.indexOf(user.toString()) > -1) {
          $(e.target).addClass('active');
          if (user != USER) this.requestWatch(user);
          else this.stopWatch(this.watchUser);
        } else {
          alert('You cannot watch the view because your teammate is offline')
        }
      }.bind(this));

      var html = ' \
        <ul class="controls"> \
          <li class="control filter" title="Filter"> \
          <li class="control draw" title="Draw"> \
        </ul> \
      ';
      this.element.find('.ui-layout-center').append(html);

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

      // left bar
      var list_html = ' \
                      <div class="rel-div"> \
                        <input type="checkbox" id="label-control" checked> Show link labels \
                        <ul class="rel-list"> \
                        </ul> \
                      </div> \
      ';
      $(list_html).appendTo(this.element.find('.ui-layout-west'))
        .on('click', 'input[type=checkbox]', this.onFilterRel.bind(this))
        .on('mouseover', '.rel-item', this.onMouseOverRel.bind(this))
        .on('mouseout', '.rel-item', this.onMouseOutRel.bind(this));
      this.element.find('#label-control').click(this.onShowLinkLabel.bind(this));

      // right bar
      this.loadViews();

      // view event register
      this.element.find('ul#view-list').on('click', '.media-object', function(e) {
        var source = $(this).parent().parent().parent();
        var data = source.data();
        var username = data.user == USER ? 'You' : wb.info.users[data.user].name;
        $('#use-network-modal').data('state', data.state)
          .find('.username').text(username).end()
          .find('.timestamp').text(data.time).end()
          .find('#screenshot').html(data.image).end()
          .find('#viewId').val(data.id).end()
          .find('#comment').text(data.comment);
        // resize screenshot
        var svg = d3.select('#use-network-modal #screenshot>svg');
        var w = svg.attr('width'),
            h = svg.attr('height');
        svg.attr('viewBox', '0,0,' + w + ',' + h)
          .attr('width', 500)
          .attr('height', 300);

        $('#use-network-modal').modal();
      });
    },

  updateViewAvailability: function() {
    this.element.find('.user-icon').each(function(i, el) {
      var u = $(el).data('user');
      if (wb.info.online_users.indexOf(u.toString()) < 0 && u != USER) { // if the user is offline
        $(el).addClass('disabled');
        $(el).parent().find('.watching-icon').addClass('hidden');
        $(el).attr('title', 'You cannot watch the view since s/he is offline');
      } else {
        $(el).removeClass('disabled');
      }
    });
  },

  // request to watch teammate's view
  requestWatch: function(user) {
    // stop auto saving state to localStorage
    if (this.autoSave) clearInterval(this.autoSave);

    this.state = this._getState(); // save the current state
    this.watchUser = user; // the user I am watching
    $.publish('view/request', user);
    this.element.addClass('watch-' + user);
    // disable node drag
    this.chart.selectAll('.nodeg')
      .on("mousemove", null)
      .on("mouseup", null)
      .on("mousedown", null)
    // hide controls
    this.element.find('.control').addClass('hidden');
    var u = this.element.find('.network-filterbar .user-icon.active').data('user');
    this.svg.select('.watch-info').remove();
    this.svg.append('text').classed('watch-info', true)
      .attr('x', 10).attr('y', 20).text('Now watching the view from ' + wb.info.users[u].name);

    // change button
    this.element.find('#share-btn').replaceWith('<button id="clone-btn" class="btn btn-success btn-xs pull-right">Clone</button>')
  },

  // watch other's view stream
  watchStream: function(state) {
    this.useState(state);
  },

  // stop watch
  stopWatch: function(user) {
    this.watchUser = null;
    $.publish('view/stop', user);
    this.element.removeClass('watch-' + user);
    this.useState(this.state); // change back to original state
    this.svg.select('.watch-info').remove();
    // set auto save back
    this._registerAutoSave();
    // change button
    this.element.find('#clone-btn').replaceWith('<button id="share-btn" class="btn btn-success btn-xs pull-right">Share</button>')
  },

  // when others request watching my view
  watchRequested: function(user) {
    if (this.usersInWatch.indexOf(user) < 0) {
      this.usersInWatch.push(user);
      this.element.find('.user-view-container .user-icon').each(function(i, el) {
        if ($(el).data('user') == user) {
          $(el).parent().find('.watching-icon').removeClass('hidden');
          return false; // break the loop
        }
     });
   }
    this.streamState();
  },

  // when under watch, stream state
  streamState: function() {
    // if already in streaming, clear it first
    if (this.streamStateInterval) clearInterval(this.streamStateInterval);

    var usersInWatch = this.usersInWatch;
    var _this = this;
    this.streamStateInterval = setInterval(function() {
      // if users in usersInWatch are no longer online, stop streaming
      var tostream = usersInWatch.some(function(d) {
        return wb.info.online_users.indexOf(d) > -1 || wb.info.online_users.indexOf(d.toString()) > -1;
      });
      if (tostream) {
        var state;
        if (_this.watchUser) state = _this.state;  // if I am watching other's view, stream my prior saved view
        else state = _this._getState();
        $.publish('view/stream', {state: state, from: USER, to: usersInWatch});
      } else {
        clearInterval(this.streamStateInterval);
      }
    }, 100);
  },

  // when others stop watching my view
  watchStopped: function(user) {
    var i = this.usersInWatch.indexOf(user);
    if (i > -1) this.usersInWatch.splice(i, 1);
    if (this.usersInWatch.length < 1) clearInterval(this.streamStateInterval); // if nobody is watching my view, stop streaming
    this.element.find('.user-view-container .user-icon').each(function(i, el) {
      if ($(el).data('user') == user) {
        $(el).parent().find('.watching-icon').addClass('hidden');
        return false;
      }
    });
  },

  // clone other's view
  cloneView: function() {
    var state = this._getState();
    this.state = state;
    wb.utility.notify('You have cloned the view into yours');
  },

  loadViews: function() {
    var el = this.element.find('ul#view-list');
    var _this = this;
    $.get(GLOBAL_URL.network_view, {
      case: CASE,
      group: GROUP
    }, function(views) {
      for (var i = 0; i < views.length; i++)
        _this.loadView(views[i]);
    });
  },

  loadView: function(v) { // v: view data
    var el = this.element.find('ul#view-list');
    var str = '\
      <div class="media"> \
        <div class="media-left"> \
          <a href="#">  \
            <div class="screenshot media-object img-thumbnail" src="" alt="Shared view" style="width:210px;"></div> \
          </a> \
        </div> \
        <div class="media-body"> \
          <div> \
            <span class="username"></span> \
            <span class="timestamp"></span> \
          </div> \
          <div class="comment"></div> \
        </div> \
      </div>';
    var row = $(str).prependTo(el)
      .css('margin-left', v.depth * 10 + 'em')
      .find('.screenshot').html(v.image).end() // use inline svg as image src
      .find('.comment').text(v.comment).end()
      .find('.username').text(wb.info.users[v.created_by].name).end()
      .find('.timestamp').text(v.created_at).end()
      .data({
        'state': JSON.parse(v.state),
        'user': v.created_by,
        'comment': v.comment,
        'time': v.created_at,
        'image': v.image,
        'id': v.id,
        'depth': v.depth,
        'path': v.path
      });
    // resize svg
    var svg = d3.select(row[0]).select('.screenshot>svg');
    var w = svg.attr('width'),
        h = svg.attr('height');
    svg.attr('viewBox', '0,0,' + w + ',' + h)
      .attr('width', 200)
      .attr('height', 150);
  },

  _shareState: function() {
    var state = JSON.stringify(this._getState());
    var svg_html = this.element.find('.ui-layout-center>svg')[0].outerHTML.replace(/"/g, "'"); // replace double quote to single quote
    // get the id of this view's parent
    // parent can be null
    var parent = this.element.find('.ui-layout-center>svg').data('parent');
    // pop up share modal
    $('#share-network-modal').find('#case').val(CASE).end()
      .find('#parent').val(parent).end()
      .find('#group').val(GROUP).end()
      .find('#state').val(state).end()
      .find('textarea').val('').end()
      .find('#screenshot').html(svg_html);
    var svg = d3.select('#share-network-modal #screenshot>svg');
    var w = svg.attr('width'),
        h = svg.attr('height');
    svg.attr('viewBox', '0,0,' + w + ',' + h)
      .attr('width', 500)
      .attr('height', 300);
    var uuid = wb.utility.uuid(); // assign the svg a new uuid
    svg.attr('id', uuid);
    // change all referenced elements to this new uuid
    svg.selectAll('defs pattern').attr('id', function() {
      var old_id = this.id;
      old_id = old_id.split('-');
      return old_id[0] + '-' + old_id[1] + '-' + uuid;
    });
    svg.selectAll('.link').attr('id', function() {
      var old_id = this.id.split('-');
      return old_id[0] + '-' + old_id[1] + '-' + uuid;
    });
    svg.selectAll('.node').attr('fill', function() {
      var old = d3.select(this).attr('fill').split('-');
      return old[0] + '-' + old[1] + '-' + uuid + ')';
    });
    svg.selectAll('.link-text textpath').attr('xlink:href', function(d) {
      var old = d3.select(this).attr('xlink:href').split('-');
      return old[0] + '-' + old[1] + '-' + uuid;
    });
    $('#share-network-modal #image').val(svg[0][0].outerHTML);
    $('#share-network-modal').modal();
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
    // using color to highlight links
    var tar = $(e.target).find(':checkbox');
    if (!tar.length) return;
    var value = tar.val();
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
      if (rel.primary.relation === value) {
        d.display = true;
        return display;
      }
      d.display = false;
      return display;
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
    return this;
  },


    _onSetFilter: function(e) {
      var display = '';
      var value = e.target.value;

      if (! e.target.checked) {
          // hide node and associated links
          display = 'none';
      }
      this.svg.selectAll('.nodeg').transition().style('display', function(o) {
          var entity = wb.store.items.entities[o.id];
          if (entity.primary.entity_type === value) {
              o.display = true;
              return display;
          } else {
              return this.style.display;
          }
      });
      this.svg.selectAll('.linkg').transition().style('display', function(o) {
          var source_ent = wb.store.items.entities[o.source.id];
          var target_ent = wb.store.items.entities[o.target.id];
          if ((source_ent.primary.entity_type === value) || (target_ent.primary.entity_type === value)) {
              o.display = true;
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
        return this;
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
        return this;
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
            _this.chart.selectAll(".node").classed("selected", function(d) {
                return  e[0][0] <= d.x && d.x <= e[1][0]
                    && e[0][1] <= d.y && d.y <= e[1][1];
            });
        }

        function brushend() {
            d3.select(this).call(d3.event.target);
            var e = _this.brush.extent();
            // empty brush deselects all nodes
            if (_this.brush.empty()) {
              wb.filter.remove('network');
            }
            else {
                var filter = [];
                _this.chart.selectAll('.node.selected').each(function(d) {
                    filter.push(d.id);
                })
                wb.filter.set(filter, 'network', e);
            }
        }
        return this;
    },

    setNormalMode: function() {
        var _this = this;

        this.zoom.on('zoom', zoomed);
        this.chart.selectAll('.nodeg').call(this.drag
            .on("dragstart", dragstarted)
            .on("drag", dragged)
            .on("dragend", dragend)
        );
        this.chart.selectAll('.nodeg')
            .on('mouseover', this.onMouseOverNode.bind(this))
            .on('mouseout', this.onMouseOutNode.bind(this))
            .on('click', this.onClickNode.bind(this))
        ;
        this.chart.selectAll('.linkg')
          .on('mouseover', this.onMouseOverLink.bind(this))
          .on('mouseout', this.onMouseOutLink.bind(this))
          .on('click', this.onClickLink.bind(this));

        function dragstarted(d) {
            clearTimeout(_this.showNodeInfoTimer);
            d3.select(this).classed("dragging", true)
              .on('mouseover', null);
        }

        function dragged(d) {
            d3.event.sourceEvent.preventDefault();
//            d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
        }

        function dragend(d) {
          d3.event.sourceEvent.preventDefault();
          d3.select(this).classed("dragging", false)
            .on('mouseover', _this.onMouseOverNode.bind(_this));
          clearTimeout(_this.showNodeInfoTimer);
          d.fixed = true;
        }
        function zoomed() {
            _this.chart.attr("transform",
                "translate(" + d3.event.translate + ")"
                    + " scale(" + d3.event.scale + ")");
        }
        return this;
    },

    exitAllModes: function() {
        // exit draw mode
        this.svg.on("mousemove", null).on("mouseup", null);
        this.chart.selectAll('.nodeg')
          .on("mousemove", null)
          .on("mouseup", null)
          .on("mousedown", null)
          .on('mouseover', null)
          .on('mouseout', null)
          .on('click', null)
        ;
        this.chart.selectAll('.linkg')
          .on('mouseover', null)
          .on('mouseout', null)
        // exit zoom mode
        this.zoom.on('zoom', null);
//        this.svg.select('g.zoom').remove();
        // exit brush mode
        this.svg.select('.brush').remove();
        this.svg.on("mousemove.brush", null).on('mousedown.brush', null).on('mouseup.brush', null);
        // exit drag mode
        this.chart.selectAll('.nodeg').on('mousedown.drag', null);
        return this;
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
        return this;
    },

    hideLinkInfo: function() {
        setTimeout(function() {
          if (!$('.network-viewer:hover').length) {
            $('.network-viewer').hide();
            $('.network-viewer').data('link', null);
          }
        }, 300);
        return this;
    },

    hideNodeInfo: function() {
        setTimeout(function() {
          if (!$('.network-viewer:hover').length) {
            $('.network-viewer').hide();
            $('.network-viewer').data('node', null);
          }
        }, 300);
        return this;
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
          if ((a.source.id || a.source) > (b.source.id || b.source)) {return 1;}
          else if ((a.source.id || a.source) < (b.source.id || b.source)) {return -1;}
          else {
              if ((a.target.id || a.target) > (b.target.id || b.target)) {return 1;}
              if ((a.target.id || a.target) < (b.target.id || b.target)) {return -1;}
              else {return 0;}
          }
        });
        //any links with duplicate source and target get an incremented 'linknum'
        for (var i=0; i < links_temp.length; i++) {
          if (i != 0 &&
            (links_temp[i].source.id || links_temp[i].source) == (links_temp[i-1].source.id || links_temp[i-1].source) &&
            (links_temp[i].target.id || links_temp[i].target) == (links_temp[i-1].target.id || links_temp[i-1].target)) {
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
        return this;
    },

    updateView: function() {
      var nodes = [];
      var rels = {};

      if (this.nodes.length === 0) {
        return d3.select('.ui-layout-center').append('div')
          .attr('class', 'center-block placeholder')
          .attr('width', '200px')
          .style('text-align', 'center')
          .html('No entities created yet');
      }
      else d3.select('.ui-layout-center').selectAll('.placeholder').remove();

      this.svg.selectAll('.linkg').attr('display', function(d) {
        if (wb.store.shelf.relationships.indexOf(d.id) > -1) {
          nodes.push(d.source.id);
          nodes.push(d.target.id);

          // calculate relations
          var rel = wb.store.items.relationships[d.id];
          if (rel.primary.relation in rels) rels[rel.primary.relation]++;
          else rels[rel.primary.relation] = 1;
          d.display = true;
          return '';
        }
        d.display = false;
        return 'none';
      });
      this.svg.selectAll('.nodeg').attr('display', function(d) {
        // either relationship is selected or entities are selected
        if (nodes.indexOf(d.id) > -1 || wb.store.shelf.entities.indexOf(d.id) > -1) {
          d.display = true;
          return '';
        }
        d.display = false;
        return 'none';
      });

      this.showRelList(rels);
      return this;
    },

    reload: function() {
        this.updateData();
        this.update();
        return this;
    },

    resetMouseVars: function() {
        this.mousedown_node = null;
        this.mouseup_node = null;
        this.mousedown_link = null;
        return this;
    },

    restart: function() {
        var _this = this;
        var uuid = this.uuid;

        var link_d = this.chart.selectAll('.linkg').data(this.links);
        var link_g = link_d.enter().append("g").attr("class", "linkg");
        link_g.append('path')
          .attr('class', 'link')
          .attr('id', function(d) {
            return 'path-' + d.id + '-' + uuid;
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
            return '#path-' + d.id + '-' + uuid;
          })
          .attr('startOffset', '50%')
          .text(function(d) {
            return d.relation;
          });

        link_d.exit().remove();

        var node_d = this.chart.selectAll('.nodeg').data(this.nodes, function(d) { return d.id; });

        var g = node_d.enter().append("svg:g").attr('class', 'nodeg');

        g.append("svg:circle")
            .attr('class', 'node')
            .attr('r', 12)
            .attr('fill', function(d) {
                var entity = wb.store.items.entities[d.id];
                return "url(#img-" + entity.primary.entity_type + '-' + uuid + ")";
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
        for (var i = 0; i < 999; i++) this.force.tick();
        this.force.stop();
        window.force = this.force;
        return this;
    },

    // resize the whole layout, including the three layout sections and the network
    resize: function() {
      this._super('resize');
      // TODO: the width should be changed to center layout width
      this.layout.resizeAll();
      var el = this.element.find('.ui-layout-center');
      this.width = el.width() - this.margin.left - this.margin.right;
      this.height = el.height() - this.margin.top - this.margin.bottom;
      this.resizeNetwork();
      return this;
    },

    // resize the network
    resizeNetwork: function() {
      var el = this.element.find('.ui-layout-center');
      el.find('svg').attr('width', this.width).attr('height', this.height);
      el.find('svg').find('rect').attr('width', this.width).attr('height', this.height);
      this.scaleX .range([0, this.width]).domain([0, this.width]);
      this.scaleY .range([0, this.height]).domain([0, this.height]);
      this.zoom.x(this.scaleX).y(this.scaleY);
      this.brush.x(this.zoom.x()).y(this.zoom.y());
      this.force.size([this.width, this.height]).resume();
      return this;
    },

    onMouseOverNode: function(d) {
    },

    onMouseOutNode: function(d) {
    },

    onClickNode: function(d) {
      // show node detail
      d3.event.stopPropagation();
      if (d3.event.defaultPrevented) return; // ignore drag
      var pos = {top: d3.event.pageY, left: d3.event.pageX};
      var entity = wb.store.items.entities[d.id];
      wb.viewer.data(entity, 'entity').show(pos, 'network');
    },

    onMouseOverLink: function(d) {
    },

    onMouseOutLink: function(d) {
    },

    onClickLink: function(d) {
      // show link detail
      d3.event.stopPropagation();
      if (d3.event.defaultPrevented) return; // ignore drag
      var pos = {top: d3.event.pageY, left: d3.event.pageX};
      var rel = wb.store.items.relationships[d.id];
      wb.viewer.data(rel, 'relationship').show(pos, 'network');
    },

    defilter: function() {
      if (!this.brush) return;

      this.brush.clear();
      this.chart.select('.brush').call(this.brush);
    },

    highlight: function(item) {
      // highlight relationship
      this.highlightLink({id: +item});
      return this;
    },

    highlightLink: function(d) {
      this.chart.selectAll('.linkg').classed('dim', function(o) {
        if (o.id !== d.id) {
          return d.dim = true;
        } else {
          return d.dim = false;
        }
      });
      this.chart.selectAll('.nodeg').classed('dim', function(o) {
        if (o.id === d.source.id || o.id === d.target.id) {
          return d.dim = false;
        } else {
          return d.dim = true;
        }
      });
      return this;
    },

    unhighlightLink: function() {
      this.chart.selectAll('.nodeg').classed('dim', function(d) { return d.dim = false; });
      this.chart.selectAll('.linkg').classed('dim', function(d) { return d.dim = false; });
      return this;
    },

    highlightNode: function(nodeData) {
        var connected_nodes = [nodeData.id];

        this.chart.selectAll('.linkg').classed('dim', function(o) {
          if (o.source.id === nodeData.id) {
            connected_nodes.push(o.target.id);
            return o.dim = false;
          } else if (o.target.id === nodeData.id) {
            connected_nodes.push(o.source.id);
            return o.dim = false;
          } else {
            return o.dim = true;
          }
        });
        this.chart.selectAll('.nodeg').classed('dim', function(o) {
          if(connected_nodes.indexOf(o.id) < 0) {
            return o.dim = true;
          } else {
            return o.dim = false;
          }
        });
        // highlight links if both its source and target are highlighted
        // update: it seems unnecessary to transverse again
        // container.selectAll('.link').classed('dim', function(o) {
        //   if (connected_nodes.indexOf(o.source.id) > -1
        //       && connected_nodes.indexOf(o.target.id) > -1) {
        //     d3.select(this).classed('active', true);
        //     return false;
        //   }
        //   d3.select(this).classed('active', false);
        //   return true;
        // })

        // d3.select(this).select('circle').attr('transform', 'scale(1.5)');
        return this;
    },

    unhighlightNode: function() {
      this.chart.selectAll('.nodeg').classed('dim', function(d) { return d.dim = false; });
      this.chart.selectAll('.linkg').classed('dim', function(d) { return d.dim = false; });
      return this;
    },

    destroy: function() {
      this._super('destroy');
      if (this.autoSave) clearInterval(this.autoSave); // clear auto save interval
      if (this.streamStateInterval) clearInterval(this.streamStateInterval); // clear auto save interval
      if (this.watchUser) this.stopWatch(this.watchUser);
    },

    help: function() {
      var hint = new EnjoyHint({});
      hint.set(wb.help.network);
      hint.run();
      return this;
    }
});
