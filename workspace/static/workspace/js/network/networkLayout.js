wb.viz.networkLayout = function() {
  var network = {},
      width = 1,
      height = 1,
      nodes = [],
      links = [];
  var force = null;

  network.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return network
  }

  network.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return network
  }

  network.nodes = function(_) {
    if (!arguments.length) return nodes;
    nodes = _;
    return network
  }

  network.links = function(_) {
    if (!arguments.length) return links;
    links = _;
    return network
  }

  network.linkPath = function() {

  }

  network.layout = function() {
    force = d3.layout.force()
      .nodes(nodes)
      .links(links)
      .charge(charge)
      .linkDistance(linkDistance)
      .size([width, height])
      .on('tick', tick);

    return network;
  }
  return network;
}
