from django.db import models
from django.contrib.auth.models import Group, User

from workspace.models import Role

# Create your models here.

User.add_to_class('role', models.ForeignKey(Role, null=True, blank=True))
Group.add_to_class('pin', models.CharField(max_length=4))
