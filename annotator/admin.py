from django.http import HttpResponse
from django.contrib import admin
import csv
from django.utils.encoding import smart_str

from .models import Annotation

# Register your models here.
def export_csv(modeladmin, request, queryset):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename=entity.csv'
    writer = csv.writer(response, csv.excel)
    # response.write(u'\ufeff'.encode('utf8')) # BOM (optional...Excel needs it to open UTF-8 file properly)
    writer.writerow([
        smart_str(u"ID"),
        smart_str(u"Case ID"),
        smart_str(u"Case Name"),
        smart_str(u"Group ID"),
        smart_str(u"Quote"),
        smart_str(u"Entity ID"),
        smart_str(u"Relationship ID"),
        smart_str(u"Dataentry ID"),
        smart_str(u"Created by User ID"),
        smart_str(u"Created Time"),
        smart_str(u"isDeleted"),
    ])
    for obj in queryset:
		try:
			writer.writerow([
			    smart_str(obj.id),
			    smart_str(obj.case.id),
			    smart_str(obj.case.name),
			    smart_str(obj.group.id),
			    smart_str(obj.quote),
			    smart_str(obj.entity.id if obj.entity else ''),
			    smart_str(obj.relationship.id if obj.relationship else ''),
			    smart_str(obj.dataentry.id),
			    smart_str(obj.created_by.id if obj.created_by else ''),
			    smart_str(obj.created_at.strftime('%m/%d/%Y-%H:%M:%S')),
			    smart_str(obj.deleted),
			])
		except Exception as e:
			print e

    return response
export_csv.short_description = u"Export CSV"

class AnnotationAdmin(admin.ModelAdmin):
    actions = [export_csv,]

admin.site.register(Annotation, AnnotationAdmin)
