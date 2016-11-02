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
          // no filter for data entry for now
        }.bind(this));

      this.setupDocuments();

      this._setupAnnotator();

      // this.updateData();

      this.updateView();

      return this;
    },

    _setUI: function() {
      var html = '\
        <div class="ui-layout-center"> \
          <div id="table-body"></div> \
        </div> \
        <div class="ui-layout-west"> \
          <ul id="ds-list" class="sidebar-nav"> \
            <li class="sidebar-brand"> Datasets </li> \
            <li><a href="#" id="ds-0"><input type="checkbox" checked> Select All</a> </li> \
          </ul> \
          <ul id="ann-list" class="sidebar-nav"> \
          </ul> \
        </div> \
      '
      var el = $(html).appendTo(this.element);
      this.layout = this.element.layout({ // jquery layout plugin
        applyDemoStyles: true,
        west__size: 100,
        onresize: function() {
          this.table.resize();
        }.bind(this)
      });
      var str = '';
      d3.values(wb.store.items.datasets).sort(function(a, b) {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
      }).forEach(function(ds) {
        str += '<li><a href="#" id="ds-' + ds.id + '"><input type="checkbox" checked> ' + ds.name
        + ' <span class="badge">' + ds.dataentries.length + '</span></a>';
      });
      el.find('#ds-list').append(str);
      $('#ds-list input:checkbox', el).change(this._onDatasetChecked.bind(this));
      $('#ds-list a', el).click(this._onDatasetClicked.bind(this));
      // el.find('.ui-layout-center').resize(this.resize.bind(this));
      el.find('#ann-list').on('click', 'a', function(e) {
        var item = $(e.target).data('annotation');
        if (item) this.highlight(item);
      }.bind(this))
    },

    _onDatasetChecked: function(e) {
      var id = $(e.target).parent().attr('id').split('-')[1];
      var ds_cb = this.element.find('ul#ds-list input:checkbox');
      if (id == 0) { // 'all' is clicked
        ds_cb.prop('checked', $(e.target).prop('checked'));
      }
      var ds = [];
      ds_cb.filter(':checked').each(function() {
        var id = + $(this).parent().attr('id').split('-')[1];
        if (id) ds.push(id);
      });
      wb.store.shelf_by.datasets = ds;
      $.publish('data/filter');
    },

    _onDatasetClicked: function(e) {
      // jump to the first dataentry in the dataset
      // when clicking on checkbox, this function will also be triggered
      // TODO: change html structure or event listener
      var id = $(e.target).attr('id');
      if (id) id = id.split('-')[1];
      var ds = wb.store.items.datasets[id];
      if (ds) {
        var de = ds.dataentries[0];
        if (de)
          wb.utility.scrollTo(this.element.find('#row-' + de), $('.dataTables_scrollBody', this.element));
      }
    },

    _destroy: function() {
      this._destroyAnnotator();
      this._super('_destroy');
    },

    setupDocuments: function() {
      var data = [];

      d3.values(wb.store.items.dataentries).sort(function(a, b) {
        // sort by dataset name first
        var a_ds = wb.store.items.datasets[a.dataset];
        var b_ds = wb.store.items.datasets[b.dataset];
        if (a_ds.name < b_ds.name) return -1;
        else if (a_ds.name > b_ds.name) return 1;
        else {
          if (a.name < b.name) return -1;
          if (a.name > b.name) return 1;
          return 0;
        }
      }).forEach(function(de) {
        data.push([de.id, wb.store.items.datasets[de.dataset].name + ': <br>' + de.name , de.content, de.date]);
      });

      this.table.data(data);
      d3.select(this.element[0]).select('#table-body').call(this.table);
      return this;
    },

    updateData: function() {
      var _this = this;

      d3.values(wb.store.items.annotations).forEach(function(annotation) {
        _this.addAnnotation(annotation);
      });
    },


    updateView: function() {
      // this.table.filter(wb.store.shelf.dataentries);

      var el = this.element.find('#ann-list');
      el.empty();
      if (!$.isEmptyObject(wb.filter.filter)) { // ugly way, but works. If a filter is applied, show ann list
        el.append('<li class="sidebar-brand">Annotations</li>');
        wb.store.shelf.annotations.forEach(function(d) {
          var ann = wb.store.items.annotations[d];
          if (!ann || ann.meta.deleted) return;
          var li = '<li><a href="#">';
          // var prev = ann.highlights[0].previousSibling.nodeValue.split(' ').pop();
          // var next = ann.highlights[0].nextSibling.nodeValue.split(' ')[0];
          // li += prev + ' ' + ann.quote + ' ' + next;
          li += ann.quote;
          li += '</a></li>';
          $(li).appendTo(el).find('a').data('annotation', ann.id);
        });
      }
      return this;
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
      return this;
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
            loadFromLocal: _.values(wb.store.items.annotations).filter(function(d) {
              return !d.meta.deleted;
            })
        });
        ele.annotator('addPlugin', 'Entity');
    },

    _destroyAnnotator: function() {
        var ele = this.element.closest(".ui-dialog");
        if (ele.data("annotator")) {
            ele.annotator("destroy");
        }
    },

    reloadAnnotations: function() {
      var ele = this.element.closest(".ui-dialog");
      var annotator = ele.data('annotator');
      if (annotator) {
        var store = annotator.plugins['Store'];
        store.loadAnnotationsFromLocal(wb.store.items.annotations);
      }
      return this;
    },

    addAnnotations: function(annotations) {
      // add annotations for the same data entries
      for (var i = 0, len = annotations.length; i < len; i++) {
        this.addAnnotation(annotations[i]);
      }
      // add annotations to new data entries (ones that are unique to the current user)
      // this.applyAnnotation(annotations[0]);
      return this;
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
        return this;
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
        }
      }
      return this;
    },

    updateAnnotations: function(annotations) {
      for (var i = 0, len = annotations.length; i < len; i++) {
        this.updateAnnotation(annotations[i]);
      }
      return this;
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
      return this;
    },

    deleteAnnotations: function(annotations) {
      for (var i = 0, len = annotations.length; i < len; i++) {
        this.deleteAnnotation(annotations[i]);
      }
      return this;
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
      return this;
    },

    resize: function() {
      this._super('resize');
      this.layout.resizeAll();
      this.element.find('.dataTables_scrollBody').css('height', (this.element.height() - 80))
      this.table.resize();
      return this;
    },

    help: function() {
      var hint = new EnjoyHint({});
      hint.set(wb.help.dataentry);
      hint.run();
      return this;
    }
});
