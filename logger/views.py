from django.http import HttpResponse
import json

from django.contrib.auth.models import User, Group
from workspace.models import DataEntry, Case
from logger.models import Action

# Create your views here.
def logs(request):
    res = []
    case_id = request.GET.get('case')
    group_id = request.GET.get('group')
    actions = Action.objects.filter(case__id=case_id, group__id=group_id, public=True).order_by('time')
    for act in actions:
        res.append(act.serialize())

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
