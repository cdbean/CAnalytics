from django.http import HttpResponse, HttpResponseBadRequest
import json
import csv
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger

from django.contrib.auth.models import User, Group
from canalytics.settings import LOGFILE
from workspace.models import DataEntry, Case, Relationship, Entity
from logger.models import Action, DoEntity, DoRelationship

# Create your views here.
def logs(request):
    res = {'items': []}
    case_id = request.GET.get('case')
    group_id = request.GET.get('group')
    actions = Action.objects.filter(case__id=case_id, group__id=group_id, public=True).order_by('time')
    paginator = Paginator(actions, 50) # Show 50 items per page
    page = request.GET.get('page')
    try:
        actions = paginator.page(page)
    except PageNotAnInteger:
        # If page is not an integer, deliver first page.
        actions = paginator.page(1)
    except EmptyPage:
        # If page is out of range (e.g. 9999), deliver last page of results.
        actions = paginator.page(paginator.num_pages)
    for act in actions:
        res['items'].append(act.serialize())

    res['has_next'] = actions.has_next()
    res['has_previous'] = actions.has_previous()
    if (res['has_next']): res['next_page'] = actions.next_page_number()
    if (res['has_previous']): res['previous_page'] = actions.previous_page_number()
    res['number'] = actions.number
    res['num_pages'] = actions.paginator.num_pages

    return HttpResponse(json.dumps(res), content_type='application/json')


def log(request):
    if request.method == 'POST':
        group = Group.objects.get(id=request.POST['group'])
        case = Case.objects.get(id=request.POST['case'])
        data = json.loads(request.POST.get('data', '{}'))
        log = {
            'operation': request.POST['operation'],
            'item'     : request.POST['item'],
            'tool'     : request.POST['tool'],
            'data'    : data,
            'user'    : request.user,
            'group': group,
            'case': case,
            'public': request.POST.get('public', '')
        }
        act = serverlog(log)
        # write to file
        cols = ['id', 'time', 'user', 'operation', 'item', 'tool', 'public', 'group', 'case', 'data']
        with open(LOGFILE, 'a') as ofile:
            writer = csv.DictWriter(ofile, fieldnames=cols)
            writer.writerow(act)
        return HttpResponse(json.dumps(act), content_type='application/json')

def serverlog(data):
    if ('public' not in data) or (data['public'] == ''):
        data['public'] = True
    # somehow the boolean value is interpreted as string
    # convert it manually now
    if (data['public'] == 'false'): data['public'] = False

    act = Action.objects.create(
        user=data['user'],
        operation=data['operation'],
        item=data['item'],
        tool=data['tool'],
        data=json.dumps(data['data']),
        group=data['group'],
        case=data['case'],
        public=data['public']
    )
    return act.serialize()


def entity_log(request, id):
    res = []
    try:
        ent = Entity.objects.get(id=id)
    except:
        return HttpResponseBadRequest()
    logs = DoEntity.objects.filter(entity=ent, public=True)
    res = [l.serialize() for l in logs]
    return HttpResponse(json.dumps(res), content_type='application/json')


def relationship_log(request, id):
    res = []
    try:
        rel = Relationship.objects.get(id=id)
    except:
        return HttpResponseBadRequest()
    logs = DoRelationship.objects.filter(relationship=rel, public=True)
    res = [l.serialize() for l in logs]
    return HttpResponse(json.dumps(res), content_type='application/json')
