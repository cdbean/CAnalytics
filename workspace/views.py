from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, HttpResponseBadRequest
import json
from django.http import QueryDict

from canalytics import settings

from django.contrib.auth.models import Group
from workspace.models import Case, DataEntry, Entity, Relationship
from annotator.models import Annotation
from workspace.entity import get_or_create_entity, set_primary_attr, get_or_create_relationship
from sync.views import sync_item
import sync.views as sync
from logger.views import serverlog

# Create your views here.
def cases_page(request):
    if request.method == 'GET':
        return render(request, 'cases.html')


"""to find if case is in the case list
if found, return the location
else return -1
"""
def find_case(case, case_list):
    for i, c in enumerate(case_list):
        if c['id'] == case.id:
            return i
    return -1


def cases(request):
    res = {'cases_other': [], 'cases_user': []}
    if request.method == 'GET':
        u_groups = request.user.groups.all()
        # all groups that do not include user
        nu_groups = Group.objects.exclude(id__in=u_groups.values_list('id', flat=True))
        # cases that the user (more exactly, the groups that the user is in) has
        cases = Case.objects.filter(groups__in=u_groups).distinct()
        for case in cases:
            c_groups = case.groups.all()
            u_c_groups = c_groups & u_groups
            nu_c_groups = c_groups & nu_groups
            res['cases_user'].append({
                'id': case.id,
                'name': case.name,
                'description': case.description,
                'start_date': case.start_date.strftime('%m/%d/%Y-%H:%M:%S') if case.start_date else None,
                'end_date': case.end_date.strftime('%m/%d/%Y-%H:%M:%S') if case.end_date else None,
                'location': case.location.wkt if case.location else None,
                'usergroups': [{'id': g.id, 'name': g.name} for g in u_c_groups],
                'othergroups': [{'id': g.id, 'name': g.name} for g in nu_c_groups]
            })

        # cases that the user does not have access to
        cases = Case.objects.exclude(groups__in=u_groups)
        for case in cases:
            g_list = [{'id': g.id, 'name': g.name} for g in case.groups.all()]

            res['cases_other'].append({
                'id': case.id,
                'name': case.name,
                'description': case.description,
                'start_date': case.start_date.strftime('%m/%d/%Y-%H:%M:%S') if case.start_date else None,
                'end_date': case.end_date.strftime('%m/%d/%Y-%H:%M:%S') if case.end_date else None,
                'location': case.location.wkt if case.location else None,
                'usergroups': [],
                'othergroups': g_list
           })
        return HttpResponse(json.dumps(res), content_type='application/json')

    elif request.method == 'POST':
        try:
            case = Case.objects.get(id=request.POST['case'])
            g_id = int(request.POST['group'])
            if g_id == 0: # create a new group
                group = Group.objects.create(name=request.POST['group_name'], pin=request.POST['group_pin'])
                group.user_set.add(request.user)
                case.groups.add(group)
            else: # either join user group or other group
                try: 
                    group = request.user.groups.get(id=g_id)
                except:
                    # join other group
                    try:
                        group = Group.objects.get(id=g_id, pin=request.POST['group_pin'])
                        group.user_set.add(request.user)
                    except:
                        return HttpResponse('Group PIN incorrect')
        except:
            return HttpResponse('Error: You are not a member of the group in this case')
        return redirect('ws:case_page', case=case.id, group=group.id)


def join_case(request):
    if request.method == 'POST':
        try:
            case = Case.objects.get(id=request.POST['case'], pin=request.POST['case_pin'])
        except Case.DoesNotExist:
            return HttpResponse('Case PIN incorrect')

        g_id = int(request.POST['group'])
        if g_id == 0:
            group = Group.objects.create(name=request.POST['group_name'], pin=request.POST['group_pin'])
        else:
            try:
                group = Group.objects.get(id=g_id, pin=request.POST['group_pin'])
            except Group.DoesNotExist:
                return HttpResponse('Group PIN incorrect')

        group.user_set.add(request.user)
        case.groups.add(group)

        return redirect('ws:case_page', case=case.id, group=group.id)


@login_required
def case_page(request, case, group):
    try:
        group = request.user.groups.get(id=group)
        case = group.case_set.get(id=case)
    except:
        return HttpResponse('Sorry, you cannot join the group in this case')
        
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


@login_required
def case_info(request):
    res = {}
    if request.method == 'GET': 
        try:
            group = request.user.groups.get(id=request.GET['group'])
            case = group.case_set.get(id=request.GET['case'])
            othergroups = request.user.groups.exclude(id=request.GET['group']) & case.groups.all()
        except:
            return HttpResponse('Query failed')

        res['group'] = {
            'id': group.id,
            'name': group.name,
            'pin': group.pin
        }
        res['case'] = {
            'description': case.description,
            'id': case.id,
            'name': case.name,
            'pin': case.pin,
            'start_date': case.start_date.strftime('%m/%d/%Y-%H:%M:%S') if case.start_date else None,
            'end_date': case.end_date.strftime('%m/%d/%Y-%H:%M:%S') if case.end_date else None,
            'address': case.address,
            'location': case.location.wkt if case.location else None,
        }
        res['othergroups'] = []
        for g in othergroups:
            res['othergroups'].append({
                'id': g.id,
                'name': g.name,
                'pin': g.pin
            })
        return HttpResponse(json.dumps(res), content_type='application/json')


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



@login_required
def entity(request, id=0):
    if request.method == 'POST':
        res = {'entity': [], 'relationship': []}
        data = request.POST
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
    # delete an entity    
    if request.method == 'DELETE':
        res = {}
        data = QueryDict(request.body)
        case = Case.objects.get(id=data['case'])
        group = Group.objects.get(id=data['group'])
        try:
            entity = Entity.objects.get(id=int(id), case=case, group=group)
        except:
            return HttpResponse('Error: entity not found')
        res['entity'] = entity.serialize()
        serverlog({
            'user': request.user,
            'operation': 'deleted',
            'item': entity.entity_type,
            'tool': 'entity_table',
            'data': {
                'id': entity.id,
                'name': entity.name
            },
            'public': True,
            'case': case,
            'group': group
        })
        entity.delete()
        sync_item('delete', 'entity', res, case, group, request.user)
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
            'operation': 'updated',
            'item': entity.entity_type,
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


@login_required
def relationship(request, id=0):
    if request.method == 'POST':
        return create_relationship(request)
    elif request.method == 'PUT':
        return update_relationship(request, id)
    elif request.method == 'DELETE':
        return delete_relationship(request, id)


def relationships(request):
    pass


def create_relationship(request):
    res = {}
    data = json.loads(request.body)
    case = Case.objects.get(id=data['case'])
    group = Group.objects.get(id=data['group'])
    rel, created, new_ents = get_or_create_relationship(data['data'], case, group, request.user)
    res['relationship'] = rel.serialize()
    sync_item('create', 'relationship', res, case, group, request.user)
    return HttpResponse(json.dumps(res), content_type='application/json')



def update_relationship(request, id):
    res = {}
    data = json.loads(request.body)
    case = Case.objects.get(id=data['case'])
    group = Group.objects.get(id=data['group'])
    rel, created, new_ents = get_or_create_relationship(data['data'], case, group, request.user)
    res['relationship'] = rel.serialize()
    sync_item('update', 'relationship', res, case, group, request.user)
    return HttpResponse(json.dumps(res), content_type='application/json')


def delete_relationship(request, id):
    res = {}
    data = QueryDict(request.body)
    case = Case.objects.get(id=data['case'])
    group = Group.objects.get(id=data['group'])
    try:
        rel = Relationship.objects.get(id=int(id), case=case, group=group)
    except:
        return HttpResponse('Error: relationship not found')
    res['relationship'] = rel.serialize()
    if rel.relation == 'involve':
        source = Entity.objects.filter(id=rel.source.id).select_subclasses()[0]
        target = Entity.objects.filter(id=rel.target.id).select_subclasses()[0]
        if source.entity_type == 'event':
            if target.entity_type == 'person': source.person.remove(target)
            if target.entity_type == 'location': source.location = None
            if target.entity_type == 'organization': source.organization.remove(target)
        elif source.entity_type == 'organization':
            if target.entity_type == 'person': source.person.remove(target)
        res['entity'] = source.serialize()

    serverlog({
        'user': request.user,
        'operation': 'deleted',
        'item': 'relationship',
        'tool': 'network',
        'data': {
            'id': rel.id,
            'name': rel.relation,
            'source': rel.source.name,
            'target': rel.target.name,
        },
        'public': True,
        'case': case,
        'group': group
    })
    rel.delete()
    sync_item('delete', 'relationship', res, case, group, request.user)
    return HttpResponse(json.dumps(res), content_type='application/json')

