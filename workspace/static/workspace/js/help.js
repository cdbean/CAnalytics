//initialize instance
wb.help = {}; // help script

wb.help.main = new EnjoyHint({});
wb.help.dataentry = new EnjoyHint({});
wb.help.table = new EnjoyHint({});
wb.help.timeline = new EnjoyHint({});
wb.help.map = new EnjoyHint({});
wb.help.network = new EnjoyHint({});
wb.help.notepad = new EnjoyHint({});
wb.help.message = new EnjoyHint({});
wb.help.history = new EnjoyHint({});

wb.help.main = [
  {
  'next body': 'Welcome to CAnalytics! I will walk you through its major tools',
  },
  {
  'click #dataentry-btn': 'Start by clicking here to open the document view'
  },
  {
  'next .dataTable>tbody>tr>td:nth-child(2)': 'As you read through the document, you can make annotations to critical text. <br>Let\'s say you come across a person\'s name and want to annotate it',
  },
  {
    'mouseup .dataTable>tbody>tr>td:nth-child(2)': 'First, select the text of the person\'s name'
  },
  {
    'click .annotator-adder': 'Next click the pop-up icon to attach an annotation',
    'shape': 'circle',
    'radius': 80
  },
  {
    selector: '.annotator-editor .annotator-widget',
    event_type: 'next',
    description: 'This is the editor to help you organize your annotation. <br>We are actively working on various utilities to help you input your annotations even faster'
  },
  {
  'next input.entity_name': 'The selected text is used as the default name of the entity. Change the name if necessary'
  },
  {
  'click .selectize-control.entity_type': 'Tag the selected text as a type of entity'
  },
  {
    'next .selectize-dropdown.entity_type': 'Tag it as a person, group/organization, location, event, resource(e.g. money, car), or a relationship between entities'
  },
  {
  'next .annotator-attribute-widget': 'Input any attributes of the entity here. Feel free to leave it blank and come back to update it later. You can also add new attributes but clicking the \'+\' button'
  },
  {
  'next .annotator-checkbox': 'Check here if you want to mark the text as that entity over the whole documents'
  },
  {
    selector: '.annotator-editor .annotator-widget .annotator-controls',
    event: 'click',
    description: 'Click to save or cancel the annotation'
  },
  {
    'next #table-dropdown': 'click to open the table of people and you will find the person you just annotated',
    'bottom': -300
  },
  {
    'next .viz.entity': 'This is a table of people. You can double click the cells to edit the attributes'
  },
  {
    'next #table-dropdown': 'click to open the table of annotations and you will find the annotation you just made',
    'bottom': -300
  },
  {
    event: 'click',
    selector: '.viz.annotation .dataTable>tbody>tr>td:nth-child(1)',
    description: 'Click on any cell in the first column of the table to make a filter. Note the change in other views<br>Click on the cell again to remove the filter<br>Hold [shift] to filter on multiple cells'
  },
  {
    'next body': 'Try creating other types of entities and see how they will be displayed in different views (e.g. locations in map, relationships in network, events in timeline)'
  },
  {
    'next #userlist': 'Here you will see who are joining you in this workspace. You may also change the user color by clicking it'
  },
  {
    'click #case_btn': 'Click here to change to another case'
  },
];

wb.help.timeline = [
  {
    'next .viz.timeline': 'Hover over an event item to view details'
  },
  {
    'next .viz.timeline': 'Scroll mouse wheels to zoom in and out'
  },
  {
    event: 'click',
    selector: '.viz.timeline .control.filter',
    'description': 'Click here to start filtering',
    'shape': 'radius',
    'radius': 50,
  },
  {
    'next .viz.timeline': 'Click on any white space in the view and hold and drag your mouse to create a filter area. <br>Events within the area will be filtered<br>Click the filter icon again to deactivate it.'
  },
];

wb.help.table = [
  {
    event: 'next',
    selector: '.viz.entity .dataTable>tbody>tr>td:first',
    description: 'Click on any cell in the first column of the table to make a filter. Note the change in other views<br>Click on the cell again to remove the filter<br>Hold [shift] to filter on multiple cells'
  },
  {
    'next .viz.entity': 'Double click the cells to edit the attributes'
  },
];

wb.help.map = [
  {
    'next .viz.map': 'Hover over the pins to view details'
  },
  {
    'next .olControlZoom': 'Click here to zoom in and out of the map',
    'shape': 'circle',
    'radius': 50
  },
  {
    'next .olControlPanel': 'Click here to filter the map',
    'shape': 'circle',
    'radius': 50
  },
];

wb.help.network = [
  {
    'next .viz.network': 'Click and drag on white space to drag the whole network'
  },
  {
    'next .viz.network': 'Hover on a node or link to view details'
  },
  {
    'next .viz.network': 'Click and drag on a node to reposition the node'
  },
  {
    event: 'click',
    'selector': '.viz.network .control.filter',
    'description': 'Click to activate filter',
    'shape': 'circle',
    'radius': 50
  },
  {
    'next .viz.network': 'Click on any white space in the view and hold and drag your mouse to create a filter area. <br>Relationships within the area will be filtered<br>Click the filter icon again to deactivate it.'
  },
  {
    'next .network-filterbar': 'Check out and hide entities out of interest'
  },
];

wb.help.notepad = [
  {
    'next .viz.notepad': 'The notepad is shared within the group. You can see your teammates typing. Text is color coded by author'
  }
];

wb.help.message = [
  {
    'next .viz.message': 'You can message your group here'
  },
  {
    'next #message_content': 'Type message here and hit [Ctrl+Enter] to send'
  }
];

wb.help.history = [
  {
    'next .viz.history': 'This view shows the history of your activity and your group\'s'
  },
  {
    'next .viz.history': 'Click on the timestamp to view detail'
  },
  {
    'next .viz.history': 'Click on the entities to view detail'
  }
];

