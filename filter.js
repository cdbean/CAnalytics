wb.filter = {};

// @label: label of the filter
// @data: 
//    - item
//    - id
wb.filter.add = function(label, data) {
  var item = '<li class="filter-item"></li>';
  $(item).attr('id', data.item + '-' + data.id)
    .append('<a class="entity"></a><span class="close"></span>');
  $(item).find('a').text(label).data(data);

  $(item).appendTo($('.filter-div .filter-list'));
};

wb.filter.remove = function(data) {
  var id = '#' + data.item + '-' + data.id;
  var data = $(id).data();
  // remove from the store shelf
  var i = wb.store.shelf_by[data.item].indexOf(data.id);
  wb.store.shelf_by[data.item].split(i, 1);
  $(id).remove();
};
