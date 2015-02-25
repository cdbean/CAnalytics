loadData();
wb.viewer = $('<div>').appendTo('body').vizviewer().data('instance');



$(function() {
  $('ul.dataset-list input:checkbox').change(updateDataset);

  $('.viz-opts').click(onVizSelect);

  $('body').on('click', 'a.entity, span.entity', onClickEntity);
  $('body').on('click', onClickOutside);
});


function onClickOutside() {
  wb.viewer.hide();
}

function onClickEntity(e) {
  var entity = $(e.target).data('entity');
  if (entity)
    wb.viewer.data(entity, 'entity').show(wb.utility.mousePosition(e, 'body'));
  e.stopPropagation();
}

function onVizSelect(e) {
  var viz_opt = $(this).attr('id').split('-')[0];
  viz_opt = viz_opt.split('_');
  var viz_name = viz_opt[0];
  var viz_form = viz_opt[1];
  var viz;
  if (viz_form === 'table') {
      viz = $('<div>').vizentitytable({
          title: viz_name,
          entity: viz_name,
      });
  } else if (viz_name === 'dataentry') {
      viz = $('<div>').vizdataentrytable({
          title: 'Data Entry',
      });
  } else if (viz_name === 'timeline') {
      viz = $('<div>').viztimeline({
          title: 'Timeline',
      });
  } else if (viz_name === 'map') {
      viz = $('<div>').vizmap({
          title: 'Map',
      });
  } else if (viz_name === 'network') {
      viz = $('<div>').viznetwork({
          title: 'Network',
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
      url: GLOBAL_URL.history
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
    if (d.primary.geometry) d.primary.geometry = wb.utility.formatGeometry(d);
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
}


