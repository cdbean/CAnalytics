from django.conf.urls import url

from logger import views

urlpatterns = [
    # Examples:
    url(r'^logs$', views.logs, name='logs'),
    url(r'^log$', views.log, name='log'),
    url(r'^entity/(\d+)$', views.entity_log, name='entity_log'),
    url(r'^relationship/(\d+)$', views.relationship_log, name='relationship_log'),
]
