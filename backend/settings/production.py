# Production Redis URLs from environment
import os

from django.conf.global_settings import SECRET_KEY

REDIS_URL = os.environ.get('REDIS_URL', 'redis://:stock_prod_redis_2024!strong@redis:6379/0')
REDIS_RESULTS_URL = os.environ.get('REDIS_RESULTS_URL', 'redis://:stock_prod_redis_2024!strong@redis:6379/1')

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [REDIS_URL],
            "symmetric_encryption_keys": [SECRET_KEY],
        },
    },
}

CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_RESULTS_URL