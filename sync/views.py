from django.http import HttpResponse
from drealtime import iShoutClient

from django.contrib.auth.models import Group, User
from workspace.models import Case
from sync.models import Message


# Create your views here.
ishout_client = iShoutClient()


def group_name(case, group):
    pass


def message(request):
    res = 'error'
    content = request.POST.get('content')
    case = request.POST.get('case')
    group = request.POST.get('group')
    case = Case.objects.get(id=int(case))
    group = Group.objects.get(id=int(group))
    group_name = group_name(case, group)
    sender = request.user
    msg = Message(sender=sender, content=content, group=group, case=case)
    msg.save()
    ishout_client.broadcast_group(group_name, 'message', msg.tojson())
    res = 'success'
    return HttpResponse(res)
