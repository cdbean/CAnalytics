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
              featureover: this.onMouseOverFeature.bind(this),
              featureout: this.onMouseOutFeature.bind(this)
            }
        });
        var ghyb = new OpenLayers.Layer.Google(
            "Google Hybrid",
            {type: google.maps.MapTypeId.HYBRID, numZoomLevels: 22}
        );
        var gmap = new OpenLayers.Layer.Google(
            "Google Streets", // the default
            {numZoomLevels: 22}
        );
        var gsat = new OpenLayers.Layer.Google(
            "Google Satellite",
            {type: google.maps.MapTypeId.SATELLITE, numZoomLevels: 22}
        );

        map.addLayers([gmap, ghyb]);

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
        return this;

    },
    updateData: function() {
        var point_feas = [], line_feas = [];
        for (var d in wb.store.items.entities) {
          var entity = wb.store.items.entities[d];
          if (entity.meta.deleted) continue;
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
        this.linelayer.removeAllFeatures();
        this.pointlayer.removeAllFeatures();
        this.linelayer.addFeatures(line_feas);
        this.pointlayer.addFeatures(point_feas);
        this.features = this.pointlayer.features.concat(this.linelayer.features);
        return this;
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
        return this;

    },
    reload: function() {
        this.updateData();
        this.update();
        return this;
    },

    onMouseOverFeature: function(e) {
      window.mouseoverTimeout = setTimeout(popup.bind(this), 500);

      function popup() {
        var feature = e.feature,
            geo = feature.geometry,
            coord = new OpenLayers.LonLat(geo.x, geo.y),
            px = this.map.getViewPortPxFromLonLat(coord);
        var offset = $(this.map.div).offset();
        var pos = {
          left: offset.left + px.x,
          top: offset.top + px.y
        };

        var entity = wb.store.items.entities[feature.attributes.id];
        wb.viewer.data(entity, 'entity').show(pos, 'map');

        wb.log.log({
            operation: 'elaborate',
            item: 'location',
            tool: 'map',
            data: wb.log.logItem(entity),
            public: false
        });
      }
    },

    onMouseOutFeature: function(e) {
      if (window.mouseoverTimeout) clearTimeout(window.mouseoverTimeout)
      setTimeout(function() {
        if (!$('.viewer:hover').length > 0) wb.viewer.hide();
      }, 300);
    },

    defilter: function() {
      this.mapControls.select.unselectAll();
    },

    filterByLocation: function() {
        var filter = []; // selected feature ids

        this.layers.forEach(function(layer) {
          for (var i = 0, len = layer.selectedFeatures.length; i < len; i++) {
            filter.push(layer.selectedFeatures[i].attributes.id);
          }
        });

        var windowId = '#' + this.element.attr('id');
        if (filter.length) {
          wb.filter.set(filter, 'map', windowId);
        } else {
          wb.filter.remove(windowId);
        }

        return this;
    },

    resize: function() {
        this.map.updateSize();
        return this;
    },

    destroy: function() {
        this.map.destroy();
        this._super("_destroy");
    },

    help: function() {
      var hint = new EnjoyHint({});
      hint.set(wb.help.map);
      hint.run();
      return this;
    }
});
