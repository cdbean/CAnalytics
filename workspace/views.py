from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, HttpResponseBadRequest
import json

from canalytics import settings

from django.contrib.auth.models import Group
from workspace.models import Case, DataEntry, Entity, Relationship
from annotator.models import Annotation
from workspace.entity import get_or_create_entity, set_primary_attr
from sync.views import sync_item
from logger.views import serverlog

# Create your views here.
@login_required
def home(request, case, group):
    case = get_object_or_404(Case, id=case)
    group = get_object_or_404(Group, id=group)
    return render(request, 'index.html', {
        "case": case,
    })


def cases(request):
    pass


@login_required
def case(request, case, group):
    case = get_object_or_404(Case, id=case)
    group = get_object_or_404(Group, id=group)
    datasets = case.dataset_set.all()
    for ds in datasets:
        ds.entries = ds.dataentry_set.count()
    users = group.user_set.all()
    return render(request, 'index.html', {
        "case": case,
        "group": group,
        "datasets": datasets,
        "users": users,
        "notepad_url": settings.NOTEPAD_URL
    })


def data(request):
    res = {'datasets': [], 'dataentries': [], 'entities': [], 'relationships': [], 'annotations': []}
    try:
        group = request.user.groups.get(id=request.GET['group'])
        case = group.case_set.get(id=request.GET['case'])
    except:
        return HttpResponseBadRequest()

    datasets = case.dataset_set.all()
    for ds in datasets:
        res['datasets'].append(ds.serialize())
    dataentries = DataEntry.objects.filter(dataset__in=datasets)
    for de in dataentries:
        res['dataentries'].append(de.serialize())
    entities = Entity.objects.filter(case=case, group=group).select_subclasses()
    for e in entities:
        res['entities'].append(e.serialize())
    relationships = Relationship.objects.filter(case=case, group=group)
    for r in relationships:
        res['relationships'].append(r.serialize())
    annotations = Annotation.objects.filter(case=case, group=group)
    for a in annotations:
        res['annotations'].append(a.serialize())

    return HttpResponse(json.dumps(res), content_type='application/json')



def entity(request, id):
    if request.method == 'POST':
        res = {'entity': [], 'relationship': []}
        data = json.loads(request.POST['data'])
        case = Case.objects.get(id=data['case'])
        group = Group.objects.get(id=data['group'])
        entity, created, new_ents, new_rels, del_rels = get_or_create_entity(data, case, group, request.user)
        res['entity'] = [entity.serialize()] if entity else []
        res['entity'] += [e.serialize() for e in new_ents]
        res['relationship'] += [r.serialize() for r in new_rels]

        for r in del_rels:
            r_info = r.serialize()
            r_info['deleted'] = True
            res['relationship'].append(r_info)
            r.delete()

        sync_item('update', 'entity', res, case, group, request.user)

        return HttpResponse(json.dumps(res), content_type='application/json')

def entity_attr(request):
    if request.method == 'POST':
        id = request.POST['id']
        case = request.POST['case']
        group = request.POST['group']
        attr = request.POST['attr']
        value = request.POST['value']

        case = Case.objects.get(id=case)
        group = Group.objects.get(id=group)
        entity = Entity.objects.filter(id=id).select_subclasses()[0]
        fields = entity._meta.get_all_field_names()
        if (attr in fields):
            set_primary_attr(entity, attr, value, request.user, case, group)
        else:
            attribute, created = Attribute.objects.get_or_create(attr=attr, val=value)
            entity.attributes.add(attribute)

        entity.save()
        serverlog({
            'user': request.user,
            'operation': 'update',
            'item': 'entity attribute',
            'tool': 'entity_table',
            'data': {
                'id': entity.id,
                'name': entity.name,
                'attribute': attr,
                'value': value,
            },
            'public': True,
            'case': case,
            'group': group
        })
        return HttpResponse(value) # just return the value or return the whole entity?



def entities(request):
    pass


def relationship(request, id):
    if request.method == 'POST':
        create_relationship(request)
    elif request.method == 'PUT':
        update_relationship(request, id)
    elif request.method == 'DELETE':
        delete_relationship(request, id)


def relationships(request):
    pass


def create_relationship(request):
    pass


def update_relationship(request):
    pass

def delete_relationship(request):
    pass
