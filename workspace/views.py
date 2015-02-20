from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, HttpResponseBadRequest
import json

from django.contrib.auth.models import Group
from workspace.models import Case, DataEntry, Entity, Relationship
from annotator.models import Annotation

# Create your views here.
@login_required
def home(request, case, group):
    case = get_object_or_404(Case, id=case)
    group = get_object_or_404(Group, id=group)
    return render(request, 'index.html', {
        "case": case,
    })


def cases(request):
    pass


def case(request, case, group):
    case = get_object_or_404(Case, id=case)
    group = get_object_or_404(Group, id=group)
    datasets = case.dataset_set.all()
    for ds in datasets:
        ds.entries = ds.dataentry_set.count()
    return render(request, 'index.html', {
        "case": case,
        "group": group,
        "datasets": datasets
    })


def data(request):
    res = {'datasets': [], 'dataentries': [], 'entities': [], 'relationships': [], 'annotations': [], 'users': []}
    try:
        group = request.user.groups.get(id=request.GET['group'])
        case = group.case_set.get(id=request.GET['case'])
    except:
        return HttpResponseBadRequest()

    users = group.user_set.all()
    for u in users:
        res['users'].append({
            'id': u.id,
            'name': u.username
        })
    datasets = case.dataset_set.all()
    for ds in datasets:
        res['datasets'].append(ds.serialize())
    print 'ds'
    dataentries = DataEntry.objects.filter(dataset__in=datasets)
    for de in dataentries:
        res['dataentries'].append(de.serialize())
    print 'de'
    entities = Entity.objects.filter(case=case, group=group).select_subclasses()
    for e in entities:
        res['entities'].append(e.serialize())
    print 'entity'
    relationships = Relationship.objects.filter(case=case, group=group)
    for r in relationships:
        res['relationships'].append(r.serialize())
    print 'rel'
    annotations = Annotation.objects.filter(case=case, group=group)
    for a in annotations:
        res['annotations'].append(a.serialize())
    print 'ann'

    return HttpResponse(json.dumps(res), content_type='application/json')



def entity(request, id):
    pass


def entities(request):
    pass


def relationship(request, id):
    pass


def relationships(request):
    pass
