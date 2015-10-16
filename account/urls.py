from django.conf.urls import patterns, url
from views import login, register, logout, users, validate_username, validate_groupname

urlpatterns = patterns('',
    url(r'^users$', users, name='users'),
    url(r'^login/$', login, name='login'),
    url(r'^register/$', register, name='register'),
    url(r'^logout/$', logout, name='logout'),
    url(r'^validate/username$', validate_username, name='validate_username'),
    url(r'^validate/groupname/(?P<case>\d+)$', validate_groupname, name='validate_groupname'),
)

