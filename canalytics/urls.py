from django.conf.urls import patterns, include, url
from django.contrib import admin


urlpatterns = patterns('',
    # Examples:
    url(r'^accounts/', include('account.urls', namespace='account')),
    url(r'^annotation/', include('annotator.urls', namespace='annotation')),
    url(r'^log/', include('logger.urls', namespace='log')),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^ws/', include('workspace.urls', namespace='ws')),
    url(r'^sync/', include('sync.urls', namespace='sync')),
    url(r'^$', 'canalytics.views.home', name='home'),
)
