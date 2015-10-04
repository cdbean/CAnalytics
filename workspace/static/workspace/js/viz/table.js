wb.viz.table = function() {
    var margin = {top: 20, right: 30, bottom: 30, left: 50},
        width = 500,
        height = 300
    ;
    var data, columns;
    var title;
    var table;
    var editable = false;
    var dispatch = d3.dispatch('filter', 'edit');

    function exports(selection) {
        selection.each(function() {
            if (!table) {
                var table_str = '<table style="width:100%;"><thead><tr>';
                for (var i = 0, len = columns.length; i < len; i++) {
                    table_str += '<th>' + columns[i] + '</th>';
                }
                table_str += '</tr></thead></table>';
                var $table = $(table_str).appendTo(this);

                table = $table.DataTable({
                    'autoWidth': false, // auto resize table when window resizes
                    "bJQueryUI": true,
                    "bDestroy": true,
                    'sScrollY': height,
                    'bPaginate': false,
                    "sRowSelect": "multi", // for multi select with ctrl and shift
                    "sDom": "Rlfrtip", // enable column resizing
                });
                if (title === 'dataentry' || title === 'annotation_table') $(table).on('click', 'tr.even>td:first-child, tr.odd>td:first-child', onFilter);
                else $(table).on('click', 'tr.even>td:nth-child(2), tr.odd>td:nth-child(2)', onFilter);
                $(table).on('click', '.control', onControl.bind(this));
            }

            table.fnClearTable();
            table.fnAddData(data);
            // table.clear().data(data);
            table.fnSetColumnVis(0,false); // hide the first column, which is id

            // save data entry into DOM TODO: maybe this is not necessary?
            var rows = $(table.fnGetNodes());
            rows.each(function(i, row) {
                var pos = table.fnGetPosition(this);
                var data = table.fnGetData(pos);
                $(row).data("id", data[0]);
                $(row).attr('id', 'row-' + data[0]);
            });

            if (editable) {
                $('>td', table.fnGetNodes()).not('td:first-child').editable(GLOBAL_URL.entity_attr, {
                    tooltip: "Double click to edit",
                    cancel: "Cancel",
                    submit: "Save",
                    event: "dblclick",
                    indicator: '<img src="/static/lib/jEditable/img/indicator.gif">',
                    placeholder: "",
                    callback: function( sValue, y ) {
                        var aPos = table.fnGetPosition( this );
                        table.fnUpdate( sValue, aPos[0], aPos[2] );
                        var column = table.fnGetPosition( this )[2];
                        var attr = table.fnSettings().aoColumns[column].sTitle.toLowerCase();
                        var ent = wb.store.items.entities[$(this.parentNode).data('id')];
                        ent.primary[attr] = sValue;
                        dispatch.edit(ent, attr);
                    },
                    submitdata: function ( value, settings ) {
                        var column = table.fnGetPosition( this )[2];
                        var attr = table.fnSettings().aoColumns[column].sTitle.toLowerCase();
                        return {
                            id: $(this.parentNode).data("id"),
                            attr: attr,
                            group: GROUP,
                            case: CASE,
                        };
                    }
                });
            }

        });
    }

    function onControl(e) {
      var tr = $(e.target).closest('tr')[0];
      if (table.fnIsOpen(tr)) {
        /* This row is already open - close it */
        e.target.src = GLOBAL_URL.static + "/workspace/img/details_open.png";
        table.fnClose(tr);
      } else {
        /* Open this row */
        e.target.src = GLOBAL_URL.static + "/workspace/img/details_close.png";
        var id = $(tr).data('id');
        // only entities have this row expand control
        var ent = wb.store.items.entities[id];
        if (ent) {
          var child = '<table cellpadding="5" cellspacing="0" border="0" style="padding-left:50px;">';
          var attrs = wb.store.static[ent.primary.entity_type];
          for (var i in attrs) {
            var k = attrs[i];
            if (ent.primary[k]) child += '<tr><td>' + k + ':</td><td>' + ent.primary[k] + '</td></tr>';
          }
          for (var k in ent.other) {
            if (ent.other[k]) child += '<tr><td>' + k + ':</td><td>' + ent.other[k] + '</td></tr>';
          }
          child += '</table>';
          table.fnOpen(tr, child, 'details');
        }
      }
    }

    function formatDetails(table, tr) {
      var d = table.fnGetData(tr);
      return 'hahah';
    }

    function onFilter(e) {
      if ( $(this.parentNode).hasClass('row_selected') ) {
        $(this.parentNode).removeClass('row_selected');
      } else {
        if (! e.shiftKey) {
          $('tr.row_selected', table).removeClass('row_selected');
        }
        document.getSelection().removeAllRanges(); // disable text selection when shift+clik
        $(this.parentNode).addClass('row_selected');
      }
      var selected_rows = $('tr.row_selected', table);

      if (selected_rows.length === 0) {
        dispatch.filter([]);
        wb.log({
          operation: 'removed filter',
          item: title,
          tool: title,
        });
        return;
      }

      var records_id = [];
      $('tr.row_selected', table).each(function(idx, row) {
        var id = $(row).data('id');
        records_id.push(id);
      });
      dispatch.filter(records_id);
      wb.log({
        operation: 'filtered',
        item: title,
        tool: title,
        data: JSON.stringify({
          'id': records_id.join(','),
//         'name': selected_names.join(',')
        })
      });
    }
    /*
    function onFilter(e) {
        if ( $(this.parentNode).hasClass('row_selected') ) {
            $(this.parentNode).removeClass('row_selected');
        } else {
            if (! e.shiftKey) {
                $('tr.row_selected', table).removeClass('row_selected');
            }
            document.getSelection().removeAllRanges(); // disable text selection when shift+clik
            $(this.parentNode).addClass('row_selected');
        }
        var selected_rows = $('tr.row_selected', table);
        if (selected_rows.length == 0) {
          if (title === 'dataentry')
            wb.store.shelf_by.dataentries = [];
          else {
            data.forEach(function(d) {
              var i = wb.store.shelf_by.entities.indexOf(d[0]);
              if (i > -1) wb.store.shelf_by.entities.splice(i, 1);
            });
          }

          wb.log({
              operation: 'removed filter in',
              item: title,
              tool: title,
          });
        } else {
            records_id = [];
            $('tr.row_selected', table).each(function(idx, row) {
              var id = $(row).data('id');
                records_id.push(id);
            });
            if (title === 'dataentry')
              wb.store.shelf_by.dataentries = records_id;
            else
              wb.store.shelf_by.entities = wb.store.shelf_by.entities.concat(records_id)

            var selected_names = [];
            if (title !== 'dataentry') {
              selected_names = records_id.map(function(id) {
                return wb.store.items.entities[id].primary.name;
              });
            } else {
              selected_names = records_id.map(function(id) {
                return wb.store.items.dataentries[id].name;
              });
            }
            wb.log({
                operation: 'filtered in',
                item: title,
                tool: title,
                data: JSON.stringify({
                  'id': records_id.join(','),
                  'name': selected_names.join(',')
                })
            });

        }
        dispatch.filter();

    }
        */

    exports.filter = function(subset) {
      // filter table
      var shelf = '';
      if (title === 'dataentry') {
        shelf = 'dataentries';
      } else {
        shelf = 'entities';
      }
      var filter = '';
      subset.forEach(function(d) {
        filter += '^' + d + '$|';
      });
      filter = filter.substring(0, filter.length - 1); // remove the last '|' character
      // if filter is empty string, set it to something impossible
      filter = filter || '-1';
      // 2nd param: which column to filter;
      // 3rd param: to use regular expression or not
      table.fnFilter(filter, 0, true);
    };

    exports.margin = function(_) {
        if (!arguments.length) return margin;
        margin = _;
        return exports;
    };

    exports.height = function(_) {
        if (!arguments.length) return height;
        height = _;
        return exports;
    };

    exports.width = function(_) {
        if (!arguments.length) return width;
        width = _;
        return exports;
    };

    exports.columns = function(_) {
        if (!arguments.length) return columns;
        columns = _;
        return exports;
    };

    exports.data = function(_) {
        if (!arguments.length) return data;
        data = _;
        return exports;
    };

    exports.title = function(_) {
        if (!arguments.length) return title;
        title = _;
        return exports;
    };

    exports.editable = function(_) {
        if (!arguments.length) return editable;
        editable = _;
        return exports;
    };

    exports.resize = function() {
      $(table).css({ width: $(table).parent().width() });
      table.fnAdjustColumnSizing();  
    };

    return d3.rebind(exports, dispatch, 'on');
};

