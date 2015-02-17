from django.conf.urls import patterns, url
from views import annotation, annotations

urlpatterns = patterns('',
    # Examples:
    url(r'^annotation/(\d+)$', annotation, name='annotation_id'),
    url(r'^annotation$', annotation, name='annotation'),
    url(r'^annotations$', annotations, name='annotations'),
)

