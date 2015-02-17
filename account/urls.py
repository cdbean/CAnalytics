from django.conf.urls import patterns, url
from views import login, register, logout

urlpatterns = patterns('',
    url(r'^login/$', login, name='login'),
    url(r'^register/$', register, name='register'),
    url(r'^logout/$', logout, name='logout'),
)

