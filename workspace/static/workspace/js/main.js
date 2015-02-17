wb = {}
wb.store = {
  entities: {}, // entities involved in the current case and the user
  dataentries:{}, // data entries in the current case
  datasets: {},  // datasets in the current case
  relationships: {},  // relationships involved in the current case and the user
  ENTITY_ENUM: ['person', 'location', 'organization', 'event', 'resource']
};
// profile, about the current case, users, group, etc.
wb.info = {
  case: CASE,  // the current case id
  users: {},  // all users in the current group
  group: GROUP,  // the current group
  user: USER,  // the current user id
  online_users: [],  // all online users id in the current group
};
// attributes for entities, temporarily hard coded here
wb.static = {
  event: ['people', 'address', 'date', 'priority', 'category'],
  location: ['address', 'precision', 'priority'],
  person: ['gender', 'nationality', 'ethnicity', 'race', 'religion', 'priority'],
  organization: ['people', 'category', 'nationality', 'ethnicity', 'religion', 'priority'],
  resource: ['condition', 'availability', 'category', 'priority'],
  relationship: ['relation', 'description', 'priority']
};

loadData();

$(function() {
  $('ul.data-set li input[type=checkbox]').change(updateDataset)
});


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

function updateDataset(e) {
  var checked = this.checked;
  var value = $(this).val();

  if (checked) {
    addDataset(value);
  } else {
    removeDataset(value);
  }
}


function addDataset(ds) {
  wb.store.datasets[ds].selected = true;
}


function removeDataset(ds) {
  wb.store.datasets[ds].selected = false;

}
