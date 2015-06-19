from django.contrib.gis.geos import fromstr
from dateutil.parser import parse as parse_date

from logger.views import serverlog
from workspace.models import *

def get_or_create_relationship(data, case, group, user):
    created = False
    new_ents = []
    id = data.get('id', 0)

    if id:
        relationship = Relationship.objects.get(id=id)
        relationship, new_ents = update_relationship(relationship, data, user)
    else:
        relationship, new_ents = create_relationship(data, case, group, user)
        created = True

    operation = 'created' if created else 'updated'
    serverlog({
        'user': user,
        'operation': operation,
        'item': 'relationship',
        'tool': 'network',
        'data': {
            'id': relationship.id,
            'name': relationship.relation,
            'source': relationship.source.name,
            'target': relationship.target.name,
        },
        'public': True,
        'case': case,
        'group': group
    })

    return relationship, created, new_ents


def update_relationship(relationship, data, user):
    new_ents = []
    attrs = data['attribute']
    source = attrs['source']
    target = attrs['target']
    relation = attrs.get('relation', '')
    note = attrs.get('note', '')
    priority = attrs.get('priority', 5)

    if source.isdigit():
        source = Entity.objects.get(id=source)
    else:
        source = create_entity(data, case, group, user)
        new_ents.append(source)
    if target.isdigit():
        target = Entity.objects.get(id=target)
    else:
        target = create_entity(data, case, group, user)
        new_ents.append(target)

    relationship.source = source
    relationship.target = target
    relationship.relation = relation
    relationship.priority = priority
    relationship.note = note
    relationship.save()
    return relationship, new_ents


def create_relationship(data, case, group, user):
    new_ents = []
    attrs = data['attribute']
    source = attrs['source']
    target = attrs['target']
    relation = attrs.get('relation', '')
    note = attrs.get('note', '')
    priority = attrs.get('priority', 5)

    if source.isdigit():
        source = Entity.objects.get(id=source)
    else:
        source = create_entity(data, case, group, user)
        new_ents.append(source)
    if target.isdigit():
        target = Entity.objects.get(id=target)
    else:
        target = create_entity(data, case, group, user)
        new_ents.append(target)

    relationship = Relationship.objects.create(source=source, target=target, relation=relation, note=note, priority=priority, case=case, group=group, created_by=user)

    return relationship, new_ents


def get_or_create_entity(data, case, group, user):
    created = False
    new_rels = []  # return new created relationships
    del_rels = []  # deleted relationships
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
    new_ents, new_rels, del_rels = set_entity_attr(entity, attrs, user, case, group)
    entity.save()

    operation = 'created' if created else 'updated'
    serverlog({
        'user': user,
        'operation': operation,
        'item': entity.entity_type,
        'tool': entity.entity_type + '_table',
        'data': {
            'id': entity.id,
            'name': entity.name
        },
        'public': True,
        'case': case,
        'group': group
    })

    return entity, created, new_ents, new_rels, del_rels


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
    del_rels = []  # return to be deleted relationships
    fields = entity._meta.get_all_field_names()
    entity.attributes.clear()

    for attr in attrs:
        if attr in fields:
            n_ents, n_rels, d_rels = set_primary_attr(entity, attr, attrs[attr], user, case, group)
            new_ents += n_ents
            new_rels += n_rels
            del_rels += d_rels
        else:
            attribute, created = Attribute.objects.get_or_create(attr=attr, val=attrs[attr])
            entity.attributes.add(attribute)

    entity.save()
    return new_ents, new_rels, del_rels


def set_primary_attr(entity, attr, value, user, case, group):
    new_ents = []  # return new created entities
    new_rels = []  # return new created relationships
    del_rels = []  # return to be deleted relationships

    if attr == 'geometry':
        address = value['address']
        geometry = value['geometry']
        if geometry and len(geometry):
            geometry = fromstr('POINT(%s %s)' %(geometry[0], geometry[1]))  # longitude comes first
            entity.geometry = geometry
            entity.address = address
        else:
            entity.geometry = None
            entity.address = address

    elif attr == 'location':
        new_loc, new_loc_rels, del_loc_rels = set_attr_location(entity, value, user, case, group)

        new_ents += new_loc
        new_rels += new_loc_rels
        del_rels += del_loc_rels
    elif attr == 'people':
        new_people, new_people_rels, del_people_rels = set_attr_people(entity, value, user, case, group)
        new_ents += new_people
        new_rels += new_people_rels
        del_rels += del_people_rels
    elif attr == 'organizations':
        new_org, new_org_rels, del_org_rels = set_attr_organization(entity, value, user, case, group)

        new_ents += new_org
        new_rels += new_org_rels
        del_rels += del_org_rels

    elif 'date' in attr or attr == 'repeated_until':
        if value == '':
            value = None
        else:
            try:
                value = parse_date(value)
            except:
                pass
        setattr(entity, attr, value)
    else: # normal field such as char and float
        if value == '':
            value = None
        else:
            try:
                value = float(value)
            except:
                pass

        setattr(entity, attr, value)

    entity.save()

    return new_ents, new_rels, del_rels


def set_attr_location(entity, value, user, case, group):
    new_ents = []
    new_rels = []
    del_rels = []

    if value:
        if value.isdigit():
            location = Location.objects.get(id=value)
        else:
            location = Location.objects.create(name=value, created_by=user, last_edited_by=user, case=case, group=group)
            new_ents.append(location)

        if entity.location != location:
            if entity.location:
                del_rel = Relationship.objects.get(
                    source=entity,
                    target=entity.location,
                    relation='involve',
                    case=case,
                    group=group
                )
                del_rels.append(del_rel)

            entity.location = location
            rel = Relationship.objects.create(
                source=entity,
                target=location,
                relation='involve',
                case=case,
                group=group,
                created_by = user,
                last_edited_by = user
            )
            new_rels.append(rel)
    else:
        if entity.location:
            del_rel = Relationship.objects.get(
                source=entity,
                target=entity.location,
                relation='involve',
                case=case,
                group=group
            )
            del_rels.append(del_rel)
            entity.location = None

    return new_ents, new_rels, del_rels



def set_attr_people(entity, value, user, case, group):
    old_people_rels = []
    old_people = entity.people.all()
    new_ents = []  # new people entity
    new_rel_people = []  # new related people
    new_rels = []  # new relationships
    del_rels = []

    if len(old_people):
        old_people_rels = Relationship.objects.filter(
            source=entity,
            target__in=old_people,
            relation='involve',
            case=case,
            group=group
        )

    if value and len(value):
        for p in value:
            if p:
                if p.isdigit():
                    p = Person.objects.get(id=p)
                    entity.people.add(p)
                else:
                    p = entity.people.create(name=p, case=case, group=group)
                    new_ents.append(p)
                new_rel_people.append(p)
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

    for p in old_people:
        if p not in new_rel_people:
            entity.people.remove(p)
            del_rel = Relationship.objects.get(
                source=entity,
                target=p,
                relation='involve',
                case=case,
                group=group
            )
            del_rels.append(del_rel)

    return new_ents, new_rels, del_rels


def set_attr_organization(entity, value, user, case, group):
    old_org_rels = []
    old_org = entity.organizations.all()
    new_ents = []  # new organization entity
    new_rel_org = []  # new related orgs
    new_rels = []  # new relationships
    del_rels = []

    if len(old_org):
        old_org_rels = Relationship.objects.filter(
            source=entity,
            target__in=old_org,
            relation='involve',
            case=case,
            group=group
        )

    print entity, value
    if value and len(value):
        for p in value:
            if p:
                if p.isdigit():
                    p = Organization.objects.get(id=p)
                    entity.organizations.add(p)
                else:
                    p = entity.organizations.create(name=p, case=case, group=group)
                    new_ents.append(p)
                new_rel_org.append(p)
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

    for p in old_org:
        if p not in new_rel_org:
            entity.organizations.remove(p)
            del_rel = Relationship.objects.get(
                source=entity,
                target=p,
                relation='involve',
                case=case,
                group=group
            )
            del_rels.append(del_rel)

    return new_ents, new_rels, del_rels

