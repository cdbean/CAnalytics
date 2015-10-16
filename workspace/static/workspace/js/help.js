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
  'next body': 'Welcome to CAnalytics! Follow this step-by-step tutorial to get familiar with it!<br>If you skip it, you can replay it by clicking your username in the top right corner, and click [help]',
  },
  {
  'next body': 'This menu bar provides visualization options to explore your data. The right end shows your name and your group members who are currently online, if any',
  },
  {
  'click #dataentry-btn': 'Now click here to open the document view'
  },
];
wb.help.dataentry = [
  {
  'next .viz.dataentry': 'Documents are grouped into datasets. The left sidebar shows the datasets, with the number indicating the number of documents in the dataset. Sometimes you may be required by the instructor to only analyze one document at a time. Check off other documents to hide them. The sidebar can be resized',
  },
  {
  'next .viz.dataentry': 'As you read through the document on the right, you can make annotations and tag them as a <i>person</i>, <i>location</i>, <i>organization</i>, <i>resource</i>, <i>event</i>, or <i>relationship</i>, which will be color coded',
  },
  {
    'next .viz.dataentry': 'These annotated entities and relationships will be shown in other views and shared with your group immediately'
  },
  {
    'mouseup .viz.dataentry': 'Now try selecting some text for annotation'
  },
  {
    'click .annotator-adder': 'Click the pop-up icon to start an annotation',
    'shape': 'circle',
    'radius': 80
  },
  {
    selector: '.annotator-editor .annotator-widget',
    event_type: 'next',
    description: 'Put in all information you know about the entity to share with your group'
  },
  {
  'next form.annotator-widget': 'The first row is the name of the entity. It is your selected text by default. Yet you will get clearer views if you summarize it'
  },
  {
  'next form.annotator-widget': 'When annotating a location, the system will match the name or address of the place as you type in <i>address</i>. When no match exists, trying changing your wording, e.g. be more specific; add city name, etc. When a place is matched, it will automatically be shown on the map view'
  },
  {
    'next form.annotator-widget': 'When annotating an event, you can add people, organization, or location to it, indicating <i>who</i> did <i>what</i> <i>wehere</i>. Relationships between these entities will be automatically created and shown in network view. If you add a date/time to the event, it will be shown in timeline view.'
  },
  // {
  // 'next form.annotator-widget': 'Check <i>apply to all</i> if you want to apply your annotation to all such text across the document'
  // },
  {
  'next form.annotator-widget': 'After [Save] the annotation, pay attention to the success/failure notification to the top right corner. All notifications will show here, including your group members\'s messages'
  },
  {
  'next form.annotator-widget': 'Next, open other views and learn their functions. Tutorial of each view is available by clicking the [?] icon in the top right of each view'
  },
];
wb.help.main = wb.help.main.concat(wb.help.dataentry);

wb.help.timeline = [
  {
    'next .viz.timeline': 'Hover over an event item to view details'
  },
  {
    'next .viz.timeline': 'Scroll mouse wheels to zoom in and out'
  },
  {
    'next .viz.timeline': 'drag the space area to pan right and left'
  },
  {
    event: 'click',
    selector: '.viz.timeline .control.filter',
    'description': 'Click here to start filtering',
    'shape': 'radius',
    'radius': 50,
  },
  {
    'next .viz.timeline': 'Click on any white space and hold and drag your mouse to create a filter area. <br>Events within the area will be filtered<br>Click the filter icon again to deactivate it.'
  },
];

wb.help.table = [
  {
    event: 'next',
    selector: '.viz.entity',
    description: 'Click on any cell in the FIRST column of the table to make a filter. Note the change in other views<br>Click on the cell again to remove the filter<br>Hold [shift] to filter on multiple cells'
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
    'next .maximizeDiv': 'Click here to switch to another base map',
    'shape': 'circle',
    'radius': 50
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
    event: 'next',
    'selector': '.viz.network .control.filter',
    'description': 'Click to activate filtering, and draw an area in the view to filter',
    'shape': 'circle',
    'radius': 50
  },
  {
    'next .viz.network .rel-list': 'This shows all the relationships. Hover over to highlight the relationship. Check off items to hide'
  },
  {
    'next .control.draw': 'Click to activate drawing. Draw a relationship between two nodes by dragging one node toward the other',
    'shape': 'circle',
    'radius': 50
  },
  {
    'next .network-filterbar': 'hide entities of certain types by checking off the items'
  },
];

wb.help.notepad = [
  {
    'next .viz.notepad': 'This is like Google Doc. You can collaboratively edit a document. Apart from text, you can insert a table and image. These functions are in beta. To insert an image, drag an image file into notepad. You can make screenshots of your views, save it, and drag here. You can export the document to .pdf or .doc'
  }
];

wb.help.message = [
  {
    'next .viz.message': 'Send a message by hitting [Ctrl+Enter]. <br>Type \'@\' to refer to entities your group created'
  },
];

wb.help.history = [
  {
    'next .viz.history': 'This view shows the history of your activity and your group\'s'
  },
  {
    'next .viz.history': 'Click on the timestamp to view detail (in beta)'
  },
  {
    'next .viz.history': 'Click on the entities to view detail'
  }
];

