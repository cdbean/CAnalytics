wb.state = {
  // windowState: {},
  // filterState: {},
  // hypothesisState: {},
  // vizState: {},

  getAllState: function() {
    var state = {};
    state = this.getViewState();
    state.hypothesisState = this.getHypothesisState();
    return state;
  },

  getViewState: function() {
    var state = {}
    state.windowState = this.getWindowState();
    state.filterState = this.getFilterState();
    state.vizState = this.getVizState();
    return state;
  },

  setAllState: function(state) {
    this.setViewState(state);
    this.setHypothesisState(state.hypothesisState);
  },

  setViewState: function(state) {
    this.setWindowState(state.windowState);
    this.setFilterState(state.filterState);
    this.setVizState(state.vizState);
  },

  loadStateFromCookie: function() {
    var stateStr = $.cookie('caState');
    if (!stateStr) return;

    var state = JSON.parse(stateStr);
    this.setAllState(state);
  },

  SaveStateToCookie: function() {
    var state = this.getAllState();
    $.cookie('caState', JSON.stringify(state));
  },

  getWindowState: function() {
    var state = {};
    $('.viz').each(function(i, v) {
      var width = $(v).dialog('option', 'width');
      var height = $(v).dialog('option', 'height');
      var position = $(v).dialog('option', 'position');
      var tool = $(v).data('instance').options.tool;
      state[tool] = {
        width: width,
        height: height,
        position_my: position.my,
        position_at: position.at,
        tool: tool
      };
    });
    return state
  },

  setWindowState: function(state) {
    var viz;
    for (var t in state) {
      if (t === 'document') {
        viz = $('.viz.dataentry').length
          ? $('.viz.dataentry')
          : $('<div>').vizdataentrytable({ title: 'Documents', tool: 'document' });
      } else if (t === 'timeline') {
        viz = $('.viz.timeline').length
          ? $('.viz.timeline')
          : $('<div>').viztimeline({ title: 'Timeline', tool: 'timeline' });
      } else if (t === 'map') {
        viz = $('.viz.map').length
          ? $('.viz.map')
          : $('<div>').vizmap({ title: 'Map', tool: 'map' });
      } else if (t === 'network') {
        viz = $('.viz.network').length
          ? $('.viz.network')
          : $('<div>').viznetwork({ title: 'Network', tool: 'network' });
      } else if (t === 'notepad') {
        viz = $('.viz.notepad').length
          ? $('.viz.notepad')
          : $('<div>').viznotepad({ title: 'Notepad', tool: 'notepad', url: GLOBAL_URL.notepad, });
      } else if (t === 'message') {
        viz = $('.viz.message').length
          ? $('.viz.message')
          : $('<div>').vizmessage({ title: 'Message', tool: 'message' });
      } else if (t === 'history') {
        viz = $('.viz.history').length
          ? $('.viz.history')
          : $('<div>').vizhistory({ title: 'History', tool: 'history', url: GLOBAL_URL.history });
      } else if (t === 'annotation table') {
        viz = $('.viz.annotation').length
          ? $('.viz.annotation')
          : $('<div>').vizannotationtable({ title: 'Annotations', tool: 'annotation table', });
      } else {
        viz = $('.viz.entity').length
          ? $('.viz.entity')
          : $('<div>').vizentitytable({ title: t.split(' ')[0], entity: t.split(' ')[0], tool: t });
      }
      if (viz) {
        var v = state[t];
        viz.dialog('option', {
          width: v.width,
          height: v.height,
          position: {
            at: v.position_at,
            my: v.position_my,
            of: window
          }
        });
        $(viz).data('instance').resize();
      }
    }
  },

  getFilterState: function() {
    return wb.filter.filter;
  },

  setFilterState: function(state) {
    // remove all filter first
    wb.filter.remove(null, false);

    for (var tool in state) {
      wb.filter.set(state[tool].filter, tool, state[tool].brushExtent, false);
      var viz = $('.viz.' + tool.replace(' ', '.'));
      if (viz.length) {
        var $viz = viz.data('instance');
        if ($viz.setFilter) {
          $viz.setFilter(state[tool].brushExtent);
        }
      }
    }
  },

  getHypothesisState: function() {
    return wb.hypothesis.current.id;
  },

  setHypothesisState: function(state) {
    wb.hypothesis.setCurrent(state);
  },

  getVizState: function() {
    var state = {};

    $('.viz').each(function(i, v) {
      var $viz = $(v).data('instance');
      var tool = $viz.options.tool;
      if ($viz.getState) {
        state[tool] = $viz.getState();
      }
    });
    return state;
  },

  setVizState: function(state) {
    for (var tool in state) {
      var viz = $('.viz.' + tool.replace(' ', '.'));
      if (viz.length) {
        var $viz = viz.data('instance');
        if ($viz.setState) {
          $viz.setState(state[tool]);
        }
      }
    }
  },
};
