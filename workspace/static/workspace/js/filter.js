wb.filter = {};

// @label: label of the filter
// @data: 
//    - item
//    - id
wb.filter.add = function(label, data, tool) {
  var item = '<li class="filter-item"></li>';
  $(item).appendTo($('.filter-div .filter-list'))
    .attr('id', data.item + '-' + data.id)
    .append('<a class="wb-item"></a><span class="glyphicon glyphicon-remove remove"></span>')
    .find('a')
    .text(label)
    .data(data);
};

wb.filter.remove = function(item, data) {
  var logdata;
  if (data.id) {
    // if the item has id, it is an entity/relationship/annotation
    // remove from the store shelf
    if (data.item ===  'relationship') {
      var i = wb.store.shelf_by.relationships.indexOf(data.id);
      wb.store.shelf_by.relationships.splice(i, 1);
      logdata = wb.log.logItem(wb.store.items.relationships[data.id]);
    } else if (data.item === 'annotation') {
      var i = wb.store.shelf_by.annotations.indexOf(data.id);
      wb.store.shelf_by.annotations.splice(i, 1);
      logdata = wb.log.logAnnotation(wb.store.items.annotations[data.id]);
    } else if (data.item === 'dataentry') {
      var i = wb.store.shelf_by.dataentries.indexOf(data.id);
      wb.store.shelf_by.dataentries.splice(i, 1);
      logdata = wb.log.logDoc(wb.store.items.dataentries[data.id]);
    } else {
      var i = wb.store.shelf_by.entities.indexOf(data.id);
      wb.store.shelf_by.entities.splice(i, 1);
      logdata = wb.log.logItem(wb.store.items.entities[data.id]);
    }
    
    wb.log.log({
      operation: 'defiltered',
      item: data.item,
      data: logdata, 
      tool: 'filter bar',
      public: false
    });
  }  
  $(item).remove();


  $.publish('data/filter');
};
