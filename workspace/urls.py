from django.conf.urls import url
from workspace import views


urlpatterns = [
    # Examples:
    url(r'^cases$', views.cases_page, name='cases_page'),
    url(r'^cases/all$', views.cases, name='cases'),
    url(r'^cases/join$', views.join_case, name='join_case'),
    url(r'^case$', views.case_info, name='case_info'),
    url(r'^case/(?P<case>\d+)/group/(?P<group>\d+)$', views.case_page, name='case_page'),
    url(r'^data$', views.data, name='data'),
    # url(r'^data/upload$', upload_data),
    url(r'^entities$', views.entities, name='entities'),
    url(r'^entity/attr$', views.entity_attr, name='entity_attr'),
    url(r'^entity/(\d+)$', views.entity, name='entity_id'),
    url(r'^entity$', views.entity, name='entity'),
    url(r'^relationships$', views.relationships, name='relationships'),
    url(r'^relationship/(\d+)$', views.relationship, name='relationship_id'),
    url(r'^relationship$', views.relationship, name='relationship'),
    url(r'^view/network$', views.network_view, name='network_view'),
]
