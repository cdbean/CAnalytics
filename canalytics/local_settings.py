DEBUG = True
TEMPLATE_DEBUG = True
ALLOWED_HOSTS = []


DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis', # Add 'postgresql_psycopg2', 'mysql', 'sqlite3' or 'oracle'.
        'NAME': 'canalytics_v3',                    # Or path to database file if using sqlite3.
        # The following settings are not used with sqlite3:
        'USER': 'postgres',
        'PASSWORD': 'asdf1234',
        'HOST': 'localhost',                      # Empty for localhost through domain sockets or '127.0.0.1' for localhost through TCP.
        'PORT': '',                      # Set to empty string for default.
    }
}

COMPRESS_ENABLED = False

# URL and port of notepad, needs to match etherpad settings
NOTEPAD_URL = 'http://localhost:9001'
# URL and port of ishout, set it to whatever port that has not been used
ISHOUT_CLIENT_ADDR = 'localhost:5500'

LOGFILE = os.path.join(BASE_DIR, 'activity.log')

CHANNEL_LAYERS = {
  "default": {
      "BACKEND": "asgi_redis.RedisChannelLayer",
      "CONFIG": {
          "hosts": [("localhost", 6379)],
      },
      "ROUTING": "djangoChannels.routing.channel_routing",
  },
}
