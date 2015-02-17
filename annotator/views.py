from django.shortcuts import render


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
    pass


def put_annotation(request):
    pass


def del_annotation(request):
    pass


def get_annotations(request):
    pass


def post_annotations(request):
    pass


def put_annotations(request):
    pass


def del_annotations(request):
    pass
