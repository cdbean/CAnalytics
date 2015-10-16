# from django.contrib import admin
from django.contrib.gis import admin
from mce_filebrowser.admin import MCEFilebrowserAdmin

from workspace import models


class GoogleAdmin(admin.OSMGeoAdmin):
#   extra_js = [GMAP.api_url + GMAP.key]
#   extra_js = "http://maps.google.com/maps/api/js?v=3&amp;sensor=false"
    extra_js = ["https://maps.googleapis.com/maps/api/js?v=3.exp&libraries=places"]
    map_template = 'admin/gmap.html'
    default_zoom = 12
    default_lon = -8668570.503765268
    default_lat = 4980025.266835805
    map_width = 800
    map_height = 600
    openlayers_url = "lib/OpenLayers-2.13.1/OpenLayers.js"


class HTMLAdmin(MCEFilebrowserAdmin):
    pass

admin.site.register(models.Case, GoogleAdmin)
admin.site.register(models.Dataset)
admin.site.register(models.DataEntry, HTMLAdmin)
