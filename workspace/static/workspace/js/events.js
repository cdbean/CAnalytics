// after all data loaded
$.subscribe('data/loaded', function() {
  // $('ul.dataset-list input:checkbox:first').prop('checked', true);
  // $('ul.dataset-list input:checkbox').change();
});


// after data is updated, e.g. new annotation, entity, rel
// shelf is annotation, entity, rel, or dataentry
// call updateData() of the corresponding view
$.subscribe('data/update', onDataUpdated);

// after filtering
// call update() of views
$.subscribe('data/filter', onDataFiltered);


$.subscribe('entity/created', onEntitiesCreated);

$.subscribe('relationship/created', onRelationshipsCreated);


function onDataUpdated(e, shelf) {

}

function onDataFiltered() {
  updateViews();
}

function onEntitiesCreated() {
  var entities = [].slice.call(arguments, 1);

  for (var i = 0, len = entities.length; i < len; i++) {
    var entity = entities[i];
    if (entity.primary.entity_type === 'location') {
        entity.primary.geometry = wb.utility.formatGeometry(entity);
    }
    wb.store.entities[entity.meta.id] = entity;
  }
}

function onRelationshipsCreated() {
  var relationship = [].slice.call(arguments, 1);
  for (var i = 0, len = relationships.length; i < len; i++) {
    var rel = relationships[i];
    wb.store.relationships[rel.meta.id] = rel;
  }
}

function updateViews() {
  $('.viz').each(function(i, viz) {
    var viz = $(viz).data('instance');
    if (viz) {
      viz.updateData();
      viz.update();
    }
  })
}
