from django.http import HttpResponse
import csv
from django.utils.encoding import smart_str
from django.contrib import admin

from logger import models


# ... export functions will go here ...
def log_export_csv(modeladmin, request, queryset):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename=logs.csv'
    writer = csv.writer(response, csv.excel)
    # response.write(u'\ufeff'.encode('utf8')) # BOM (optional...Excel needs it to open UTF-8 file properly)
    writer.writerow([
        smart_str(u"ID"),
        smart_str(u"Case ID"),
        smart_str(u"Case Name"),
        smart_str(u"Group ID"),
        smart_str(u"Group Name"),
        smart_str(u"Timestamp"),
        smart_str(u"User ID"),
        smart_str(u"User Name"),
        smart_str(u"Operation"),
        smart_str(u"Item"),
        smart_str(u"Tool"),
        smart_str(u"Data"),
    ])
    for obj in queryset:
		try:
			writer.writerow([
			    smart_str(obj.id),
			    smart_str(obj.case.id),
			    smart_str(obj.case.name),
			    smart_str(obj.group.id),
			    smart_str(obj.group.name),
			    smart_str(obj.time.strftime('%m/%d/%Y-%H:%M:%S')),
			    smart_str(obj.user.id),
			    smart_str(obj.user.username),
			    smart_str(obj.operation),
			    smart_str(obj.item),
			    smart_str(obj.tool),
			    smart_str(obj.data),
			])
		except:
			pass

    return response



def entity_log_export_csv(modeladmin, request, queryset):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename=logs.csv'
    writer = csv.writer(response, csv.excel)
    # response.write(u'\ufeff'.encode('utf8')) # BOM (optional...Excel needs it to open UTF-8 file properly)
    writer.writerow([
        smart_str(u"ID"),
        smart_str(u"Case ID"),
        smart_str(u"Case Name"),
        smart_str(u"Group ID"),
        smart_str(u"Group Name"),
        smart_str(u"Timestamp"),
        smart_str(u"User ID"),
        smart_str(u"User Name"),
        smart_str(u"Operation"),
        smart_str(u"Item Type"),
        smart_str(u"Item ID"),
        smart_str(u"Item Name"),
        smart_str(u"Tool"),
        smart_str(u"Data"),
    ])
    for obj in queryset:
		try:
			writer.writerow([
			    smart_str(obj.id),
			    smart_str(obj.case.id),
			    smart_str(obj.case.name),
			    smart_str(obj.group.id),
			    smart_str(obj.group.name),
			    smart_str(obj.time.strftime('%m/%d/%Y-%H:%M:%S')),
			    smart_str(obj.user.id),
			    smart_str(obj.user.username),
			    smart_str(obj.operation),
			    smart_str(obj.entity.entity_type),
			    smart_str(obj.entity.id),
			    smart_str(obj.entity.name),
			    smart_str(obj.tool),
			    smart_str(obj.data),
			])
		except:
			pass

    return response


def rel_log_export_csv(modeladmin, request, queryset):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename=logs.csv'
    writer = csv.writer(response, csv.excel)
    # response.write(u'\ufeff'.encode('utf8')) # BOM (optional...Excel needs it to open UTF-8 file properly)
    writer.writerow([
        smart_str(u"ID"),
        smart_str(u"Case ID"),
        smart_str(u"Case Name"),
        smart_str(u"Group ID"),
        smart_str(u"Group Name"),
        smart_str(u"Timestamp"),
        smart_str(u"User ID"),
        smart_str(u"User Name"),
        smart_str(u"Operation"),
        smart_str(u"Item Type"),
        smart_str(u"Item ID"),
        smart_str(u"Item Name"),
        smart_str(u"Tool"),
        smart_str(u"Data"),
    ])
    for obj in queryset:
		try:
			writer.writerow([
			    smart_str(obj.id),
			    smart_str(obj.case.id),
			    smart_str(obj.case.name),
			    smart_str(obj.group.id),
			    smart_str(obj.group.name),
			    smart_str(obj.time.strftime('%m/%d/%Y-%H:%M:%S')),
			    smart_str(obj.user.id),
			    smart_str(obj.user.username),
			    smart_str(obj.operation),
			    smart_str(obj.entity.entity_type),
			    smart_str(obj.entity.id),
			    smart_str(obj.entity.name),
			    smart_str(obj.tool),
			    smart_str(obj.data),
			])
		except:
			pass

    return response


log_export_csv.short_description = u"Export CSV"
entity_log_export_csv.short_description = u"Export CSV"
rel_log_export_csv.short_description = u"Export CSV"


class LogModelAdmin(admin.ModelAdmin):
    actions = [log_export_csv,]

class EntityLogModelAdmin(admin.ModelAdmin):
    actions = [entity_log_export_csv,]

class RelLogModelAdmin(admin.ModelAdmin):
    actions = [rel_log_export_csv,]


admin.site.register(models.Action, LogModelAdmin)
admin.site.register(models.DoEntity, EntityLogModelAdmin)
admin.site.register(models.DoRelationship, RelLogModelAdmin)
