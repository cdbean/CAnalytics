wb = {};

wb.viz = {};  // viz templates

wb.store = {  // all data in current case
  datasets: {},
  dataentries:{},
  entities: {},
  relationships: {},
  annotations: {},
  ENTITY_ENUM: ['person', 'location', 'organization', 'event', 'resource']
};

wb.shelf = { // data resulting from filtered (array of id)
  datasets: [],
  dataentries: [],
  entities: [],
  relationships: [],
  annotations: [],
};

wb.shelf_by = { // filtering condition
  datasets: [],
  dataentries: [],
  entities: [],
  relationships: [],
  annotations: [],
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
  dataentry: ['dataset', 'content', 'date'],
  event: ['people', 'location', 'start_date', 'end_date', 'priority', 'category'],
  location: ['address', 'precision', 'priority'],
  person: ['gender', 'nationality', 'ethnicity', 'race', 'religion', 'priority'],
  organization: ['people', 'category', 'nationality', 'ethnicity', 'religion', 'priority'],
  resource: ['condition', 'availability', 'category', 'priority'],
  relationship: ['relation', 'description', 'priority']
};
