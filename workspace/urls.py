from django.conf.urls import patterns, url
from workspace import views


urlpatterns = patterns('',
    # Examples:
    url(r'^cases$', views.cases, name='cases'),
    url(r'^case/(?P<case>\d+)/group/(?P<group>\d+)$', views.case, name='case'),
    url(r'^data$', views.data, name='data'),
    # url(r'^data/upload$', upload_data),
    url(r'^entities$', views.entities, name='entities'),
    url(r'^entity/(\d+)$', views.entity, name='entity'),
    url(r'^relationships$', views.relationships, name='relationships'),
    url(r'^relationship/(\d+)$', views.relationship, name='relationship'),
    url(r'^$', views.home, name='home'),
)
