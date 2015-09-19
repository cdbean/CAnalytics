from django.http import HttpResponse
import json
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger

from django.contrib.auth.models import User, Group
from workspace.models import DataEntry, Case
from logger.models import Action

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
    res = {}
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
        serverlog(log)
        return HttpResponse(json.dumps(res), content_type='application/json')

def serverlog(data):
    if ('public' not in data) or (data['public'] == ''):
        data['public'] = True

    Action.objects.create(
        user=data['user'],
        operation=data['operation'],
        item=data['item'],
        tool=data['tool'],
        data=json.dumps(data['data']),
        group=data['group'],
        case=data['case'],
        public=data['public']
    )
