// after all data loaded
$.subscribe('data/loaded', function() {
  // $('ul.dataset-list input:checkbox:first').prop('checked', true);
  $('ul.dataset-list input:checkbox').change();
});


// after data is updated, e.g. new annotation, entity, rel
// shelf is annotation, entity, rel, or dataentry
// call updateData() of the corresponding view
$.subscribe('data/update', function(shelf) {

});

// after filtering
// call update() of views
$.subscribe('data/filter', function() {

});
