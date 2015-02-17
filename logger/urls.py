from django.conf.urls import patterns, url

from logger import views

urlpatterns = patterns('',
    # Examples:
    url(r'^logs$', views.logs),
    url(r'^log$', views.log),
)

