# from django.contrib import admin
from django.contrib.gis import admin
from django.utils.encoding import smart_str
from mce_filebrowser.admin import MCEFilebrowserAdmin
from django.http import HttpResponse
import csv

from workspace import models


def entity_export_csv(modeladmin, request, queryset):
    import csv
    from django.utils.encoding import smart_str
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename=entity.csv'
    writer = csv.writer(response, csv.excel)
    # response.write(u'\ufeff'.encode('utf8')) # BOM (optional...Excel needs it to open UTF-8 file properly)
    writer.writerow([
        smart_str(u"ID"),
        smart_str(u"Case ID"),
        smart_str(u"Case Name"),
        smart_str(u"Group ID"),
        smart_str(u"Group Name"),
        smart_str(u"Item Name"),
        smart_str(u"Item Type"),
        smart_str(u"Created by User Name"),
        smart_str(u"Created by User ID"),
        smart_str(u"Created Time"),
        smart_str(u"Last Edited by User Name"),
        smart_str(u"Last Edited by User ID"),
        smart_str(u"Last Edited Time"),
        smart_str(u"isDeleted"),
    ])
    for obj in queryset:
		try:
			writer.writerow([
			    smart_str(obj.id),
			    smart_str(obj.case.id),
			    smart_str(obj.case.name),
			    smart_str(obj.group.id),
			    smart_str(obj.group.name),
			    smart_str(obj.name),
			    smart_str(obj.entity_type),
			    smart_str(obj.created_by.username if obj.created_by else ''),
			    smart_str(obj.created_by.id if obj.created_by else ''),
			    smart_str(obj.created_at.strftime('%m/%d/%Y-%H:%M:%S')),
			    smart_str(obj.last_edited_by.username if obj.last_edited_by else ''),
			    smart_str(obj.last_edited_by.id if obj.last_edited_by else ''),
			    smart_str(obj.last_edited_at.strftime('%m/%d/%Y-%H:%M:%S')),
			    smart_str(obj.deleted),
			])
		except Exception as e:
			print e
			pass

    return response
entity_export_csv.short_description = u"Export CSV"


def rel_export_csv(modeladmin, request, queryset):
    import csv
    from django.utils.encoding import smart_str
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename=relationship.csv'
    writer = csv.writer(response, csv.excel)
    # response.write(u'\ufeff'.encode('utf8')) # BOM (optional...Excel needs it to open UTF-8 file properly)
    writer.writerow([
        smart_str(u"ID"),
        smart_str(u"Case ID"),
        smart_str(u"Case Name"),
        smart_str(u"Group ID"),
        smart_str(u"Group Name"),
        smart_str(u"Item Name"),
        smart_str(u"Item Type"),
        smart_str(u"Created by User Name"),
        smart_str(u"Created by User ID"),
        smart_str(u"Created Time"),
        smart_str(u"Last Edited by User Name"),
        smart_str(u"Last Edited by User ID"),
        smart_str(u"Last Edited Time"),
        smart_str(u"isDeleted"),
        smart_str(u"Source ID"),
        smart_str(u"Source Name"),
        smart_str(u"Source Type"),
        smart_str(u"Target ID"),
        smart_str(u"Target Name"),
        smart_str(u"Target Type"),
    ])
    for obj in queryset:
		try:
			writer.writerow([
			    smart_str(obj.id),
			    smart_str(obj.case.id),
			    smart_str(obj.case.name),
			    smart_str(obj.group.id),
			    smart_str(obj.group.name),
			    smart_str(obj.relation),
			    smart_str('relationship'),
			    smart_str(obj.created_by.username if obj.created_by else ''),
			    smart_str(obj.created_by.id if obj.created_by else ''),
			    smart_str(obj.created_at.strftime('%m/%d/%Y-%H:%M:%S')),
			    smart_str(obj.last_edited_by.username if obj.last_edited_by else ''),
			    smart_str(obj.last_edited_by.id if obj.last_edited_by else ''),
			    smart_str(obj.last_edited_at.strftime('%m/%d/%Y-%H:%M:%S')),
			    smart_str(obj.deleted),
			    smart_str(obj.source.id),
			    smart_str(obj.source.name),
			    smart_str(obj.source.entity_type),
			    smart_str(obj.target.id),
			    smart_str(obj.target.name),
			    smart_str(obj.target.entity_type),
			])
		except Exception as e:
			print e
			pass

    return response
rel_export_csv.short_description = u"Export CSV"


class EntityAdmin(admin.ModelAdmin):
    actions = [entity_export_csv,]

class RelationshipAdmin(admin.ModelAdmin):
    actions = [rel_export_csv,]

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
admin.site.register(models.Role, HTMLAdmin)
admin.site.register(models.DataEntry, HTMLAdmin)
admin.site.register(models.Entity, EntityAdmin)
admin.site.register(models.Relationship, RelationshipAdmin)
