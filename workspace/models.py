from django.contrib.gis.db import models
from model_utils.managers import InheritanceManager
from django.contrib.auth.models import User, Group
from datetime import datetime
from tinymce.models import HTMLField
from dbarray import IntegerArrayField


# Create your models here.

def get_field_value(instance, field_name):
    try:
        field = instance._meta.get_field(field_name)
        field_type = field.get_internal_type()
        value = getattr(instance, field_name)

        if field_type == 'DateTimeField':
            value = value.strftime('%m/%d/%Y-%H:%M:%S') if value else None
        elif field_type == 'GeometryField':
            value = value.wkt if value else None
        elif field_type == 'ForeignKey':
            value = value.id if value else None
        elif field_type == 'ManyToManyField':
            value = list(value.all().values_list('id', flat=True))

        return value
    except:
        # print 'Warning: trying to get an unknown field %s from %s' % (field_name, instance)
        return None


def get_model_attr(instance):
    attr = {'primary': {}, 'meta': {}, 'other': {}}
    # these fields are special
    meta_attr = ['id', 'created_by', 'created_at', 'last_edited_by', 'last_edited_at', 'deleted']
    excludes = ['attributes', 'entity_ptr', 'case', 'group'] + meta_attr
    primary = attr['primary']
    for field_name in instance._meta.get_all_field_names():
        if field_name in excludes: continue
        value = get_field_value(instance, field_name)
        if value:
            primary[field_name] = value

    meta = attr['meta']
    for field in meta_attr:
        value = get_field_value(instance, field)
        if value:
            meta[field] = value

    other = attr['other']

    for a in instance.attributes.all():
        other[a.attr] = a.val

    return attr


class Case(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)
    groups = models.ManyToManyField(Group, null=True, blank=True)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    location = models.GeometryField(null=True, blank=True)
    address  = models.CharField(max_length=200, blank=True)
    pin = models.CharField(max_length=4)

    objects = models.GeoManager()

    def __unicode__(self):
        return self.name

    class Meta: 
        ordering = ['name']


class Attribute(models.Model):
    attr = models.CharField(max_length=255)
    val  = models.CharField(max_length=255)

    class Meta:
        unique_together = (("attr", "val"),)

    def __unicode__(self):
        return self.attr + ' : ' + self.val


class Dataset(models.Model):
    name = models.CharField(max_length=500)
    case = models.ForeignKey(Case)
    created_by = models.ForeignKey(User, null=True, blank=True, verbose_name='created by')
    created_at  = models.DateTimeField(auto_now_add=True, verbose_name='created at')

    def serialize(self):
        attr = {}
        attr['id'] = self.id
        attr['name'] = self.name
        attr['created_by'] = self.created_by.username if self.created_by != None else None
        attr['created_at'] = self.created_at.strftime('%m/%d/%Y') if self.created_at else None
        attr['dataentries'] = list(self.dataentry_set.all().values_list('id', flat=True))
        return attr

    def __unicode__(self):
        return self.case.name + ': ' + self.name
    class Meta: 
        ordering = ['name']


class DataEntry(models.Model):
    name = models.CharField(max_length=100, null=True, blank=True)
    content = HTMLField()
    date  = models.DateTimeField(null=True, blank=True)
    dataset = models.ForeignKey(Dataset, null=True, blank=True)

    def serialize(self):
        attr = {}
        attr['id'] = self.id
        attr['content'] = self.content
        attr['dataset'] = self.dataset.id
        attr['name'] = self.name
        attr['date']    = ''
        attr['annotations'] = list(self.annotation_set.all().values_list('id', flat=True))
        if self.date != None:
            attr['date']  = self.date.strftime('%m/%d/%Y-%H:%M:%S')
        return attr


    def __unicode__(self):
        return self.dataset.case.name + ': ' + self.dataset.name + ': '+ self.name

    class Meta:
        ordering = ['dataset', 'name']
        verbose_name_plural = 'Data Entries'


class Entity(models.Model):
    name          = models.CharField(max_length=1000)
    priority      = models.CharField(max_length=10, null=True, blank=True)  # Low, High, Medium
    entity_type    = models.CharField(max_length=50, blank=True)
    note          = models.TextField(blank=True, null=True)
    attributes    = models.ManyToManyField(Attribute, blank=True, null=True)
    created_by     = models.ForeignKey(User, null=True, blank=True, verbose_name='created by', related_name='created_entities')
    created_at     = models.DateTimeField(auto_now_add=True, verbose_name='created at')
    last_edited_by = models.ForeignKey(User, null=True, blank=True, related_name='edited_entities')
    last_edited_at = models.DateTimeField(auto_now=True)
    group         = models.ForeignKey(Group)
    case          = models.ForeignKey(Case)
    deleted       = models.NullBooleanField(default=False, null=True, blank=True)

    objects = InheritanceManager()

    def __unicode__(self):
        return self.entity_type + ' ' + self.name

    class Meta:
        verbose_name_plural = 'Entities'

    def findTargets(self):
        res = []
        targets_id = list(Relationship.objects.filter(source=self).values_list("target", flat=True))
        for tar in targets_id:
            res.append(tar)
        return Entity.objects.filter(id__in=res).select_subclasses()

    def findSources(self):
        res = []
        sources_id = list(Relationship.objects.filter(target=self).values_list("source", flat=True))
        for sou in sources_id:
            res.append(sou)
        return Entity.objects.filter(id__in=res).select_subclasses()

    def serialize(self):
        res = get_model_attr(self)
        res['meta']['relationships'] = list(self.relates_as_target.all().values_list('id', flat=True)) + list(self.relates_as_source.all().values_list('id', flat=True))
        res['meta']['annotations'] = list(self.annotation_set.all().values_list('id', flat=True))
        return res


class Location(Entity):
    geometry = models.GeometryField(null=True, blank=True)
    address = models.CharField(max_length=500, blank=True)
    precision = models.FloatField(null=True, blank=True, help_text='in meter')

    objects = models.GeoManager()

    def _get_geom_type(self):
        return self.location.geom_type

    def save(self, *args, **kwargs):
        """auto fill entity_type"""
        self.entity_type = 'location'
        super(Location, self).save(*args, **kwargs)


class Person(Entity):
    gender       = models.CharField(max_length=10, null=True, blank=True)
    nationality  = models.CharField(max_length=50, null=True, blank=True)
    alias        = models.ForeignKey('self', null=True, blank=True)  # TODO: the person could be an alias to another person
    job          = models.CharField(max_length=50, null=True, blank=True)
    age          = models.CharField(max_length=50, null=True, blank=True)

    def save(self, *args, **kwargs):
        """auto fill entity_type"""
        self.entity_type = 'person'
        super(Person, self).save(*args, **kwargs)



class Organization(Entity):
    person      = models.ManyToManyField(Person, null=True, blank=True)
    category    = models.CharField(max_length=100, null=True, blank=True, verbose_name='type')

    def save(self, *args, **kwargs):
        """auto fill entity_type"""
        self.entity_type = 'organization'
        super(Organization, self).save(*args, **kwargs)



class Event(Entity):
    person       = models.ManyToManyField(Person, null=True, blank=True)
    organization = models.ManyToManyField(Organization, null=True, blank=True)
    location     = models.ForeignKey(Location, null=True, blank=True)
    category     = models.CharField(max_length=100, null=True, blank=True, verbose_name='type')
    start_date   = models.DateTimeField(null=True, blank=True)
    end_date     = models.DateTimeField(null=True, blank=True)
    repeated       = models.NullBooleanField(default=False, null=True, blank=True)  # 1 -7, stands for Mon - Sun
    repeated_until = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        # auto fill entity_type
        self.entity_type = 'event'
        # if repeated is not set, clear repeated_until as well
        if not self.repeated:
            self.repeated_until = None
        super(Event, self).save(*args, **kwargs)


class Resource(Entity):
    condition    = models.CharField(max_length=100, null=True, blank=True)
    availability = models.CharField(max_length=50, null=True, blank=True)
    category    = models.CharField(max_length=50, null=True, blank=True, verbose_name='type')

    objects = InheritanceManager()

    def save(self, *args, **kwargs):
        """auto fill entity_type"""
        self.entity_type = 'resource'
        super(Resource, self).save(*args, **kwargs)



class Relationship(models.Model):
    source = models.ForeignKey(Entity, null=True, blank=True, related_name="relates_as_source") # trick here: if source is null, it is a "special" relationship, indicating that a dataentry 'contains' an entity
    target = models.ForeignKey(Entity, related_name="relates_as_target")
    note   = models.TextField(null=True, blank=True)
    relation  = models.CharField(max_length=500, blank=True)
    confidence  = models.FloatField(null=True, blank=True)
    priority    = models.CharField(max_length=10, null=True, blank=True)  # L, M, H
    dataentry  = models.ForeignKey(DataEntry, null=True, blank=True)
    attributes = models.ManyToManyField(Attribute, null=True, blank=True)
    created_at   = models.DateTimeField(default=datetime.now, verbose_name='created at')
    created_by  = models.ForeignKey(User, null=True, blank=True, verbose_name='created by', related_name='created_relationships')
    last_edited_by  = models.ForeignKey(User, null=True, blank=True, verbose_name='edited by', related_name='edited_relationships')
    last_edited_at  = models.DateTimeField(auto_now=True)
    group      = models.ForeignKey(Group)
    case        = models.ForeignKey(Case)
    deleted       = models.NullBooleanField(default=False, null=True, blank=True)

    def __unicode__(self):
        return 'relation: ' + self.relation + ' of ' + self.source.name + '->' + self.target.name

    def serialize(self):
        res = get_model_attr(self)
        res['meta']['annotations'] = list(self.annotation_set.all().values_list('id', flat=True))
        return res


class View(models.Model):
    def upload_path_handler(self, filename):
        return 'views/{case}/{group}/{file}'.format(case=self.case.id, group=self.group.id, file=filename)

    image = models.TextField() # svg html
    state = models.TextField() # json format
    comment = models.TextField()
    path  = IntegerArrayField(blank=True, null=True, editable=False)
    depth = models.PositiveSmallIntegerField(default=0)
    created_by = models.ForeignKey(User)
    created_at = models.DateTimeField(auto_now_add=True)
    group      = models.ForeignKey(Group)
    case       = models.ForeignKey(Case)

    def __unicode__(self):
        return self.created_by.username + ' ' + self.created_at.strftime('%m/%d/%Y %H:%M:%S')

    class Meta: 
        ordering = ['path']

    def serialize(self):
        return {
            'id'   : self.id,
            'image': self.image,
            'state': self.state,
            'comment': self.comment,
            'path': self.path,
            'depth': self.depth,
            'created_by': self.created_by.id,
            'created_at': self.created_at.strftime('%m/%d/%Y %H:%M:%S'),
            'group': self.group.id,
            'case': self.case.id
        }


