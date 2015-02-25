from django.contrib.gis.geos import fromstr
from dateutil.parser import parse as parse_date

from logger.views import serverlog
from workspace.models import *

def get_or_create_relationship(data, case, group, user):
    passs


def get_or_create_entity(data, case, group, user):
    created = False
    new_rels = []  # return new created relationships
    id = data.get('id', 0)
    entity_type = data.get('entity_type', '')
    attrs = data.get('attribute', [])

    if id and entity_type:
        entity = Entity.objects.filter(id=id, entity_type=entity_type).select_subclasses()
        if len(entity) > 0:
            entity = entity[0]
        else:
            entity = create_entity(data, user, case, group)
            created = True
    else:
        entity = create_entity(data, user, case, group)
        created = True

    entity.name = data['name']
    entity.last_edited_by = user
    new_ents, new_rels = set_entity_attr(entity, attrs, user, case, group)
    entity.save()

    operation = 'created' if created else 'updated'
    serverlog({
        'user': user,
        'operation': operation,
        'item': entity.entity_type,
        'tool': 'dataentry_table',
        'data': {
            'id': entity.id,
            'name': entity.name
        },
        'public': True,
        'case': case,
        'group': group
    })

    return entity, created, new_ents, new_rels


def create_entity(json, user, case, group):
    name = json['name']

    if name:
        entity_type = json['entity_type']
        if entity_type == 'person':
            obj, created = Person.objects.get_or_create(name=name, created_by=user, case=case, group=group)
        if entity_type == 'location':
            obj, created = Location.objects.get_or_create(name=name, created_by=user, case=case, group=group)
        if entity_type == 'event':
            obj, created = Event.objects.get_or_create(name=name, created_by=user, case=case, group=group)
        if entity_type == 'resource':
            obj, created = Resource.objects.get_or_create(name=name, created_by=user, case=case, group=group)
        if entity_type == 'organization':
            obj, created = Organization.objects.get_or_create(name=name, created_by=user, case=case, group=group)

        return obj

    else:
        return None


def set_entity_attr(entity, attrs, user, case, group):
    """ add attributes to entity """
    new_ents = []  # return new created entities
    new_rels = []  # return new created relationships
    fields = entity._meta.get_all_field_names()
    entity.attributes.clear()

    for attr in attrs:
        if attr in fields:
            ents, rels = set_primary_attr(entity, attr, attrs[attr], user, case, group)
            new_ents += ents
            new_rels += rels
        else:
            attribute, created = Attribute.objects.get_or_create(attr=attr, val=attrs[attr])
            entity.attributes.add(attribute)

    entity.save()
    return new_ents, new_rels


def set_primary_attr(entity, attr, value, user, case, group):
    new_ents = []  # return new created entities
    new_rels = []  # return new created relationships

    if attr == 'geometry':
        address = value['address']
        geometry = value['geometry']
        if geometry and len(geometry):
            geometry = fromstr('POINT(%s %s)' %(geometry[0], geometry[1]))  # longitude comes first
            entity.geometry = geometry
            entity.address = address

    elif attr == 'location':
        if value:
            if value.isdigit():
                location = Location.objects.get(id=value)
                entity.location = location
            else:
                location = Location.objects.create(name=value, created_by=user, last_edited_by=user, case=case, group=group)
                entity.location = location
                new_ents.append(location)

            rel, created = Relationship.objects.get_or_create(
                source=entity,
                target=location,
                relation='involve',
                case=case,
                group=group
            )
            if created:
                rel.created_by = user
                rel.last_edited_by = user
                rel.save()
                new_rels.append(rel)
        else:
            entity.location = None
            # TODO: delete relationships
    elif attr == 'people':
        entity.people.clear()
        if value and len(value):
            for p in value:
                if p:
                    if p.isdigit():
                        p = Person.objects.get(id=p)
                        entity.people.add(p)
                    else:
                        p = entity.people.create(name=p, case=case, group=group)
                        new_ents.append(p)
                    rel, created = Relationship.objects.get_or_create(
                        source=entity,
                        target=p,
                        relation='involve',
                        case=case,
                        group=group
                    )
                    if created:
                        rel.created_by = user
                        rel.last_edited_by = user
                        rel.save()
                        new_rels.append(rel)
    elif 'date' in attr:
        try:
            value = parse_date(value)
            setattr(entity, attr, value)
        except:
            pass
    else: # normal field such as char and float
        if value == '':
            value = None
        else:
            try:
                value = float(value)
            except:
                pass

        setattr(entity, attr, value)

    return new_ents, new_rels
