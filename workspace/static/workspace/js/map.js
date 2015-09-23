$.widget("viz.vizmap", $.viz.vizbase, {
    _create: function() {
        this.options.extend.maximize = this.resize.bind(this);
        this.options.extend.restore = this.resize.bind(this);
        this.options.extend.help = this.help;
        this.options.base.resizeStop = this.resize.bind(this);
        this.options.base.dragStop = this.resize.bind(this);
        this._super("_create");
        this.element.addClass('map');

        this.features = [];
        this.layers = [];

        var map = new OpenLayers.Map({
            div: this.element.attr("id"),
            eventListeners: {
                featureover: function(e) {
                    this.highlight(e.feature);
                }.bind(this),
                featureout: function(e) {
                    this.unhighlight(e.feature);
                }.bind(this)
            }
        });
//        this.element.css("overflow", "hidden")
        var ghyb = new OpenLayers.Layer.Google(
            "Google Hybrid",
            {type: google.maps.MapTypeId.HYBRID, numZoomLevels: 22}
        );
        var gphy = new OpenLayers.Layer.Google(
            "Google Physical",
            {type: google.maps.MapTypeId.TERRAIN}
        );
        var gmap = new OpenLayers.Layer.Google(
            "Google Streets", // the default
            {numZoomLevels: 22}
        );
        var gsat = new OpenLayers.Layer.Google(
            "Google Satellite",
            {type: google.maps.MapTypeId.SATELLITE, numZoomLevels: 22}
        );

        map.addLayers([gsat, ghyb, gmap, gphy]);

        this.pointlayer = new OpenLayers.Layer.Vector("Points", {
            styleMap: new OpenLayers.StyleMap({
                'default': new OpenLayers.Style({
                    externalGraphic: GLOBAL_URL.static + 'workspace/img/red_pin.png'
                  , pointRadius: 16
                }),
                'select':  new OpenLayers.Style({
                    externalGraphic: GLOBAL_URL.static + 'workspace/img/blue_pin.png'
                  , pointRadius: 16
                })
            })
        });
        this.linelayer = new OpenLayers.Layer.Vector("Lines", {
            styleMap: new OpenLayers.StyleMap({
                'default': new OpenLayers.Style({
                    strokeWidth: 3
                  , strokeColor: '#FF0000'
                  , fillColor: '#FFDB73'
                  , fillOpacity: 0.4

                }),
                'select': new OpenLayers.Style({
                    strokeWidth: 3
                  , strokeColor: '#0000FF'
                })
            })
        });
        this.layers.push(this.pointlayer, this.linelayer);
        map.addLayers([this.pointlayer, this.linelayer]);

        var defaultloc = new OpenLayers.LonLat(-77.86000, 40.79339); // set default to State College
        if (wb.info.case.location) {
            var wktParser = new OpenLayers.Format.WKT();
            var feature = wktParser.read(wb.info.case.location);
            var origin_prj = new OpenLayers.Projection("EPSG:4326");
            var dest_prj   = new OpenLayers.Projection("EPSG:900913");
            if (feature) {
                feature.geometry.transform(origin_prj, dest_prj); // projection of google map
            }
            defaultloc = new OpenLayers.LonLat(feature.geometry.x, feature.geometry.y);
        }
        map.setCenter(defaultloc, 15); // zoom level

        var controlPanel = new OpenLayers.Control.Panel();
        map.addControl(new OpenLayers.Control.LayerSwitcher());
        map.addControl(new OpenLayers.Control.Navigation({
            zoomWheelEnabled: true,
        }));
        var mapControls = {
            select: new OpenLayers.Control.SelectFeature(
                        this.layers,
                        {
                            clickout: true, toggle: true,
                            multiple: false, hover: false,
                            toggleKey: "ctrlKey", // ctrl key removes from selection
                            multipleKey: "shiftKey", // shift key adds to selection
                            onSelect: this.filterByLocation.bind(this),
                            onUnselect: this.filterByLocation.bind(this),
                            box: true
                        }
                    )
            , navigate: new OpenLayers.Control.Navigation({
                zoomWheelEnabled: true
            })
        };
        for (var key in mapControls) {
            map.addControl(mapControls[key]);
            controlPanel.addControls([mapControls[key]]);
        }
        map.addControl(controlPanel);

        var navCtrls = map.getControlsByClass('OpenLayers.Control.Navigation');
        for (var i = 0; i < navCtrls.length; i++) {
            navCtrls[i].enableZoomWheel();
        }

        this.updateData();

        this.map = map;

        this.mapControls = mapControls;

        this.updateView();

    },
    updateData: function() {
        var point_feas = [], line_feas = [];
        for (var d in wb.store.items.entities) {
          var entity = wb.store.items.entities[d];
          if (entity.primary.entity_type === 'location') {
            var geometry = entity.primary.geometry;
            if (geometry) {
              if (geometry.geometry instanceof OpenLayers.Geometry.Point) {
                  point_feas.push(geometry);
              } else if (geometry.geometry instanceof OpenLayers.Geometry.LineString) {
                  line_feas.push(geometry);
              }
            }
          }
        }
        this.linelayer.addFeatures(line_feas);
        this.pointlayer.addFeatures(point_feas);
        this.features = this.pointlayer.features.concat(this.linelayer.features);
    },

    updateView: function() {
        this.features.forEach(function(d) {
          d.style = d.style || {};
          if (wb.store.shelf.entities.indexOf(d.attributes.id) > -1)
            d.style = null;
          else
            d.style.display = 'none';
        })
        this.linelayer.redraw();
        this.pointlayer.redraw();

    },
    reload: function() {
        this.updateData();
        this.update();
    },
    highlight: function (item) {
        var feature;
        if (typeof item === 'object')
          feature = item;
        else {
          for (var i = 0, len = this.features.length; i < len; i++) {
            if (this.features[i].attributes.id == item) {
              feature = this.features[i];
              break;
            }
          }
        }
        var entity = wb.store.items.entities[feature.attributes.id];
        var primary = entity.primary;
        var popup = '<div id="map-popup" class="entity-tooltip"><table>';
        popup += '<tr><th>' + wb.utility.capfirst(primary.entity_type) + '</th><td>' + primary.name + '</td></tr>';
        for (var attr in primary) {
            if (attr !== 'id' && attr !== 'entity_type' && attr !== 'name' && primary[attr]) {
                popup += '<tr><th>' + wb.utility.capfirst(attr) + '</th><td>' + primary[attr] + '</td></tr>';
            }
        }
        popup += '</table></div>';

        feature.popup = new OpenLayers.Popup.FramedCloud(
                "location_info",
                feature.geometry.getBounds().getCenterLonLat(),
                new OpenLayers.Size(200,150),
                popup,
                null,
                true
        );

        this.map.addPopup(feature.popup, true);

        // for (var i = 0; i < this.highlightedFeatures.length; i++) {
        //     this.mapControls['select'].unhighlight(this.highlightedFeatures[i]);
        // }
        // this.highlightedFeatures = [];
        // for (var i = 0; i < this.map.popups.length; i++) {
        //     this.map.removePopup(this.map.popups[i]);
        // }
        //
        // var layers = [linelayer, pointlayer];
        // for (var i = 0; i < features_id.length; i++) {
        //     for (var j = 0; j < layers.length; j++) {
        //         var found = false;
        //         var locallayer = layers[j];
        //         for (var k = 0, len = locallayer.features.length; k < len; k++) {
        //             if (locallayer.features[k].attributes.id == features_id[i]) {
        //                 this._showDetails(locallayer.features[k]);
        //                 this.mapControls['select'].highlight(locallayer.features[k]);
        //                 this.highlightedFeatures.push(locallayer.features[k]);
        //                 found = true;
        //                 break;
        //             }
        //         }
        //         if (found == true) break;
        //     }
        // }
    },
    unhighlight: function(feature) {
        if (feature.popup) {
            this.map.removePopup(feature.popup);
        }
    },

    _showDetails: function(feature) {
        $("#footprint_popup #footprint_name").text(feature.attributes.name);
        $("#footprint_popup #footprint_id").text(feature.attributes.id);
        var content = $('#footprint_popup').css('display', '').clone();

        feature.popup = new OpenLayers.Popup.FramedCloud(
                "footprint_info",
                feature.geometry.getBounds().getCenterLonLat(),
                new OpenLayers.Size(200,150),
                content.html(),
                null,
                true
        );

        this.map.addPopup(feature.popup, true);
    },

    filterByLocation: function(feature) {
        var shelf_by = wb.store.shelf_by.entities;
        var selectedFeas = []; // selected feature ids
        // get the id of all selected features
        this.layers.forEach(function(layer) {
            for (var i = 0, len = layer.selectedFeatures.length; i < len; i++) {
                selectedFeas.push(layer.selectedFeatures[i].attributes.id);
            }
        });

        if (selectedFeas.length == 0) {
            this.features.forEach(function(d) {
              var i = wb.store.shelf_by.entities.indexOf(d.attributes.id);
              if (i > -1) wb.store.shelf_by.entities.splice(i, 1);
            });

            $('.filter-div .filter-item').filter(function(i, item) {
              return $(item).find('a').data('item') === 'map';
            }).remove();

            wb.log({
                operation: 'removed filter in',
                item: 'map',
                tool: 'map'
            });
        } else {
            selectedFeas.forEach(function(d) {
              if (shelf_by.indexOf(d) < 0)
                shelf_by.push(d);
            });
            shelf_by = wb.utility.uniqueArray(shelf_by);

            var selected_names = selectedFeas.map(function(id) {
              return wb.store.items.entities[id].primary.name;
            });

            $('.filter-div .filter-item').filter(function(i, item) {
              return $(item).find('a').data('item') === 'map';
            }).remove();

            wb.filter.add('map filter', {'item': 'map'});

            wb.log({
                operation: 'filtered in',
                item: 'map',
                tool: 'map',
                data: JSON.stringify({
                  'id': selectedFeas.join(','),
                  'name': selected_names.join(',')
                })
            });
        }
        $.publish('data/filter', '#' + this.element.attr('id'));
    },

    resize: function() {
        this.map.updateSize();
    },

    destroy: function() {
        this.map.destroy();
        this._super("_destroy");
    },

    help: function() {
      var hint = new EnjoyHint({});
      hint.set(wb.help.map);
      hint.run();
    }
});

