from django.conf.urls import include, url
from django.contrib import admin
from django.views.static import serve

import settings
from .views import home

urlpatterns = [
    # Examples:
    url(r'^accounts/', include('account.urls', namespace='account')),
    url(r'^annotation/', include('annotator.urls', namespace='annotation')),
    url(r'^log/', include('logger.urls', namespace='log')),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^ws/', include('workspace.urls', namespace='ws')),
    # url(r'^sync/', include('sync.urls', namespace='sync')),
    url(r'^tinymce/', include('tinymce.urls')),
    url(r'^mce_filebrowser/', include('mce_filebrowser.urls')),
    url(r'^$', home, name='home'),
    url(r'^media/(?P<path>.*)$', serve, {
        'document_root': settings.MEDIA_ROOT}),
]
