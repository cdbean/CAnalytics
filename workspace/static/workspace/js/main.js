loadData();


$.subscribe('data/loaded', function() {
  // $('ul.dataset-list input:checkbox:first').prop('checked', true);
  $('ul.dataset-list input:checkbox').change();
});

$(function() {
  $('ul.dataset-list input:checkbox').change(updateDataset);

  $('.viz-opts').click(onVizSelect);
});


function onVizSelect(e) {
  var viz_opt = $(this).attr('id').split('-')[0];
  viz_opt = viz_opt.split('_');
  var viz_name = viz_opt[0];
  var viz_form = viz_opt[1];
  var viz;
  if (viz_form === 'table') {
      viz = $('<div>').vizentitytable({
          title: viz_name,
          dimension: wb.cf.dim[viz_name],
          group: wb.cf.group[viz_name]
      });
  } else if (viz_name === 'dataentry') {
      viz = $('<div>').vizdataentrytable({
          title: 'Data Entry',
          data: wb.shelf.dataentries
      });
  } else if (viz_name === 'timeline') {
      viz = $('<div>').viztimeline({
          title: 'Timeline',
          width: 800,
          height: 200,
          dimension: wb.cf.dim.date,
          group: wb.cf.group.date
      });
  } else if (viz_name === 'map') {
      viz = $('<div>').vizmap({
          title: 'Map',
          dimension: wb.cf.dim.location,
          group: wb.cf.group.location
      });
  } else if (viz_name === 'network') {
      viz = $('<div>').viznetwork({
          title: 'Network',
          dimension: wb.cf.dim.relationship,
          group: wb.cf.group.relationship
      });
  } else if (viz_name === 'notepad') {
      viz = $('<div>').viznotepad({
          title: 'Notepad'
      });
  } else if (viz_name === 'message') {
    viz = $('<div>').vizmessage({
      title: 'Message'
    });
  } else if (viz_name === 'history') {
    viz = $('<div>').vizhistory({
      title: 'History',
      url: 'logs'
    });
  }
}

function loadData() {
  $.get(GLOBAL_URL.data, {
    case: wb.info.case,
    group: wb.info.group
  }, onLoadData);
}


function onLoadData(data) {
  data.users.forEach(function(d) {
    wb.info.users[d.id] = d;
  });
  data.entities.forEach(function(d) {
    if (d.primary.date) d.primary.date = wb.utility.Date(d.primary.date);
    wb.store.entities[d.meta.id] = d;
  });
  data.relationships.forEach(function(d) {
    wb.store.relationships[d.meta.id] = d;
  });
  data.annotations.forEach(function(d) {
    wb.store.annotations[d.id] = d;
  });
  data.datasets.forEach(function(d) {
    wb.store.datasets[d.id] = d;
  });
  data.dataentries.forEach(function(d) {
    wb.store.dataentries[d.id] = d;
  });

  $.publish('data/loaded');
}

function updateDataset() {
  var ds = [];
  $('ul.dataset-list input:checkbox:checked').each(function() {
    ds.push(parseInt($(this).val()));
  });
  wb.shelf_by.datasets = ds;
  updateViews();
}


function updateViews() {
  $('.viz').each(function(i, viz) {
    var viz = viz.data('instance');
    if (viz) {
      viz.updateData();
      viz.update();
    }
  })
}
