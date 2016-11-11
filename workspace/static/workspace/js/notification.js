wb.notification.notify = function(msg, type, delay) {
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
};
