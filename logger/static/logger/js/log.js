if (!wb) {
  wb = {};
}

wb.log = function(act) {
  var action = {
    group: GROUP,
    case: CASE,
    operation: '',
    item: '',
    data: '{}',
    tool: '',
    public: true
  };
  $.extend(action, act);

  $.post(GLOBAL_URL.log, action, function(error, result) {

  });
};
