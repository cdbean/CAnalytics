from django.http import HttpResponse
from django.contrib import admin
from sync import models


# ... export functions will go here ...
def export_csv(modeladmin, request, queryset):
    import csv
    from django.utils.encoding import smart_str
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename=messages.csv'
    writer = csv.writer(response, csv.excel)
    # response.write(u'\ufeff'.encode('utf8')) # BOM (optional...Excel needs it to open UTF-8 file properly)
    writer.writerow([
        smart_str(u"ID"),
        smart_str(u"Case ID"),
        smart_str(u"Case Name"),
        smart_str(u"Group ID"),
        smart_str(u"Group Name"),
        smart_str(u"Timestamp"),
        smart_str(u"Sender ID"),
        smart_str(u"Sender Username"),
        smart_str(u"Sender Name"),
        smart_str(u"Content"),
    ])
    for obj in queryset:
        try:
			writer.writerow([
			    smart_str(obj.id),
			    smart_str(obj.case.id),
			    smart_str(obj.case.name),
			    smart_str(obj.group.id),
			    smart_str(obj.group.name),
			    smart_str(obj.sent_at.strftime('%m/%d/%Y-%H:%M:%S')),
			    smart_str(obj.sender.id),
                smart_str(obj.sender.first_name + ' ' + obj.sender.last_name),
			    smart_str(obj.sender.username),
			    smart_str(obj.content),
			])
        except Exception as e:
			pass

    return response
export_csv.short_description = u"Export CSV"


class MyModelAdmin(admin.ModelAdmin):
    actions = [export_csv,]

admin.site.register(models.Message, MyModelAdmin)
