from django.http import HttpResponse
from django.contrib import admin
from django.contrib.auth.models import User



# ... export functions will go here ...
def export_csv(modeladmin, request, queryset):
    import csv
    from django.utils.encoding import smart_str
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename=users.csv'
    writer = csv.writer(response, csv.excel)
    # response.write(u'\ufeff'.encode('utf8')) # BOM (optional...Excel needs it to open UTF-8 file properly)
    writer.writerow([
        smart_str(u"ID"),
        smart_str(u"Username"),
        smart_str(u"Full Name"),
        smart_str(u"Email"),
        smart_str(u"Group ID"),
        smart_str(u"Group Name"),
        smart_str(u"Case ID"),
    ])
    for obj in queryset:
		try:
			writer.writerow([
			    smart_str(obj.id),
			    smart_str(obj.username),
                smart_str(obj.first_name + ' ' + obj.last_name),
			    smart_str(obj.email),
			    smart_str(','.join([str(g.id) for g in obj.groups.all()])),
			    smart_str(','.join([g.name for g in obj.groups.all()])),
			    smart_str(','.join([str(g.case_set.all()[0].id) for g in obj.groups.all()])),
			])
		except Exception as e:
			print e
			pass

    return response
export_csv.short_description = u"Export CSV"


class MyModelAdmin(admin.ModelAdmin):
    actions = [export_csv,]

def user_unicode(self):
    return  u'%s, %s' % (self.last_name, self.first_name)

User.__unicode__ = user_unicode

admin.site.unregister(User)
admin.site.register(User, MyModelAdmin)

