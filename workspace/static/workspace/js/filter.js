wb.filter = {
  // filter: {
  //   window_id: {
  //     tool: 'network', or 'person table', 'timeline', etc
  //     filter: [entity id],
  //     windowId: 'window_id',
  //   }
  // }
  filter: {},
};

// @label: label of the filter
// @data:
//    - item
//    - id
wb.filter.set = function(data, tool, windowId) {
  var shelf_by = wb.store.shelf_by.entities;
  var _this = this;

  if (this.filter[windowId]) {
    // if there already exists such a filter
    // remove the filter first
    shelf_by = shelf_by.filter(function(d) {
      return _this.filter[windowId].filter.indexOf(d) < 0;
    })
  } else {
    this.filter[windowId] = {};
  }
  wb.store.shelf_by.entities = wb.utility.uniqueArray(shelf_by.concat(data))

  this.filter[windowId] = {
    filter: data,
    windowId: windowId,
    tool: tool
  };

  this.update();

  $.publish('data/filter', windowId);

  wb.log.log({
    operation: 'filtered',
    tool: tool,
    public: false
  });
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

wb.filter.remove = function(windowId) {
  if (!windowId || !this.filter[windowId]) return;

  var filter = this.filter[windowId].filter;
  var tool = this.filter[windowId].tool;

  for (var i = 0, len = filter.length; i < len; i++) {
    var id = filter[i];
    var j = wb.store.shelf_by.entities.indexOf(id);
    wb.store.shelf_by.entities.splice(j, 1);
  }

  var $viz = $(windowId).data('instance');
  if ($viz) $viz.defilter();

  wb.log.log({
    operation: 'defiltered',
    tool: tool,
    public: false
  });

  delete this.filter[windowId];

  $.publish('data/filter');

  this.update();
};
