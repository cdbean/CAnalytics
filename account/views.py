from django.shortcuts import render, redirect
from django.contrib.auth import login as auth_login, authenticate, logout as auth_logout
from django.contrib.auth import views
from django.http import HttpResponse, HttpResponseBadRequest

import json

from django.contrib.auth.models import User, Group
from workspace.models import Case
from .psuAuth import psuAuth


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
            except:
                return HttpResponse('Invalid credentials')
        else:
            return HttpResponse('Invalid credentials')

    else:
        return render(request, 'account/login.html')


def register(request):
    if request.method == 'GET':
        return render(request, 'account/register.html')

    if request.method == 'POST':
        email = request.POST.get('email', '')
        psd   = request.POST.get('password', '')
        fname = request.POST.get('fname')
        lname = request.POST.get('lname')
        if email and psd and fname and lname:
            username = email.split('@')[0]
            if User.objects.filter(username=username).exists():
                user = authenticate(username=username, password=psd)
                if user:
                    auth_login(request, user)
                    return redirect('home')
                else:
                    return HttpResponse('email exists')
            else:
                User.objects.create_user(username=username, email=email, password=psd, first_name=fname, last_name=lname)
                user = authenticate(username=username, password=psd)
                auth_login(request, user)
                return redirect('home')


def logout(request):
    auth_logout(request)
    return redirect('account:login')


def reset_password(request):
    template_response = views.password_reset(request, post_reset_redirect='account:reset_password_done')
    return template_response

def reset_password_done(request):
    template_response = views.password_reset_done(request)
    return template_response


def users(request):
    res = []
    group = request.user.groups.get(id=request.GET['group'])
    users = group.user_set.all()
    for u in users:
        res.append({
            'id': u.id,
            'name': u.first_name, # name is for display
            'fname': u.first_name,
            'lname': u.last_name,
            'email': u.email,
            'username': u.username
        })
    return HttpResponse(json.dumps(res), content_type='application/json')


def validate_username(request):
    validated = True
    username = request.GET['username']
    if User.objects.filter(username=username).exists():
        validated = False

    if validated:
        return HttpResponse(status=200)
    else:
        return HttpResponseBadRequest()



def validate_groupname(request, case):
    validated = True
    try:
        case = Case.objects.get(id=case)
        gname = request.GET['group_name']
    except:
        return HttpResponseBadRequest()
    if case.groups.filter(name=gname).exists():
        validated = False

    if validated:
        return HttpResponse(status=200)
    else:
        return HttpResponseBadRequest()
