from django.shortcuts import render, redirect
from django.contrib.auth import login as auth_login, authenticate, logout as auth_logout
from django.http import HttpResponse

import json

from django.contrib.auth.models import User, Group
from workspace.models import Case


# Create your views here.
def login(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')

        user = authenticate(username=username, password=password)
        if user:
            try:
                auth_login(request, user)
                return redirect('home')
            except Exception as e:
                print e
                return HttpResponse('User name and password do not match')
        else:
            return HttpResponse('User name and password do not match')
    else:
        return render(request, 'account/login.html')


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
    return redirect('account:login')

def users(request):
    res = []
    group = request.user.groups.get(id=request.GET['group'])
    users = group.user_set.all()
    for u in users:
        res.append({
            'id': u.id,
            'name': u.username
        })
    return HttpResponse(json.dumps(res), content_type='application/json')
