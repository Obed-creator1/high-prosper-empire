# Redis Configuration for Development
from django.conf.global_settings import SECRET_KEY

REDIS_HOST = 'localhost'
REDIS_PORT = 6379
REDIS_PASSWORD = 'stock_redis_2024'
REDIS_DB_CHANNELS = 0      # WebSocket
REDIS_DB_CELERY = 1        # Celery tasks
REDIS_DB_CACHE = 2         # Django cache
REDIS_DB_SESSIONS = 3      # Sessions
REDIS_DB_STOCK = 4         # Stock real-time data

# Channel Layers (WebSocket)
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [{
                'address': (REDIS_HOST, REDIS_PORT),
                'password': REDIS_PASSWORD,
                'db': REDIS_DB_CHANNELS
            }],
            "symmetric_encryption_keys": [SECRET_KEY],
            "capacity": 1000,
        },
    },
}

# Celery Configuration
CELERY_BROKER_URL = f'redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB_CELERY}'
CELERY_RESULT_BACKEND = f'redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB_CELERY + 1}'

# Cache Configuration
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': f'redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB_CACHE}',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'PASSWORD': REDIS_PASSWORD,
            'CONNECTION_POOL_KWARGS': {'max_connections': 20}
        },
        'KEY_PREFIX': 'stock_cache'
    }
}

# Session Configuration
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'

# Stock-specific Redis connections
STOCK_REDIS_CONFIG = {
    'host': REDIS_HOST,
    'port': REDIS_PORT,
    'password': REDIS_PASSWORD,
    'db': REDIS_DB_STOCK,
    'decode_responses': True
}