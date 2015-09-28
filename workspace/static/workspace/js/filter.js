wb.filter = {};

// @label: label of the filter
// @data: 
//    - item
//    - id
wb.filter.add = function(label, data) {
  var item = '<li class="filter-item"></li>';
  $(item).appendTo($('.filter-div .filter-list'))
    .attr('id', data.item + '-' + data.id)
    .append('<a class="entity"></a><span class="glyphicon glyphicon-remove remove"></span>')
    .find('a')
    .text(label)
    .data(data);

};

wb.filter.remove = function(item, data) {
  if (data.id) {
    // if the item has id, it is an entity/relationship/annotation
    // remove from the store shelf
    if (data.item ===  'relationship') {
      var i = wb.store.shelf_by.relationships.indexOf(data.id);
      wb.store.shelf_by.relationships.splice(i, 1);
    } else if (data.item === 'annotation') {
      var i = wb.store.shelf_by.annotations.indexOf(data.id);
      wb.store.shelf_by.annotations.splice(i, 1);
    } else {
      var i = wb.store.shelf_by.entities.indexOf(data.id);
      wb.store.shelf_by.entities.splice(i, 1);
    }
  } else {
    if (data.item === 'time') {
      // if time filter is removed
      // remove all event entities from shelf_by
      wb.store.shelf_by.entities = wb.store.shelf_by.entities.filter(function(d) {
        return wb.store.items.entities[d].primary.entity_type !== 'event';
      });
    } else if (data.item === 'map') {
      // if map filter is removed
      // remove all location entities from shelf_by
      wb.store.shelf_by.entities = wb.store.shelf_by.entities.filter(function(d) {
        return wb.store.items.entities[d].primary.entity_type !== 'location';
      });
    }
  }
  $(item).remove();
  $.publish('data/filter');
};
