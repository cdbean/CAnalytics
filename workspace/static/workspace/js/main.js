// entry of the app
//
$('#progressbar').show().progressbar({ value: false });

// load data
wb.store.loadItems(GLOBAL_URL.data, {
  case: CASE,
  group: GROUP
});

// initialize viewer
wb.viewer = $('<div>').appendTo('body').vizviewer().data('instance');
wb.editor = $('<div>').appendTo('body').vizeditor().data('instance');

$.get(GLOBAL_URL.case_info, {
  case: CASE,
  group: GROUP
}, function(res) {
  res.case.start_date = wb.utility.Date(res.case.start_date);
  res.case.end_date = wb.utility.Date(res.case.end_date);
  wb.info.case = res.case;
  wb.info.group = res.group;
  wb.info.othergroups = res.othergroups;
  wb.info.userRole = res.user_role;
  var users = res.users;
  for (var i = 0, len = users.length; i < len; i++) {
    var user = users[i];
    // if already exists, do nothing
    if (user.id in wb.info.users) continue;
    user.color = '#ff7f0e';
    wb.info.users[user.id] = user;
  }

  // load hypotheses
  $.get(GLOBAL_URL.hypothesis, {
    case: CASE,
    group: GROUP
  }, function(res) {
    wb.hypothesis.addItems(res).updateView();
  });
});

$(function() {


  $(window).on('beforeunload', onBeforeUnload)
  $('.filter-div').on('click', '.filter-item .remove', onRemoveFilter);
  $('ul.dataset-list input:checkbox').change(onDatasetChecked);
  $('#case-info').click(onCaseInfo);
  $('.viz-opts').click(onVizSelect);
  $('#case-sync').click(onSyncCase);
  $('#createHypoBtn').click(onCreateHypoBtnClick);

  $('#create-hypothesis-modal form').on('submit', function(e) {
    e.preventDefault();
    $.ajax({
      type: 'post',
      url: $(this).attr('action'),
      data: $(this).serialize(),
      success: function() {
      },
    });
    $('#create-hypothesis-modal').modal('hide');
  });

  $('#view-hypothesis-modal form').on('submit', function(e) {
    e.preventDefault();
    var state = JSON.parse($('#view-hypothesis-modal').find('#view').val());
    var currentPath = $('#view-hypothesis-modal').find('#path').val().split(',').map(function(d) { return +d; });
    wb.hypothesis.setCurrent(currentPath[currentPath.length - 1])
    wb.utility.setAllState(state);

    $('#view-hypothesis-modal').modal('hide');
    wb.utility.notify('You have changed to the view of the hypothesis');
  });

  $('body').on('mouseover', '.wb-item', onMouseOverEntity);
  $('body').on('mouseout', '.wb-item', onMouseOutEntity);
  $('body').on('click', '.wb-item', onClickEntity);
  $('body').on('click', onClickOutside);
  $('body').on('mouseleave', '.viewer', function() {
    wb.viewer.hide();
  })
  $('a#user_color').colorpicker().on('changeColor.colorpicker', onChangeUserColor);
  $('a#main_help').click(function() {
    var hint = new EnjoyHint({});
    hint.set(wb.help.main);
    hint.run();
  });

  // if (!$.cookie('hinted')) {
  //   var hint = new EnjoyHint({});
  //   hint.set(wb.help.main);
  //   hint.run();
  //   $.cookie('hinted', true);
  // }

  function onCreateHypoBtnClick() {
    var state = wb.utility.getAllState();
    var current = wb.hypothesis.current;

    $('#create-hypothesis-modal').find('#case').val(CASE).end()
      .find('#path').val(wb.hypothesis.currentPath).end()
      .find('#group').val(GROUP).end()
      .find('#view').val(JSON.stringify(state)).end()
      .find('#message').val('').end();
    if (current) {
      $('#heritanceDiv').show();
      $('#create-hypothesis-modal')
        .find('#hypoRef .username').text(wb.info.users[current.created_by].name).end()
        .find('#hypoRef .timestamp').text(current.created_at).end()
        .find('#refMessage').text(current.message).end()
    } else {
      $('#heritanceDiv').hide();
    }
    $('#create-hypothesis-modal').modal();
  }

  function onBeforeUnload() {
    // if the user is watching, stop watching first
    var watchingUser = $('.userlist-item .watching')
    if (watchingUser.length) {
      var id = +watchingUser.attr('id').split('-')[1];
      $.publish('view/stop', id);
    }

    wb.log.log({
      operation: 'logout',
      item: '',
      tool: '',
      public: false
    });

    // store tool windows size and position in cookie, for later restore
    wb.utility.saveAllState();

    $.post('/sync/leave', {
      'case': CASE,
      'group': GROUP
    });

    return 'Are you leaving?';
  }

  function onSyncCase() {
    $('#progressbar').show().progressbar({ value: false });
    // load data
    wb.store.reloadItems(GLOBAL_URL.data, {
      case: CASE,
      group: GROUP
    });
  }

  function onRemoveFilter(e) {
    var item = $(e.target).parent()[0].__data__;
    wb.filter.remove(item.windowId);
  }

  function onClickOutside() {
    wb.viewer.hide();
  }

  function onMouseOverEntity(e) {
    window.showViewerTimer = setTimeout(function() {
      var ent = $(e.target).data('entity');
      if (ent) {
        var entity = wb.store.items.entities[ent.id || ent]; // ent could be an object or an id only
        wb.viewer.data(entity, 'entity').show(wb.utility.mousePosition(e, 'body'), 'name tag');
      } else {
        var rel = $(e.target).data('relationship');
        if (rel) {
          var relationship = wb.store.items.relationships[rel.id || rel];
          wb.viewer.data(relationship, 'relationship').show(wb.utility.mousePosition(e, 'body'), 'name tag');
        }
      }
    }, 500);
    e.stopPropagation();
  }

  function onMouseOutEntity(e) {
    clearTimeout(window.showViewerTimer);
    setTimeout(function() {
      if (!$('.viewer:hover').length) {
        wb.viewer.hide();
      }
    }, 300);
  }

  function onClickEntity(e) {
    $(e.target).toggleClass('filtered');
    var tofilter = $(e.target).hasClass('filtered');
    var ent = $(e.target).data('entity');
    if (ent) {
      ent = wb.store.items.entities[ent.id || ent];
      if ($.isEmptyObject(ent)) return false;

      if (tofilter) {
        var i = wb.store.shelf_by.entities.indexOf(ent.meta.id);
        if (i < 0) wb.store.shelf_by.entities.push(ent.meta.id);
        wb.filter.add(ent.primary.entity_type + ': ' + ent.primary.name, {
          id: ent.meta.id,
          item: ent.primary.entity_type,
          tool: 'reference'
        });
        wb.log.log({
            operation: 'filtered',
            item: ent.primary.entity_type,
            tool: 'reference',
            data: wb.log.logItem(ent),
            public: false
        });
      } else {
        $('.filter-div .filter-item').filter(function(i, item) {
          var d = $(item).find('a').data();
          return d.tool === 'reference' && d.id === ent.meta.id && d.item === ent.primary.entity_type;
        }).remove();
        var i = wb.store.shelf_by.entities.indexOf(ent.meta.id);
        if (i >= 0) wb.store.shelf_by.entities.splice(i, 1);
        wb.log.log({
            operation: 'defiltered',
            item: ent.primary.entity_type,
            tool: 'reference',
            data: wb.log.logItem(ent),
            public: false
        });
      }
    } else {
      var rel = $(e.target).data('relationship');
      if (rel) {
        rel = wb.store.items.relationships[rel.id || rel];
        if ($.isEmptyObject(rel)) return false;
        if (tofilter) {
          var i = wb.store.shelf_by.relationships.indexOf(rel.meta.id);
          if (i < 0) wb.store.shelf_by.relationships.push(rel.meta.id);
          wb.filter.add('relationship: ' + rel.primary.relation, {
            id: rel.meta.id,
            item: 'relationship',
            tool: 'reference'
          });
          wb.log.log({
              operation: 'filtered',
              item: 'relationship',
              tool: 'reference',
              data: wb.log.logItem(rel),
              public: false
          });
        } else {
          $('.filter-div .filter-item').filter(function(i, item) {
            var d = $(item).find('a').data();
            return d.tool === 'reference' && d.id === rel.meta.id && d.item === 'relationship';
          }).remove();
          var i = wb.store.shelf_by.relationships.indexOf(rel.meta.id);
          if (i >= 0) wb.store.shelf_by.relationships.splice(i, 1);
          wb.log.log({
              operation: 'defiltered',
              item: 'relationship',
              tool: 'reference',
              data: wb.log.logItem(rel),
              public: false
          });
        }
      }
    }
    $.publish('data/filter');
  }

  function onCaseInfo() {
    $('<div>').vizcaseinfo({
      title: 'Case',
      tool: 'case',
    });
  }

  function onVizSelect(e) {
    var viz_opt = $(this).attr('id').split('-')[0];
    viz_opt = viz_opt.split('_');
    var viz_name = viz_opt[0];
    var viz_form = viz_opt[1];
    var viz;
    if (viz_form === 'table') {
        var sel = $('.viz.entity.' + viz_name);
        if (sel.length) sel.dialog('open');
        else
          viz = $('<div>').vizentitytable({
              title: viz_name,
              entity: viz_name,
              tool: viz_name + ' table'
          });
    } else if (viz_name === 'dataentry') {
        var sel = $('.viz.dataentry');
        if (sel.length) sel.dialog('open');
        else
          viz = $('<div>').vizdataentrytable({
              title: 'Documents',
              tool: 'document'
          });
    } else if (viz_name === 'timeline') {
        var sel = $('.viz.timeline');
        if (sel.length) sel.dialog('open');
        else
          viz = $('<div>').viztimeline({
              title: 'Timeline',
              tool: 'timeline'
          });
    } else if (viz_name === 'map') {
        var sel = $('.viz.map');
        if (sel.length) sel.dialog('open');
        else
          viz = $('<div>').vizmap({
              title: 'Map',
              tool: 'map'
          });
    } else if (viz_name === 'network') {
        var sel = $('.viz.network');
        if (sel.length) sel.dialog('open');
        else
          viz = $('<div>').viznetwork({
              title: 'Network',
              tool: 'network'
          });
    } else if (viz_name === 'notepad') {
        var sel = $('.viz.notepad');
        if (sel.length) sel.dialog('open');
        else
          viz = $('<div>').viznotepad({
              title: 'Notepad',
              tool: 'notepad',
              url: GLOBAL_URL.notepad,
          });
    } else if (viz_name === 'message') {
      var sel = $('.viz.message');
      if (sel.length) sel.dialog('open');
      else
        viz = $('<div>').vizmessage({
          title: 'Message',
          tool: 'message'
        });
      $(this).find('.unread').text('');
    } else if (viz_name === 'history') {
      var sel = $('.viz.history');
      if (sel.length) sel.dialog('open');
      else
        viz = $('<div>').vizhistory({
          title: 'History',
          tool: 'history',
          url: GLOBAL_URL.history
        });
    } else if (viz_name === 'annotation') {
      var sel = $('.viz.annotation');
      if (sel.length) sel.dialog('open');
      else
        viz = $('<div>').vizannotationtable({
          title: 'Annotations',
          tool: 'annotation table',
        });
    }
  }

  function onDatasetChecked(e) {
    var ds = [];
    $('ul.dataset-list input:checkbox:checked').each(function() {
      ds.push(parseInt($(this).val()));
    });
    wb.store.shelf_by.datasets = ds;
    $.publish('data/filter');

    var str = '';
    if (this.checked) str = ' loaded';
    else str = ' unloaded'
    wb.utility.notify('Dataset ' + this.parentElement.textContent + str);
  }


  function onChangeUserColor(e) {
    var color = e.color.toHex();
    $('a#username').css('color', color);
    wb.info.users[wb.info.user].color = color;
  }

});
