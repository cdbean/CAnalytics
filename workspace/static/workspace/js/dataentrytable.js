$.widget('viz.vizdataentrytable', $.viz.vizbase, {
    options: {
    },
    _create: function() {
      this.options.base.resizeStop = this.resize.bind(this);
      this.options.extend.maximize = this.resize.bind(this);
      this.options.extend.restore  = this.resize.bind(this);
      this._super('_create');
      this.element.addClass('dataentry');

      var columns = ['ID'].concat(wb.store.static.dataentry);

      this.table = wb.viz.table()
        .height(this.element.height() - 80)
        .title('dataentry')
        .columns(columns)
        .on('filter', function(selected) {
          wb.store.shelf_by.dataentries = selected;
          $.publish('data/filter', '#' + this.element.attr('id'));
        }.bind(this))
      ;

      this.updateData();

      this._setupAnnotator();

      this.updateView();

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
          data.push([de.id, wb.store.items.datasets[de.dataset].name, de.content, de.date]);
        }
      }

      this.table.data(data);
      d3.select(this.element[0]).call(this.table);

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
              'case': wb.info.case,
              'group': wb.info.group
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
      this.applyAnnotation(annotations[0]);
    },

    applyAnnotation: functoion(annotation) {
        var ele = this.element.closest(".ui-dialog");
        var annotator = ele.data('annotator');
        var existing_anns = this.plugins.Store.annotations;
        var range = rangy.createRange();
        var searchScopeRange = rangy.createRange();
        searchScopeRange.selectNodeContents(this.wrapper[0]);
        var options = {
          caseSensitive: false,
          wholeWordsOnly: true,
          withinRange: searchScopeRange,
          direction: "forward" // This is redundant because "forward" is the default
        };
        range.selectNodeContents(this.wrapper[0]);

        var searchTerm = new RegExp(annotation.quote, 'gi');

        var new_anns = [];
        while(range.findText(searchTerm, options)) {
          // skip text that has been annotated
          var existed = false;
          for (var i = 0; i < existing_anns.length; i++) {
            var exist_ann = existing_anns[i];
            if (range === exist_ann.ranges[0]) {
                existed = true;
                break;
            }
          }
          if (existed) continue;

          var new_ann = annotator.createAnnotation();
          new_ann.ranges = [range];
          new_ann.quote = annotation.quote;
          new_ann.entity = annotation.entity;
          new_ann = annotator.setupAnnotation(new_ann);
          new_anns.push(new_ann);

          range.collapse(false);
        }

        annotator.deleteAnnotation(annotation); // delete the temporary annotation
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
              .addClass('annotator-hl annotator-hl-' + annotation.tag.entity_type)
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
    }
});
