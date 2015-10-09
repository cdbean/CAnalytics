$.widget('viz.vizdataentrytable', $.viz.vizbase, {
    options: {
    },
    _create: function() {
      this.options.base.resizeStop = this.resize.bind(this);
      this.options.extend.maximize = this.resize.bind(this);
      this.options.extend.restore  = this.resize.bind(this);
      this.options.extend.help     = this.help.bind(this);
      this._super('_create');
      this.element.addClass('dataentry');

      this._setUI();

      var columns = ['ID'].concat(wb.store.static.dataentry);

      this.table = wb.viz.table()
        .height(this.element.height() - 80)
        .title('dataentry')
        .columns(columns)
        .on('filter', function(selected) {
          wb.store.shelf_by.dataentries = selected;
          $('.filter-div .filter-item').filter(function(i, item) {
            return $(item).find('a').data('tool') === 'document table';
          }).remove();
          var selected_docs = [];
          selected.forEach(function(d) {
            var de = wb.store.items.dataentries[d];
            selected_docs.push(de);
            wb.filter.add('document: ' + de.name, {
              item: 'documents',
              id: de.id,
              tool: 'document table',
              public: false
            });
          });
          if (selected_docs.length === 0) {
            wb.log.log({
                operation: 'defiltered',
                item: 'documents',
                tool: 'document table',
                public: false
            });
          } else {
            wb.log.log({
                operation: 'filtered',
                item: 'documents',
                tool: 'document table',
                data: wb.log.logDocs(selected_docs),
                public: false
            });
          }
          $.publish('data/filter', '#' + this.element.attr('id'));
        }.bind(this))
      ;

      this.updateData();

      this._setupAnnotator();

      this.updateView();

    },

    _setUI: function() {
      var html = '\
        <div class="ui-layout-center"> \
          <div id="table-body"></div> \
        </div> \
        <div class="ui-layout-west"> \
          <ul id="ds-list" class="sidebar-nav"> \
            <li class="sidebar-brand"> Datasets </li> \
          </ul> \
        </div> \
      '
      var el = $(html).appendTo(this.element);
      this.element.layout({
        applyDemoStyles: true,
        west__size: 100
      });
      var str = '';
      d3.values(wb.store.items.datasets).forEach(function(ds) {
        str += '<li><a href="#" id="ds-' + ds.id + '"><label><input type="checkbox" checked> ' + ds.name 
        + ' <span class="badge">' + ds.dataentries.length + '</span></label></a>';
      });
      el.find('#ds-list').append(str);
      $('#ds-list input:checkbox', el).change(this._onDatasetChecked);
      el.find('.ui-layout-center').resize(this.resize.bind(this));
    },

    _onDatasetChecked: function() {
      var ds = [];
      $('ul#ds-list input:checkbox:checked').each(function() {
        var id = $(this).parent().parent().attr('id').split('-')[1];
        ds.push(parseInt(id));
      });
      wb.store.shelf_by.datasets = ds;
      $.publish('data/filter');
    },

    _destroy: function() {
      this._destroyAnnotator();
      this._super('_destroy');
    },

    updateData: function() {
      var data = [];

      for (var d in wb.store.items.dataentries) {
        var de = wb.store.items.dataentries[d];
        if (de) {
          data.push([de.id, wb.store.items.datasets[de.dataset].name + '-<br>' + de.name , de.content, de.date]);
        }
      }

      this.table.data(data);
      d3.select(this.element[0]).select('#table-body').call(this.table);

    },


    updateView: function() {
      this.table.filter(wb.store.shelf.dataentries);
    },

    highlight: function(item) {
      // highlight annotation
      // item: annotation id
      var ele = this.element.closest(".ui-dialog");
      var annotator = ele.data('annotator');
      if (annotator) {
        var store = annotator.plugins['Store'];
        var annotations = store.annotations;
        // if annotations are already loaded, highlight it
        // otherwise, wait 1 second and try again
        if (annotations.length) {
          for (var i = 0, len = annotations.length; i < len; i++) {
            if (annotations[i].id == item) {
              var highlight = annotations[i].highlights[0];
              // scroll to the highlight
              wb.utility.scrollTo(highlight, $('.dataTables_scrollBody', ele));
              // blink for 2 sec, and stop
              var si = setInterval(function() {
                $(highlight).toggleClass('highlighted');
              }, 300);
              setTimeout(function() {
                clearInterval(si);
                $(highlight).removeClass('highlighted');
              }, 2000);
              break;
            }
          }
        } else {
          setTimeout(function() {
            this.highlight(item);
          }.bind(this), 1000);
        }
      }
    },

    _setupAnnotator: function() {
        var ele = this.element.closest(".ui-dialog");
        ele.annotator();
        ele.annotator('addPlugin', 'Store', {
            prefix: '/annotation',
            annotationData: {
              'case': CASE,
              'group': GROUP
            },
            loadFromLocal: _.values(wb.store.items.annotations)
        });
        ele.annotator('addPlugin', 'Entity');
    },
    _destroyAnnotator: function() {
        var ele = this.element.closest(".ui-dialog");
        if (ele.data("annotator")) {
            ele.annotator("destroy");
        }
    },

    _resetAnnotator: function() {
        this._destroyAnnotator();
        this._setupAnnotator();
    },

    reloadAnnotations: function() {
      var ele = this.element.closest(".ui-dialog");
      var annotator = ele.data('annotator');
      if (annotator) {
        var store = annotator.plugins['Store'];
        store.loadAnnotationsFromLocal(wb.store.items.annotations);
      }
    },

    addAnnotations: function(annotations) {
      // add annotations for the same data entries
      for (var i = 0, len = annotations.length; i < len; i++) {
        this.addAnnotation(annotations[i]);
      }
      // add annotations to new data entries (ones that are unique to the current user)
      // this.applyAnnotation(annotations[0]);
    },

    applyAnnotation: function(annotation) {
        var ele = this.element.findclosest(".ui-dialog");
        var annotator = ele.data('annotator');
        var existing_anns = annotator.plugins.Store.annotations;

        // search text in the second column
        var searchTerm = new RegExp(annotation.quote, 'gi');
        var new_anns = [];
        this.element.find('table.dataTable>tbody>tr>td:nth-child(2)').each(function(i, el) {
            var range = rangy.createRange();
            var searchScopeRange = rangy.createRange();
            searchScopeRange.selectNodeContents(el);
            var options = {
              caseSensitive: false,
              wholeWordsOnly: true,
              withinRange: searchScopeRange,
              direction: "forward" // This is redundant because "forward" is the default
            };
            range.selectNodeContents(el);

            while(range.findText(searchTerm, options)) {
              // skip text that has been annotated
              var existed = false;
              for (var i = 0; i < existing_anns.length; i++) {
                var exist_ann = existing_anns[i];
                if (range.startOffset === exist_ann.ranges[0].startOffset 
                  && range.endOffset === exist_ann.ranges[0].endOffset) {
                    existed = true;
                    break;
                }
              }
              if (existed) {
                range.collapse(false);
                continue;
              }
              var new_ann = annotator.createAnnotation();
              new_ann.ranges = [{
                commonAncestorContainer: range.commonAncestorContainer,
                startOffset: range.startOffset,
                endOffset: range.endOffset
              }];
              $.extend(new_ann.ranges[0], range.nativeRange);
              new_ann.quote = annotation.quote;
              new_ann.entity = annotation.entity;
              new_anns.push(new_ann);

              range.collapse(false);
            }
        });
        new_anns.forEach(function(ann) {
          annotator.setupAnnotation(ann);
        })

        annotator.publish('/annotations/created', [new_anns]);
    },

    addAnnotation: function(annotation) {
      var ele = this.element.closest(".ui-dialog");
      var annotator = ele.data('annotator');
      if (annotator) {
        var store = annotator.plugins['Store'];
        var i = wb.utility.indexOf(annotation, store.annotations);
        if (i < 0) {
          store.registerAnnotation(annotation);
          annotator.setupAnnotation(annotation);
        } else {
          store.updateAnnotation(store.annotations[i], annotation);
        }
      }
    },

    updateAnnotations: function(annotations) {
      for (var i = 0, len = annotations.length; i < len; i++) {
        this.updateAnnotation(annotations[i]);
      }
    },

    updateAnnotation: function(annotation) {
      var ele = this.element.closest(".ui-dialog");
      var annotator = ele.data('annotator');
      if (annotator) {
        var store = annotator.plugins['Store'];
        var i = wb.utility.indexOf(annotation, store.annotations);
        if (i < 0) {
          store.registerAnnotation(annotation);
          annotator.setupAnnotation(annotation);
        } else {
          $(store.annotations[i].highlights).removeClass()
              .addClass('annotator-hl annotator-hl-' + annotation.entity.entity_type)
          ;
          store.updateAnnotation(store.annotations[i], annotation);
        }
      }
    },

    deleteAnnotations: function(annotations) {
      for (var i = 0, len = annotations.length; i < len; i++) {
        this.deleteAnnotation(annotations[i]);
      }
    },

    deleteAnnotation: function(annotation) {
      var ele = this.element.closest(".ui-dialog");
      var annotator = ele.data('annotator');
      if (annotator) {
        var store = annotator.plugins['Store'];
        var i = wb.utility.indexOf(annotation, store.annotations);
        if (i >= 0) {
          $(store.annotations[i].highlights).removeClass();
          store.unregisterAnnotation(store.annotations[i]);
        }
      }
    },

    resize: function() {
      this._super('resize');
      this.element.find('.dataTables_scrollBody').css('height', (this.element.height() - 80))
      this.table.resize();
    },

    help: function() {
      var hint = new EnjoyHint({});
      hint.set(wb.help.dataentry);
      hint.run();
    }
});
