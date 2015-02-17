from django.conf.urls import patterns, url
from sync import views

urlpatterns = patterns('',
    # Examples:
    url(r'^message$', views.message, name='message'),
)

