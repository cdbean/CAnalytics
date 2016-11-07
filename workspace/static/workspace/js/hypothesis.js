wb.hypothesis = {
  items: [
    // hypo_id: {
    //   id: id,
    //   created_by: null,
    //   message: '',
    //   view: 'JSON',
    //   created_at: 'time',
    //   path: [parentId, parentId, selfId],
    //
    // }
  ],
  currentPath: [], // the current hypothesis path
  current: {}, // the current hypothesis

  setCurrent: function(id) {
    if (!id) {
      this.current = {};
      this.currentPath = [];
      d3.selectAll('.hypothesis').classed('current', false);
      return;
    }
    var current;
    for (var i = 0, len = this.items.length; i < len; i++) {
      if (this.items[i].id === id) {
        current = this.items[i];
        break;
      }
    }
    this.current = current;
    this.currentPath = current.path;
    d3.selectAll('.hypothesis').classed('current', function(d) {
      return d.id === current.id;
    });
  },

  addItems: function(d) {
    if (d.constructor === Array) {
      this.items = this.items.concat(d);
    }
    else {
      this.addItem(d);
    }
    return this.updateData();
  },

  addItem: function(item) {
    this.items.push(item);
    return this.updateData();
  },

  updateData: function() {
    this.items.sort(function(a, b) {
      var res = 0;
      for (var i = 0; i < a.path.length; i++) {
        if (!b.path[i]) {
          // if b.path does not have one, b.path is smaller
          res = 1;
          break;
        }
        if (a.path[i] < b.path[i]) {
          res = -1;
          break;
        }
        if (a.path[i] > b.path[i]) {
          res = 1;
          break;
        }
      }
      if (!res && b.path.length > a.path.length) res = -1;
      return res;
    });
    return this;
  },

  updateView: function() {
    var container = d3.select('.hypotheses');

    var item = container.selectAll('.hypothesis')
      .data(this.items);

    item.exit().remove();

    var itemEnter = item.enter().append('div').attr('class', 'hypothesis');
    var meta = itemEnter.append('div').attr('class', 'meta');
    meta.append('span').attr('class', 'username');
    meta.append('span').attr('class', 'timestamp');
    meta.append('a').attr('class', 'view').text('[view]');
    itemEnter.append('div').attr('class', 'message');

    item.select('.username')
      .text(function(d) { return wb.info.users[d.created_by].name; });
    item.select('.timestamp')
      .text(function(d) { return d.created_at; });
    item.select('.message')
      .text(function(d) { return d.message; });
    item.style('margin-left', function(d) {
      return (d.path.length - 1) * 20 + 'px';
    });

    item.select('a.view').on('click', onClickView);

    function onClickView(d) {
      $('#view-hypothesis-modal').find('#case').val(CASE).end()
        .find('.username').text(wb.info.users[d.created_by].name).end()
        .find('.timestamp').text(d.created_at).end()
        .find('#path').val(d.path).end()
        .find('#group').val(GROUP).end()
        .find('#view').val(d.view).end()
        .find('#message').text(d.message).end()
        .find('#id').val(d.id).end();
      $('#view-hypothesis-modal').data('hypothesis', d);
      $('#view-hypothesis-modal').modal();
    }
  }
};
