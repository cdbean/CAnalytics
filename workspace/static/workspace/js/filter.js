wb.filter = {
  // filter: {
  //   window_id: {
  //     tool: 'network', or 'person table', 'timeline', etc
  //     filter: [entity id],
  //     brushExtent: [] // the brush applied in the viz
  //   }
  // }
  filter: {},
};

// @label: label of the filter
// @data:
//    - item
//    - id
wb.filter.set = function(data, tool, brush, logged) {
  if (arguments.length < 4) logged = true;
  if (logged) {
    wb.log.log({
      operation: 'filtered',
      item: 'entity',
      tool: tool,
      data: wb.log.logItem(data),
      public: false
    });
  }

  var shelf_by = wb.store.shelf_by.entities;
  var _this = this;

  if (this.filter[tool]) {
    // if there already exists such a filter
    // remove the filter first
    shelf_by = shelf_by.filter(function(d) {
      return _this.filter[tool].filter.indexOf(d) < 0;
    })
  } else {
    this.filter[tool] = {};
  }
  wb.store.shelf_by.entities = wb.utility.uniqueArray(shelf_by.concat(data))

  this.filter[tool] = {
    filter: data,
    tool: tool,
    brushExtent: brush
  };

  this.update();

  $.publish('data/filter', tool);

};

wb.filter.update = function() {
  var item = d3.select('.filter-div .filter-list').selectAll('.filter-item')
    .data(d3.values(this.filter))

  item.exit().remove();

  var itemEnter = item.enter().append('li').attr('class', 'filter-item')
  itemEnter.append('a')
  itemEnter.append('span').attr('class', 'remove glyphicon glyphicon-remove')

  item.select('a').text(function(d) { return d.tool; })
};

wb.filter.remove = function(tool, logged) {
  if (arguments.length < 2) logged = true;
  if (logged) {
    wb.log.log({
      operation: 'defiltered',
      tool: tool || 'All',
      public: false
    });
  }

  if (!tool) {
    // remove all filters
    this.filter = {};
    wb.store.shelf_by.entities = [];
    $.publish('data/filter');
    $('.viz').each(function(i, v) {
      var $viz = $(v).data('instance');
      if ($viz && $viz.defilter) $viz.defilter();
    });
    return this.update();
  }

  if (!(tool in this.filter)) {
    // if somehow we do not have the filter, do nothing
    return;
  }

  delete this.filter[tool];

  // recomputer shelf_by
  var shelf_by = wb.store.shelf_by.entities = [];
  for (var t in this.filter) {
    this.filter[t].filter.forEach(function(ent) {
      if (!(ent in shelf_by)) {
        shelf_by.push(ent);
      }
    });
  }

  // if tool = 'person table', change it to 'person.table'
  var $viz = $('.viz.' + tool.replace(' ', '.')).data('instance');
  if ($viz) $viz.defilter();

  $.publish('data/filter');

  this.update();
};
