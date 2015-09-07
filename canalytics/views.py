from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.http import HttpResponse

from django.contrib.auth.models import Group
from workspace.models import Case

@login_required
def home(request):
    if request.method == 'GET':
        return redirect('ws:cases_page')
    elif request.method == 'POST':
        try:
            group = request.user.groups.get(id=request.POST['group'])
            case = group.case_set.get(id=request.POST['case'])
        except:
            return HttpResponse('Error: You are not a member of the group in this case')
        return redirect('ws:case', case=case.id, group=group.id)
