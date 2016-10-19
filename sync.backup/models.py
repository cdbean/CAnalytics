from django.db import models

from django.contrib.auth.models import User, Group
from workspace.models import Case

# Create your models here.
class Message(models.Model):
    sender = models.ForeignKey(User, related_name="send_from")
    receiver = models.ForeignKey(User, null=True, blank=True, related_name="send_to")
    content = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    case = models.ForeignKey(Case)
    group = models.ForeignKey(Group)

    def serialize(self):
        if self.receiver:
            receiver = self.receiver.id
        else:
            receiver = 0
        return {
            'sender': self.sender.id,
            'receiver': receiver,
            'content': self.content,
            'sent_at': self.sent_at.strftime('%m/%d/%Y-%H:%M:%S')
        }

    def __unicode__(self):
        return self.sent_at.strftime('%m/%d/%Y-%H:%M:%S') + ' ' + self.sender.username + ' sent a message'
