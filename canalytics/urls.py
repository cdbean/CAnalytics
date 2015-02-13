from django.conf.urls import patterns, include, url
from django.contrib import admin

import workspace
import annotator
import logger

urlpatterns = patterns('',
    # Examples:
    url(r'^$', 'canalytics.views.home', name='home'),
    url(r'^accounts/login/$', 'django.contrib.auth.views.login', {
        'template_name': 'admin/login.html'
    }),
    url(r'^accounts/logout/$', 'django.contrib.auth.views.logout'),
    # url(r'^ws/', include(workspace.urls)),
    # url(r'^annotation/', include(annotator.urls), name='annotation'),
    # url(r'^log/', include(logger.urls), name='log'),

    url(r'^admin/', include(admin.site.urls)),
)
