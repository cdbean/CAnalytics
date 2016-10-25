from django.test import TestCase
from django.test import Client
from django.core.urlresolvers import reverse


from django.contrib.auth.models import User, Group
from .models import Case
from .views import random_assign_roles

# Create your tests here.
class CaseTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testUser', password='testPassword')
        self.group = Group.objects.create(name='testGroup', pin='0000')
        self.case = Case.objects.create(name='testCase', roles=['web', 'resource', 'record'], pin='0000')
        self.client = Client()
        self.client.login(username='testUser', password='testPassword')

    def testJoinCase(self):
        res = self.client.post(reverse('ws:join_case'), {
            'case': 1,
            'case_pin': '0000',
            'group': 1,
            'group_pin': '0000'
        })
        self.assertIn(self.user.role, self.case.roles)

    def testRandomAssignRole(self):
        random_assign_roles(self.case, self.group, self.user)
        self.assertIn(self.user.role, self.case.roles)
