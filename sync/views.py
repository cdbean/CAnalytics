from django.http import HttpResponse
from drealtime import iShoutClient
import json

from django.contrib.auth.models import Group, User
from workspace.models import Case
from sync.models import Message


# Create your views here.
ishout_client = iShoutClient()


def group_name(case, group):
    """generate group name for sync
    """
    return (case.name + '-' + group.name).replace(' ', '')


def join_group(request):
    case = Case.objects.get(id=int(request.POST['case']))
    group = Group.objects.get(id=int(request.POST['group']))
    name = group_name(case, group)
    ishout_client.register_group(request.user.id, name)
    return HttpResponse('success')



def messages(request):
    if request.method == 'GET':
        group = request.GET['group']
        case  = request.GET['case']
        msgs = Message.objects.filter(group=group, case=case).order_by('sent_at')
        res = [msg.serialize() for msg in msgs]
        return HttpResponse(json.dumps(res), content_type='application/json')


def message(request):
    if request.method == 'POST':
        res = 'error'
        content = request.POST.get('content')
        case = request.POST.get('case')
        group = request.POST.get('group')
        case = Case.objects.get(id=int(case))
        group = Group.objects.get(id=int(group))
        name = group_name(case, group)
        sender = request.user
        msg = Message(sender=sender, content=content, group=group, case=case)
        msg.save()
        ishout_client.broadcast_group(name, 'message', msg.serialize())
        res = 'success'
        return HttpResponse(res)


def sync_item(action, item, data, case, group, user):
    """ broadcast to group
     @action: string
     @item: string, e.g. 'annotaiton', 'entity'
     @data: dict
    """
    name = group_name(case, group)
    data['user']= user.id
    ishout_client.broadcast_group(name, '%s.%s' % (item, action), data)


def broadcast_activity(data, case, group, user):
    name = group_name(case, group)
    ishout_client.broadcast_group(name, 'activitylog', data)

