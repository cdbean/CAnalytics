from django.conf.urls import patterns, url
from sync import views

urlpatterns = patterns('',
    # Examples:
    url(r'^message$', views.message, name='message'),
    url(r'^messages$', views.messages, name='messages'),
    url(r'^join$', views.join_group, name='joingroup'),
    url(r'^leave$', views.leave_group, name='leavegroup'),
)
