from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseNotFound

import json

from django.contrib.auth.models import User, Group
from workspace.entity import get_or_create_entity
from workspace.models import DataEntry, Case
from sync.views import sync_annotation
from logger.views import serverlog
from annotator.models import Annotation


# Create your views here.
def annotation(request, id=0):
    if request.method == 'POST':
        return post_annotation(request)

    elif request.method == 'PUT':
        return put_annotation(request, id)

    elif request.method == 'DELETE':
        return del_annotation(request, id)


def annotations(request):
    if request.method == 'GET':
        return get_annotations(request)

    elif request.method == 'POST':
        return post_annotations(request)

    elif request.method == 'PUT':
        return put_annotations(request)

    elif request.method == 'DELETE':
        return del_annotations(request)


def post_annotation(request):
    res = {}
    data = json.loads(request.body)
    ranges = data.get('ranges', '')
    quote  = data.get('quote', '')
    case   = data.get('case', '')
    group   = data.get('group', '')
    if not ranges or not case or not group:
        return HttpResponseBadRequest()
    try:
        entry = DataEntry.objects.get(id=data['anchor'])
        group = Group.objects.get(id=group)
        case = Case.objects.get(id=case)
    except:
        return HttpResponseNotFound()

    entity = data.get('entity', None)
    rel = data.get('relationship', None)
    if entity:
        entity, created, new_ents, new_rels = get_or_create_entity(entity, case, group, request.user)
    if rel:
        rel, created, new_ents = get_or_create_relationship(rel, case, group, request.user)

    annotation = Annotation.objects.create(
        startOffset=ranges[0]['startOffset'],
        endOffset=ranges[0]['endOffset'],
        quote=quote,
        dataentry=entry,
        entity=entity,
        relationship=rel,
        start=ranges[0]['start'],
        end=ranges[0]['end'],
        created_by=request.user,
        last_edited_by=request.user,
        group=group,
        case=case
    )
    annotation.save()

    res['annotation'] = annotation.serialize()
    res['relationships'] = [rel.serialize()] if rel else []
    res['relationships'] += [r.serialize() for r in new_rels]
    res['entities'] = [entity.serialize()] if entity else []
    res['entities'] += [e.serialize() for e in new_ents]

    # save to activity log
    serverlog({
        'user': request.user,
        'operation': 'created',
        'item': 'annotation',
        'tool': 'dataentry_table',
        'data': {
            'id': annotation.id,
            'name': annotation.quote
        },
        'group': group,
        'case': case
    })
    # sync annotation
    sync_annotation('create', res, case, group, request.user)

    return HttpResponse(json.dumps(res), content_type='application/json')


def put_annotation(request):
    pass


def del_annotation(request):
    pass


def get_annotations(request):
    case = request.GET.get('case')
    group = request.GET.get('group')
    annotations = []
    # if request.user.is_authenticated():
    #     anns = Annotation.objects.filter(created_by=request.user)
    # else:
    anns = Annotation.objects.filter(case__id=case, group__id=group)

    for ann in anns:
        annotations.append(ann.serialize())
    return HttpResponse(json.dumps(annotations), content_type='application/json')




def post_annotations(request):
    pass


def put_annotations(request):
    pass


def del_annotations(request):
    pass
