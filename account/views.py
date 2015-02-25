from django.shortcuts import render, redirect
from django.contrib.auth import login as auth_login, authenticate, logout as auth_logout
from django.http import HttpResponse

from django.contrib.auth.models import User, Group
from workspace.models import Case


# Create your views here.
def login(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        case = request.POST.get('case')
        group = request.POST.get('group')

        user = authenticate(username=username, password=password)
        if user:
            try:
                group = user.groups.get(id=int(group))
                case = group.case_set.get(id=int(case))
                auth_login(request, user)
                return redirect('ws:case', case=case.id, group=group.id)
            except:
                return HttpResponse('You have no permission to the case')
        else:
            return HttpResponse('User name and password do not match')
    else:
        cases = Case.objects.all()
        groups = Group.objects.all()
        return render(request, 'account/login.html', {
            "cases": cases,
            "groups": groups
        })


def register(request):
    if request.method == 'POST':
        username = request.POST.get('username', '')
        email = request.POST.get('email', '')
        psd   = request.POST.get('password', '')
    if username and email and psd:
        if User.objects.filter(username=username).exists():
            user = authenticate(username=username, password=psd)
            if user:
                auth_login(request, user)
                return redirect('workspace.views.home')
            else:
                return HttpResponse('Error: username and password do not match')
        else:
            User.objects.create_user(username=username, email=email, password=psd)
            user = authenticate(username=username, password=psd)
            auth_login(request, user)
            return redirect('workspace.views.home')

    return

def logout(request):
    auth_logout(request)
    return redirect('account: login')

