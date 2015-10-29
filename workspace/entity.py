from django.contrib.gis.geos import fromstr
from dateutil.parser import parse as parse_date

from workspace.models import *

def get_or_create_relationship(data, case, group, user):
    created = False
    new_ents = []
    updated_ents = []
    id = data.get('id', 0)

    if id:
        relationship = Relationship.objects.get(id=id)
        relationship, new_ents, updated_ents = update_relationship(relationship, data, user)
    else:
        relationship, new_ents, updated_ents = create_relationship(data, case, group, user)
        created = True

    return relationship, created, new_ents, updated_ents


def update_relationship(relationship, data, user):
    new_ents = []
    updated_ents = []
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

    if relationship.source != source:
        updated_ents += [source, relationship.source]
        relationship.source = source
    if relationship.target != target:
        updated_ents += [target, relationship.target]
        relationship.target = target
    relationship.relation = relation
    relationship.priority = priority
    relationship.note = note
    relationship.save()
    return relationship, new_ents, updated_ents


def create_relationship(data, case, group, user):
    new_ents = []
    updated_ents = []
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

    updated_ents += [source, target]
    relationship = Relationship.objects.create(source=source, target=target, relation=relation, note=note, priority=priority, case=case, group=group, created_by=user)

    return relationship, new_ents, updated_ents


def get_or_create_entity(data, case, group, user):
    created = False
    new_rels = []  # return new created relationships
    del_rels = []  # deleted relationships
    updated_ents = [] # entities that have new relationships
    id = data.get('id', 0)
    entity_type = data.get('entity_type', '')
    attrs = data.get('attribute', [])

    if id:
        entity = Entity.objects.filter(id=id).select_subclasses()
        if len(entity) > 0:
            entity = entity[0]
        else:
            entity = create_entity(data, user, case, group)
            created = True
    else:
        entity = create_entity(data, user, case, group)
        created = True

    if 'name' in data: entity.name = data['name']
    entity.last_edited_by = user
    new_ents, new_rels, del_rels, updated_ents = set_entity_attr(entity, attrs, user, case, group)
    entity.save()

    return entity, created, new_ents, new_rels, del_rels, updated_ents


def create_entity(json, user, case, group):
    name = json['name']

    if name:
        entity_type = json['entity_type']
        if entity_type == 'person':
            obj, created = Person.objects.get_or_create(name=name, case=case, group=group)
        if entity_type == 'location':
            obj, created = Location.objects.get_or_create(name=name, case=case, group=group)
        if entity_type == 'event':
            obj, created = Event.objects.get_or_create(name=name, case=case, group=group)
        if entity_type == 'resource':
            obj, created = Resource.objects.get_or_create(name=name, case=case, group=group)
        if entity_type == 'organization':
            obj, created = Organization.objects.get_or_create(name=name, case=case, group=group)

        if created: 
            obj.created_by = user
            obj.save()
        return obj

    else:
        return None


def set_entity_attr(entity, attrs, user, case, group):
    """ add attributes to entity """
    new_ents = []  # return new created entities
    new_rels = []  # return new created relationships
    del_rels = []  # return to be deleted relationships
    updated_ents = []
    fields = entity._meta.get_all_field_names()
    entity.attributes.clear()

    for attr in attrs:
        if attr in fields:
            n_ents, n_rels, d_rels, u_ents = set_primary_attr(entity, attr, attrs[attr], user, case, group)
            new_ents += n_ents
            new_rels += n_rels
            del_rels += d_rels
            updated_ents += u_ents
        else:
            attribute, created = Attribute.objects.get_or_create(attr=attr, val=attrs[attr])
            entity.attributes.add(attribute)

    entity.save()
    return new_ents, new_rels, del_rels, updated_ents


def set_primary_attr(entity, attr, value, user, case, group):
    new_ents = []  # return new created entities
    new_rels = []  # return new created relationships
    del_rels = []  # return to be deleted relationships
    updated_ents = []

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
        new_loc, new_loc_rels, del_loc_rels, updated_ents = set_attr_location(entity, value, user, case, group)

        new_ents += new_loc
        new_rels += new_loc_rels
        del_rels += del_loc_rels
    elif attr == 'person':
        new_people, new_people_rels, del_people_rels, updated_ents = set_attr_people(entity, value, user, case, group)
        new_ents += new_people
        new_rels += new_people_rels
        del_rels += del_people_rels
    elif attr == 'organization':
        new_org, new_org_rels, del_org_rels, updated_ents = set_attr_organization(entity, value, user, case, group)

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
    else: 
        if value == '':
            value = None
        # do not change boolean values
        elif value is True or value is False:
            pass
        else: # normal field such as char and float
            try:
                value = float(value)
            except:
                pass

        setattr(entity, attr, value)

    entity.save()

    return new_ents, new_rels, del_rels, updated_ents


def set_attr_location(entity, value, user, case, group):
    new_ents = []
    new_rels = []
    del_rels = []
    updated_ents = []

    if value:
        if value.isdigit():
            location = Location.objects.get(id=value)
            updated_ents.append(location)
        else:
            location = Location.objects.create(name=value, created_by=user, last_edited_by=user, case=case, group=group)
            new_ents.append(location)

        if entity.location and entity.location != location:
            del_rel = Relationship.objects.filter(
                source=entity,
                target=entity.location,
                relation='involve',
                case=case,
                group=group
            )
            del_rels += del_rel
        else:
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
            del_rel = Relationship.objects.filter(
                source=entity,
                target=entity.location,
                relation='involve',
                case=case,
                group=group
            )
            del_rels += del_rel
            entity.location = None

    return new_ents, new_rels, del_rels, updated_ents



def set_attr_people(entity, value, user, case, group):
    old_people_rels = []
    old_people = entity.person.all()
    new_ents = []  # new people entity
    new_rel_people = []  # new related people
    new_rels = []  # new relationships
    del_rels = []
    updated_ents = []

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
                    entity.person.add(p)
                    updated_ents.append(p)
                else:
                    p = entity.person.create(name=p, created_by=user, last_edited_by=user, case=case, group=group)
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
            entity.person.remove(p)
            del_rel = Relationship.objects.filter(
                source=entity,
                target=p,
                relation='involve',
                case=case,
                group=group
            )
            del_rels += del_rel

    return new_ents, new_rels, del_rels, updated_ents


def set_attr_organization(entity, value, user, case, group):
    old_org_rels = []
    old_org = entity.organization.all()
    new_ents = []  # new organization entity
    new_rel_org = []  # new related orgs
    new_rels = []  # new relationships
    del_rels = []
    updated_ents = []

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
                    entity.organization.add(p)
                    updated_ents.append(p)
                else:
                    p = entity.organization.create(name=p, created_by=user, last_edited_by=user, case=case, group=group)
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
            entity.organization.remove(p)
            del_rel = Relationship.objects.get(
                source=entity,
                target=p,
                relation='involve',
                case=case,
                group=group
            )
            del_rels.append(del_rel)

    return new_ents, new_rels, del_rels, updated_ents

