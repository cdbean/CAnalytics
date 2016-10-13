wb.filter = {
  filter: {},
};

// @label: label of the filter
// @data:
//    - item
//    - id
wb.filter.set = function(data, tool, window) {
  var shelf_by = wb.store.shelf_by.entities;
  var _this = this;

  if (this.filter[tool]) {
    // if there already exists such a filter
    // remove the filter first
    shelf_by = shelf_by.filter(function(d) {
      return _this.filter[tool].indexOf(d) < 0;
    })
  }
  wb.store.shelf_by.entities = wb.utility.uniqueArray(shelf_by.concat(data))

  this.filter[tool] = data;

  this.update();

  $.publish('data/filter', window);

  wb.log.log({
    operation: 'filtered',
    tool: tool,
    public: false
  });
};

wb.filter.update = function() {
  var item = d3.select('.filter-div .filter-list').selectAll('.filter-item')
    .data(d3.keys(this.filter))

  item.exit().remove();

  var itemEnter = item.enter().append('li').attr('class', 'filter-item')
  itemEnter.append('a').attr('class', 'wb-item')
  itemEnter.append('span').attr('class', 'remove glyphicon glyphicon-remove')

  item.select('a').text(function(d) { return d; })
};

wb.filter.remove = function(item) {
  if (item && this.filter[item] && this.filter[item].length) {
    for (var i = 0, len = this.filter[item].length; i < len; i++) {
      var id = this.filter[item][i];
      var j = wb.store.shelf_by.entities.indexOf(id)
      wb.store.shelf_by.entities.splice(j, 1)
    }
  }
  wb.log.log({
    operation: 'defiltered',
    item: item,
    tool: item,
    public: false
  });

  delete this.filter[item];

  $.publish('data/filter');

  this.update();
};
