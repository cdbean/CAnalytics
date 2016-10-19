from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseNotFound

import json

from django.contrib.auth.models import User, Group
from workspace.entity import get_or_create_entity, get_or_create_relationship
from workspace.models import DataEntry, Case
# from sync.views import sync_item
from annotator.models import Annotation


# Create your views here.
def create_ann(data, case, group, user):
    """create an annotation
    return:
        the new annotation
        the new entity
        and the new relationship
    """
    ranges = data.get('ranges', '')
    quote  = data.get('quote', '')
    entry = DataEntry.objects.get(id=data['anchor'])

    # to be improved later
    # entity here could also be a relationship
    entity = data.get('entity', None)
    rel = data.get('relationship', None)
    new_rels = []
    new_ents = []
    updated_ents = []
    if entity['entity_type'] == 'relationship':
        rel = entity
    if rel:
        rel, created, new_ents, updated_ents = get_or_create_relationship(rel, case, group, user)
        entity = None
    elif entity:
        entity, created, new_ents, new_rels, del_rels, updated_ents = get_or_create_entity(entity, case, group, user)

    annotation = Annotation.objects.create(
        startOffset=ranges[0]['startOffset'],
        endOffset=ranges[0]['endOffset'],
        quote=quote,
        dataentry=entry,
        entity=entity,
        relationship=rel,
        start=ranges[0]['start'],
        end=ranges[0]['end'],
        created_by=user,
        last_edited_by=user,
        group=group,
        case=case
    )

    return annotation, [entity] + new_ents + updated_ents, [rel] + new_rels


def update_ann(annotation, data, case, group, user):
    """update an annotation
    return:
        the updated annotation
        resulted entities
        resulted relationships
        to be deleted relationships
    """
    entity = data.get('entity', None)
    rel = data.get('relationship', None)
    new_rels = []
    del_rels = []
    updated_ents = []

    if entity['entity_type'] == 'relationship':
        rel = entity
    if rel:
        rel, created, new_ents, updated_ents = get_or_create_relationship(rel, case, group, user)
        entity = None
    if entity:
        entity, created, new_ents, new_rels, del_rels, updated_ents = get_or_create_entity(entity, case, group, user)

    annotation.last_edited_by = user
    annotation.entity = entity
    annotation.relationship = rel
    annotation.save()

    return annotation, [entity] + new_ents + updated_ents, [rel] + new_rels, del_rels


def del_ann(annotation):
    """delete an annotation
    return:
        the deleted annotation
        deleted entity (json)
        deleted relationship (json)
    """
    annotation.deleted = True
    annotation.save()

    return annotation



def annotation(request, id=0):
    if request.method == 'POST':
        return post_annotation(request)

    elif request.method == 'PUT':
        return update_annotation(request, id)

    elif request.method == 'DELETE':
        return del_annotation(request, id)


def annotations(request):
    if request.method == 'GET':
        return get_annotations(request)

    elif request.method == 'POST':
        return post_annotations(request)

    elif request.method == 'PUT':
        return update_annotations(request)

    elif request.method == 'DELETE':
        return del_annotations(request)


def post_annotation(request):
    res = {'annotation': {}, 'entity': [], 'relationship': []}
    data = json.loads(request.body)
    case   = data.get('case', '')
    group   = data.get('group', '')
    case = Case.objects.get(id=case)
    group = Group.objects.get(id=group)

    ann, ents, rels = create_ann(data, case, group, request.user)
    res['annotation'] = ann.serialize()
    res['relationship'] += [r.serialize() for r in rels if r is not None]
    res['entity'] += [e.serialize() for e in ents if e is not None]

    # sync annotation
    # sync_item('create', 'annotation', res, case, group, request.user)

    return HttpResponse(json.dumps(res), content_type='application/json')


def update_annotation(request, id):
    res = {'annotation': {}, 'entity': [], 'relationship': []}
    if not id:
        return HttpResponseBadRequest()
    try:
        annotation = Annotation.objects.get(id=id)
    except Annotation.DoesNotExist:
        print 'Error: annotation not found: ', id
        return HttpResponseNotFound()

    group = annotation.group
    case = annotation.case
    data = json.loads(request.body)

    ann, ents, rels, del_rels = update_ann(annotation, data, case, group, request.user)

    res['annotation'] = ann.serialize()
    res['relationship'] += [r.serialize() for r in rels if r is not None]
    res['entity'] += [e.serialize() for e in ents if e is not None]

    for r in del_rels:
        r.deleted = True
        r.save()
        res['relationship'].append(r.serialize())

    # sync_item('update', 'annotation', res, case, group, request.user)

    return HttpResponse(json.dumps(res), content_type='application/json')


def del_annotation(request, id):
    if not id:
        return HttpResponseBadRequest()
    try:
        annotation = Annotation.objects.get(id=id)
    except Annotation.DoesNotExist:
        print 'Error: annotation not found: ', id
        return HttpResponseNotFound()

    res = {'annotation': {}, 'entity': {}, 'relationship': {}}

    group = annotation.group
    case = annotation.case

    ann = del_ann(annotation)
    res['annotation'] = ann.serialize()

    # sync_item('delete', 'annotation', res, case, group, request.user)

    return HttpResponse(json.dumps(res), content_type='application/json')



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
    res = {'annotations': [], 'entities': [], 'relationships': []}
    log_anns = []
    data = json.loads(request.body)

    group = data.get('group', '')
    case = data.get('case', '')
    annotations = data.get('annotations', [])

    if not group or not case or not annotations:
        return HttpResponseBadRequest()

    group = Group.objects.get(id=group)
    case = Case.objects.get(id=case)

    for ann_data in annotations:
        ann_data['group'] = group.id
        ann_data['case'] = case.id
        ann, ents, rels = create_ann(ann_data, case, group, request.user)

        res['annotations'].append(ann.serialize())

        res['relationships'] += [r.serialize() for r in rels if r is not None]
        res['entities'] += [e.serialize() for e in ents if e is not None]
        log_anns.append({'id': ann.id, 'name': ann.quote})

    # sync_item('create', 'annotation', res, case, group, request.user)
    return HttpResponse(json.dumps(res), content_type='application/json')



def update_annotations(request):
    res = {'annotations': [], 'entities': [], 'relationships': []}
    data = json.loads(request.body)

    group = data.get('group', '')
    case = data.get('case', '')
    annotations = data.get('annotations', [])

    if not group or not case or not annotations:
        return HttpResponseBadRequest()

    group = Group.objects.get(id=group)
    case = Case.objects.get(id=case)

    for ann_data in annotations:
        annotation = Annotation.objects.get(id=ann_data['id'])
        ann, ents, rels, del_rels = update_ann(annotation, ann_data, case, group, request.user)

        res['annotations'].append(annotation.serialize())
        res['relationships'] += [r.serialize() for r in rels if r is not None]
        res['entities'] += [e.serialize() for e in ents if e is not None]

        for r in del_rels:
            r.deleted = True
            r.save()
            res['relationships'].append(r.serialize())

    # sync_item('update', 'annotation', res, case, group, request.user)

    return HttpResponse(json.dumps(res), content_type='application/json')


def del_annotations(request):
    res = {'annotations': [], 'entity': {}, 'relationship': {}}
    data = json.loads(request.body)
    group = data.get('group', '')
    case = data.get('case', '')
    annotations = data.get('annotations', [])

    if not group or not case or not annotations:
        return HttpResponseBadRequest()

    group = Group.objects.get(id=group)
    case = Case.objects.get(id=case)

    for ann_data in annotations:
        annotation = Annotation.objects.get(id=ann_data['id'])
        ann = del_ann(annotation)
        res['annotations'].append(ann.serialize())

    # sync_item('delete', 'annotation', res, case, group, request.user)
    return HttpResponse(json.dumps(res), content_type='application/json')
