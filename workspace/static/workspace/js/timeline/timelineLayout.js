d3.timelineLayout = function() {
  var timeline = {},
      nodeHeight = 20,
      nodeMinWidth = 10,
      nodeMaxWidth = 100,
      trackBy = '',
      width = 1,
      height = 1,
      nodePadding = 5,
      data = [],
      nodes = [],
      tracks = {};
  var scale = null;
  var TRACKSET = ['person', 'location', 'resource', 'organization']; // predefined tracks

  timeline.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return timeline
  }

  timeline.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return timeline
  }

  timeline.data = function(_) {
    if (!arguments.length) return data;
    data = _;
    return timeline
  }

  timeline.trackBy = function(_) {
    if (!arguments.length) return trackBy;
    trackBy = _;
    return timeline
  }

  timeline.nodeHeight = function(_) {
    if (!arguments.length) return nodeHeight;
    nodeHeight = _;
    return timeline
  }

  timeline.nodes = function() {
    return nodes;
  }

  timeline.tracks = function() {
    return tracks;
  }

  timeline.scale = function(s) {
    scale = s;
    return timeline;
  }

  timeline.layout = function() {
    // computeScale();
    sortNodes();
    computeNodes();
    return timeline;
  }

  function computeScale() {
    var min = d3.min(data, function(d) { return d.start; })
    var max = d3.max(data, function(d) { return d.end; })
    scale = d3.time.scale()
      .domain([min, max])
      .rangeRound([0, width])
      .nice(d3.time.week)
  }

  function sortNodes() {
    data.sort(function(a, b) {
      return a.start - b.start;
    })
    data.forEach(function(d) {
      if (TRACKSET.indexOf(trackBy) > -1) { //
        // if the event does not have this track, include the event in 'other' track
        var entity = wb.store.items.entities[d.id];
        var id = entity.primary[trackBy]
        // an event could involve multiple persons for example
        if (id instanceof Array) {
          for (var i = 0; i < id.length; i++) {
            var idd = id[i];
            var name = wb.store.items.entities[idd].primary.name;
            if (!(name in tracks)) tracks[name] = {trackNum: 0, nodes: [], label: name};
            var node = JSON.parse(JSON.stringify(d))
            // after clone, the date becomes string, turn them to Date object again
            node.start = wb.utility.Date(node.start)
            node.end = wb.utility.Date(node.end)
            tracks[name].nodes.push(node)
          }
        } else {
          if (id)
            var trackname = wb.store.items.entities[id].primary.name;
          else
            var trackname = 'other';
          if (!(trackname in tracks)) tracks[trackname] = {trackNum: 0, nodes: [], label: trackname};
          var node = JSON.parse(JSON.stringify(d))
          // after clone, the date becomes string, turn them to Date object again
          node.start = wb.utility.Date(node.start)
          node.end = wb.utility.Date(node.end)
          tracks[trackname].nodes.push(node)
        }
      } else { // if 'trackBy' is not provided, assign a '0' track
        tracks[0] = tracks[0] || {trackNum: 0, nodes: [], label: ''};
        var node = JSON.parse(JSON.stringify(d))
        // after clone, the date becomes string, turn them to Date object again
        node.start = wb.utility.Date(node.start)
        node.end = wb.utility.Date(node.end)
        tracks[0].nodes.push(node)
      }
    });
  }

  function computeNodes() {
    var trackHeight = height; // the accumulated height of tracks

    for (var trackName in tracks) {
      var trackNodes = tracks[trackName].nodes;
      var lastNode = null;
      var trackPos = []; // the position of all sub tracks
      tracks[trackName].start = trackHeight;
      trackNodes.forEach(function(d) {
        d.x = scale(d.start)
        d.width = scale(d.end) - scale(d.start)
        d.width = Math.max(nodeMinWidth, Math.min(d.width, nodeMaxWidth))
        d.height = nodeHeight;
        for (var i = 0; i < trackPos.length; i++) {
          if (d.x > trackPos[i]) break;
        }
        d.track = i + 1;
        // TODO: set the node end as text or node (whichever is bigger)
        trackPos[i] = d.x + d.width;
        d.y = trackHeight - d.track * (nodeHeight + nodePadding);
        nodes.push(d);
      })
      tracks[trackName].trackNum = trackPos.length;
      tracks[trackName].height = trackPos.length * (nodeHeight + nodePadding);
      trackHeight -= tracks[trackName].height;
    }
  }

  return timeline;

}
