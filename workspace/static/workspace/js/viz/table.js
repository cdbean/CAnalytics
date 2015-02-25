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

                table = $table.dataTable({
                    "bJQueryUI": true,
                    "bDestroy": true,
                    'sScrollY': height,
                    'bPaginate': false,
                    "sRowSelect": "multi", // for multi select with ctrl and shift
                    "sDom": "Rlfrtip", // enable column resizing
                });
                $(table).on('click', 'tr.even td:first, tr.odd td:first', onFilter);
            }

            table.fnClearTable();
            table.fnAddData(data);
            table.fnSetColumnVis(0,false); // hide the first column, which is id

            // save data entry into DOM TODO: maybe this is not necessary?
            var rows = $(table.fnGetNodes());
            rows.each(function(i, row) {
                var pos = table.fnGetPosition(this);
                var data = table.fnGetData(pos);
                $(row).data("id", data[0]);
            });

            if (editable) {
                $('td', table.fnGetNodes()).editable("entity/attributes", {
                    tooltip: "Double click to edit",
                    cancel: "Cancel",
                    submit: "Save",
                    event: "dblclick",
                    indicator: '<img src="/static/dashboard/img/wait.gif">',
                    placeholder: "",
                    callback: function( sValue, y ) {
                        var aPos = table.fnGetPosition( this );
                        table.fnUpdate( sValue, aPos[0], aPos[2] );
                        dispatch.edit();
                    },
                    submitdata: function ( value, settings ) {
                        var column = table.fnGetPosition( this )[2];
                        var attr = table.fnSettings().aoColumns[column].sTitle.toLowerCase();
                        return {
                            id: $(this.parentNode).data("id"),
                            attribute: attr,
                        };
                    }
                });
            }
        });
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
        if (selected_rows.length == 0) {
            wb.shelf_by.dataentries = [];

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
            wb.shelf_by.dataentries = records_id;

            var selected_names = [];
            if (title !== 'dataentry') {
              selected_names = records_id.map(function(id) {
                return wb.store.entities[id].primary.name;
              });
            } else {
              selected_names = records_id.map(function(id) {
                return wb.store.dataentries[id].name;
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

    exports.margin = function(_) {
        if (!arguments.length) return margin;
        margin = _;
        return exports;
    };

    exports.filter = function(_) {

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

    return d3.rebind(exports, dispatch, 'on');
};

