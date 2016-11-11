wb.notification = {
  notify: function(msg, type, delay) {
    // type: success | info | warning | error
    type = type || 'info';
    if (type === 'error') type = 'danger';

    var user = message.user,
        oper = message.operation,
        item = message.item,
        content = message.data;

    var html = '';
    html += this._userHtml(user)
      + this._operationHtml(oper)
      + this._itemHtml(item)
      + this._contentHtml(content);

    $('.notifications').notify({
      message: {html: html},
      type: type,
      fadeOut: {enabled: true, delay: delay || 3000}
    }).show();
  },

  _userHtml: function(user) {
    if (user.constructor !== Object) {
      user = wb.info.users[user];
    }
    if (!user) return '';

    return '<a href="#" class="username" data-id="' + user.id + '">' + user.name + '</a>';

  },

  _operationHtml: function(oper) {
    return '<i> ' + oper + ' </i>';

  },

  _itemHtml: function(item) {
    return '<span> ' + oper + ' </span>';

  },

  _contentHtml: function(content) {

  }
};
