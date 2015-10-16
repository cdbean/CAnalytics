from django.http import HttpResponse
from drealtime import iShoutClient
import json
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger

from django.contrib.auth.models import Group, User
from workspace.models import Case
from sync.models import Message


# Create your views here.
ishout_client = iShoutClient()


def group_name(case, group):
    """generate group name for sync
    """
    return str(case.id) + '-' + str(group.id)


@login_required
def join_group(request):
    try:
        case = Case.objects.get(id=request.POST['case'])
        group = Group.objects.get(id=request.POST['group'])
    except:
        return
    name = group_name(case, group)
    ishout_client.register_group(request.user.id, name)
    broadcast_users_status(request.user, case, group)
    return HttpResponse()


def broadcast_users_status(user, case, group):
    data = {'users': [], 'online_users': []}
    name = group_name(case, group)

    users = group.user_set.all()
    for u in users:
        data['users'].append({
            'id': u.id,
            'name': u.username,
            'fname': u.first_name,
            'lname': u.last_name
        })

    status = ishout_client.get_room_status(name)
    data['online_users'] = status['members']

    ishout_client.broadcast_group(name, 'usersonline', data)



def messages(request):
    if request.method == 'GET':
        res = {'items': []}
        group = request.GET['group']
        case  = request.GET['case']
        msgs = Message.objects.filter(group=group, case=case).order_by('sent_at')
        paginator = Paginator(msgs, 50) # Show 50 items per page
        page = request.GET.get('page')

        try:
            msgs = paginator.page(page)
        except PageNotAnInteger:
            # If page is not an integer, deliver first page.
            msgs = paginator.page(1)
        except EmptyPage:
            # If page is out of range (e.g. 9999), deliver last page of results.
            msgs = paginator.page(paginator.num_pages)
        for msg in msgs:
            res['items'].append(msg.serialize())

        res['has_next'] = msgs.has_next()
        res['has_previous'] = msgs.has_previous()
        if (res['has_next']): res['next_page'] = msgs.next_page_number()
        if (res['has_previous']): res['previous_page'] = msgs.previous_page_number()
        res['number'] = msgs.number
        res['num_pages'] = msgs.paginator.num_pages 
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
        print 'broadcast to: ', name
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
    try:
        ishout_client.broadcast_group(name, '%s.%s' % (item, action), data)
    except:
        print '[warning] Sync failed. Is sync server running?'


def broadcast_activity(data, case, group, user):
    try:
        name = group_name(case, group)
        ishout_client.broadcast_group(name, 'action', data)
    except:
        print '[warning] Sync failed. Is sync server running?'

