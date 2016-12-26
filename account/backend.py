from django.contrib.auth.models import User

from .psuAuth import psuAuth

class AuthBackend(object):
    def authenticate(self, username=None, password=None):
        if username and password:
            res = psuAuth(username, password)

            if 'error' in res:
                return None
            # if passed psu auth, create a record in local database if it does not
            # exist
            if not User.objects.filter(username=res['uid'][0]).exists():
                User.objects.create_user(
                    username=res['uid'][0],
                    first_name=res['givenName'][0].title(),
                    last_name=res['sn'][0].title(),
                    email=res['mail'][0],
                )
            user = User.objects.get(username=res['uid'][0])

            return user

        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
