// entry of the app
//
$('#progressbar').show().progressbar({ value: false });

// load data
wb.store.loadItems(GLOBAL_URL.data, {
  case: wb.info.case,
  group: wb.info.group
});

// initialize viewer
wb.viewer = $('<div>').appendTo('body').vizviewer().data('instance');
wb.editor = $('<div>').appendTo('body').vizeditor().data('instance');

// get all users in this group
$.get(GLOBAL_URL.users, {
  case: wb.info.case,
  group: wb.info.group
}, function(users) {
  for (var i = 0, len = users.length; i < len; i++) {
    var user = users[i];
    user.color = wb.utility.randomColor();
    wb.info.users[user.id] = user;
  }

  // change the color of the user name in nav bar
  var mycolor = wb.info.users[wb.info.user].color;
  $('.nav #username').css('color', mycolor);
});


$(function() {
  $('ul.dataset-list input:checkbox').change(onDatasetChecked);

  $('.viz-opts').click(onVizSelect);

  $('body').on('click', 'a.entity, span.entity', onClickEntity);
  $('body').on('click', onClickOutside);
  $('a#user_color').colorpicker().on('changeColor.colorpicker', onChangeUserColor);
  $('a#main_help').click(function() {
    var hint = new EnjoyHint({});
    hint.set(wb.help.main);
    hint.run();
  });

  if (!$.cookie('hinted')) {
    var hint = new EnjoyHint({});
    hint.set(wb.help.main);
    hint.run();
    $.cookie('hinted', true);
  }


  function onClickOutside() {
    wb.viewer.hide();
  }

  function onClickEntity(e) {
    var ent = $(e.target).data('entity');
    if (ent) {
      var entity = wb.store.items.entities[ent.id];
      wb.viewer.data(entity, 'entity').show(wb.utility.mousePosition(e, 'body'));
    }
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
            title: 'Notepad',
            url: GLOBAL_URL.notepad,
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
    } else if (viz_name === 'annotation') {
      viz = $('<div>').vizannotationtable({
        title: 'Annotations',
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

