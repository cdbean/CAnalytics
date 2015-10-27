from django.conf.urls import patterns, url
from django.contrib.auth import views as auth_views
from views import login, register, logout, users, validate_username, validate_groupname, reset_password, reset_password_done

urlpatterns = patterns('',
    url(r'^users$', users, name='users'),
    url(r'^login/$', login, name='login'),
    url(r'^register/$', register, name='register'),
    url(r'^logout/$', logout, name='logout'),
    url(r'^reset-password/$', reset_password, name='reset_password'),
    url(r'^reset-password/done$', reset_password_done, name='reset_password_done'),
    url(r'^validate/username$', validate_username, name='validate_username'),
    url(r'^validate/groupname/(?P<case>\d+)$', validate_groupname, name='validate_groupname'),
)

