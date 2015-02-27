(function() {
  // do when items are added or removed from store
  $.subscribe('data/loaded', function() {
    watch(wb.store, function(prop, action, difference, oldval) {
      var shelf = wb.shelf[prop];
      if (shelf) {
        if (difference) {
          if (difference.added.length) {
            difference.added.forEach(function(d) {
              shelf.push(+d);
            })
            put_on_shelf(prop);
          }
          if (difference.removed.length) {
            difference.removed.forEach(function(d) {
              var i = shelf.indexOf(+d);
              shelf.splice(i, 1);
            });
          }
          $.publish('data/update', prop);
        }
      }
    }, 1, true); // one level deep

  });


  // watch(wb.shelf_by, function() {
  //   // do when filtering condition changes
  //   reset_shelf();
  //   put_on_shelf();
  //   $.publish('data/filter');
  // });


})();
