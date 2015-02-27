if (!wb) {
  wb = {};
}

wb.log = function(act) {
  var action = {
    group: wb.info.group,
    'case': wb.info.case,
    operation: '',
    item: '',
    data: '{}',
    'public': true
  };
  $.extend(action, act);

  $.post(GLOBAL_URL.log, action, function(error, result) {

  });
};
