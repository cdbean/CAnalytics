from channels import Group
from channels.sessions import channel_session, enforce_ordering

@enforce_ordering
@channel_session
def ws_add(message):
    room = message.content['path'].strip('/')
    message.channel_session['room'] = room
    Group('chat-' + room).add(message.reply_channel)

@enforce_ordering
@channel_session
def ws_message(message):
    Group('chat-' + message.channel_session['room']).send({
        'text': message.content['text'],
    })


@channel_session
def ws_disconnect(message):
    Group('chat-' + message.channel_session['room']).discard(message.reply_channel)
