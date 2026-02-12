import os
import warnings
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
import logging
from celery.schedules import crontab
import os
import json
from google.oauth2 import service_account
import dj_database_url

logging.getLogger("django.server").setLevel(logging.ERROR)

# Load environment variables from .env (only in development)
load_dotenv()

# Build paths
BASE_DIR = Path(__file__).resolve().parent.parent
FIREBASE_CREDENTIALS_PATH = BASE_DIR / "firebase-service-account.json"
FIREBASE_CREDENTIALS_JSON = os.getenv("FIREBASE_CREDENTIALS_JSON")

firebase_credentials = None  # Default

if FIREBASE_CREDENTIALS_JSON:
    try:
        # Try loading from env var (production)
        credentials_info = json.loads(FIREBASE_CREDENTIALS_JSON)
        firebase_credentials = service_account.Credentials.from_service_account_info(credentials_info)
        print("Firebase credentials loaded from environment variable (production mode)")
    except json.JSONDecodeError:
        # Fallback to file if env var is invalid
        print("WARNING: FIREBASE_CREDENTIALS_JSON is invalid JSON. Falling back to file.")
    except Exception as e:
        raise RuntimeError(f"Failed to load Firebase credentials from env var: {e}") from e

if not firebase_credentials:
    if FIREBASE_CREDENTIALS_PATH.exists():
        try:
            firebase_credentials = service_account.Credentials.from_service_account_file(str(FIREBASE_CREDENTIALS_PATH))
            print(f"Firebase credentials loaded from file: {FIREBASE_CREDENTIALS_PATH}")
        except Exception as e:
            raise RuntimeError(f"Failed to load Firebase credentials from file: {e}") from e
    else:
        raise FileNotFoundError(
            "Firebase credentials not found: either provide a valid FIREBASE_CREDENTIALS_JSON "
            "or ensure firebase-service-account.json exists in the project root."
        )

# SECURITY
SECRET_KEY = os.getenv('SECRET_KEY')
DEBUG = True
ALLOWED_HOSTS = [
    host.strip() for host in os.getenv(
        "ALLOWED_HOSTS",
        "127.0.0.1,localhost,high-prosper-empire.onrender.com"
    ).split(",") if host.strip()
]


# Applications
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django_filters',  # for django-filters
    'crispy_forms',
    'crispy_bootstrap5',
    'django_celery_beat',
    'django_celery_results',
    'django.contrib.humanize',
    'django.contrib.postgres',

    # Third-party
    'rest_framework',
    'rest_framework.authtoken',
    'rest_framework_simplejwt',
    'corsheaders',
    'webpush',
    'auditlog',
    "softdelete",

    # Local apps
    'customers.apps.CustomersConfig',
    'users',
    'upload',
    'chat',
    'payments',
    'notifications',
    'hr',
    'collector.apps.CollectorConfig',
    'simple_history',
    'django.contrib.gis',
    'accounting',
    'fleet',
    'procurement',
    'stock',
    'reports',
    'erp',
    'asset',
    'channels',
    'dashboard',
    'tenants.apps.TenantsConfig',
    'billing',

    ]

HUMANIZE_USE_THOUSANDS_SEPARATOR = True

MTN_WHATSAPP_API_URL = 'https://api.mtn.com/whatsapp/v1/send'  # Replace with actual

AUDITLOG_LOGENTRY_MODEL = 'auditlog.LogEntry'

# Blockchain Settings
WEB3_PROVIDER_URL = "https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY"  # or mainnet
INVOICE_CONTRACT_ADDRESS = "0xYourDeployedContractAddress"


# Middleware
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'high_prosper.middleware.ContentTypeMiddleware',
    'auditlog.middleware.AuditlogMiddleware',
    'tenants.middleware.TenantMiddleware',
    'users.middleware.UpdateLastSeenMiddleware',
]

MIDDLEWARE.insert(0, "corsheaders.middleware.CorsMiddleware")

# URL configuration
ROOT_URLCONF = 'high_prosper.urls'

# Templates
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],  # Optional templates folder
        'APP_DIRS': True,  # Looks inside app templates automatically
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',  # Required by admin
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                "users.context_processors.role_based_sidebar",
                'hr.context_processors.notifications',
            ],
        },
    },
]

# WSGI
WSGI_APPLICATION = 'high_prosper.wsgi.application'

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Production (Render, Railway, etc.)
    DATABASES = {
        'default': dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=int(os.getenv('DATABASE_CONN_MAX_AGE', 600)),
            ssl_require=True
        )
    }
else:
    # Local development
    DATABASES = {
        'default': {
            'ENGINE': 'django.contrib.gis.db.backends.postgis',
            'NAME': os.getenv('DATABASE_NAME', 'high_prosper_db'),
            'USER': os.getenv('DATABASE_USER', 'obed'),
            'PASSWORD': os.getenv('DATABASE_PASSWORD', ''),
            'HOST': os.getenv('DATABASE_HOST', 'localhost'),
            'PORT': os.getenv('DATABASE_PORT', '5432'),
            'OPTIONS': {
                'options': '-c search_path=public -c statement_timeout=30000',
            },
            'CONN_MAX_AGE': int(os.getenv('DATABASE_CONN_MAX_AGE', 600)),
            'CONN_HEALTH_CHECKS': True,
            'AUTOCOMMIT': True,
            'DISABLE_SERVER_SIDE_CURSORS': False,
            'TEST': {
                'NAME': os.getenv('TEST_DATABASE_NAME', 'test_high_prosper_db'),
            },
        }
    }


# Password validators
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

AUTH_USER_MODEL = 'users.CustomUser'

# Cache timeout: 5 minutes for real-time metrics
VILLAGE_METRICS_CACHE_TTL = 300  # seconds

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Kigali'
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'staticfiles')]
STATICFILES_FINDERS = [
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
]

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ✅ REPORTS SPECIFIC SETTINGS
REPORTS = {
    'MAX_FILE_SIZE': 50 * 1024 * 1024,  # 50MB
    'ALLOWED_FORMATS': ['pdf', 'excel', 'csv'],
    'RETENTION_DAYS': 90,
    'MAX_CONCURRENT_GENERATIONS': 5,
}

# WeasyPrint needs this
WEASYPRINT_DPI = 300


# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ────────────────────────────────────────────────
# CORS & CSRF CONFIGURATION
# ────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://high-prosper-empire.onrender.com",  # Render (Frontend or Backend domain)
]

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "https://high-prosper-empire.onrender.com",  # Render domain (HTTPS)
]

CORS_ALLOW_CREDENTIALS = True


CRISPY_ALLOWED_TEMPLATE_PACKS = "bootstrap5"
CRISPY_TEMPLATE_PACK = "bootstrap5"

ASGI_APPLICATION = 'backend.asgi.application'

# Redis configuration
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [('127.0.0.1', 6379)],
            "capacity": 1500,
            "expiry": 20,
        },
    },
}

# External Inventory Systems Configuration
EXTERNAL_INVENTORY_SYSTEMS = [
    'erp', 'wms', 'pos', 'woocommerce', 'shopify', 'magento', 'custom_api'
]

# ERP Configuration (SAP, Oracle, etc.)
ERP_CONFIG = {
    'enabled': True,
    'base_url': 'https://your-erp.company.com/api',
    'access_token': 'your_erp_token',
    'timeout': 15
}

# WMS Configuration
WMS_CONFIG = {
    'enabled': True,
    'base_url': 'https://wms.company.com/api',
    'api_key': 'your_wms_api_key'
}

# POS Configuration
POS_CONFIG = {
    'enabled': True,
    'base_url': 'https://connect.squareup.com',
    'access_token': 'your_square_token'
}

# WooCommerce Configuration
WOOCOMMERCE_CONFIG = {
    'enabled': True,
    'base_url': 'https://yourstore.com',
    'consumer_key': 'ck_your_consumer_key',
    'consumer_secret': 'cs_your_consumer_secret'
}

# Shopify Configuration
SHOPIFY_CONFIG = {
    'enabled': True,
    'base_url': 'https://your-store.myshopify.com',
    'access_token': 'shpat_your_access_token',
    'product_mapping': {
        'SKU001': '123456789',
        'SKU002': '987654321'
    }
}

# Custom API Endpoints
CUSTOM_INVENTORY_APIS = [
    {
        'enabled': True,
        'name': 'Legacy System',
        'endpoint': 'https://legacy.company.com/api/stock/{sku}',
        'headers': {'Authorization': 'Bearer legacy_token'},
        'quantity_path': 'data.inventory.available'
    }
]

# Celery Configuration
CELERY_BROKER_URL = 'redis://localhost:6379/0'  # Redis broker (install Redis: https://redis.io/download)
CELERY_RESULT_BACKEND = 'django-db'
CELERY_ACCEPT_CONTENT = ['application/json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Africa/Maputo'  # Match your TIME_ZONE
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'  # For periodic tasks
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes per task
CELERY_TASK_SOFT_TIME_LIMIT = 20 * 60  # Soft limit

# Worker settings
CELERY_WORKER_MAX_TASKS_PER_CHILD = 1000
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_WORKER_CONCURRENCY = 4

# Task routing
CELERY_TASK_ROUTES = {
    'stock.tasks': {'queue': 'stock'},
    'stock.tasks.process_bulk_import': {'queue': 'high_priority'},
    'stock.tasks.generate_*': {'queue': 'reports'},
    'reports.*': {'queue': 'reports'},
    'hr.*': {'queue': 'hr'},
    'notifications.*': {'queue': 'notifications'},
    'low_priority.*': {'queue': 'low_priority'},
    'users.tasks': {'queue': 'users'},
}

CELERY_BEAT_SCHEDULE = {
    'check-stock-alerts-daily': {
        'task': 'stock.tasks.check_stock_alerts',
        'schedule': crontab(minute=0, hour=2),  # Daily at 2 AM
    },
    'cleanup-expired-cache': {
        'task': 'stock.tasks.cleanup_expired_cache',
        'schedule': crontab(minute=0, hour=4),  # Daily at 4 AM
    },
    'update-stock-analytics': {
        'task': 'stock.tasks.update_stock_analytics',
        'schedule': crontab(minute=0, hour=1),  # Daily at 1 AM
    },
}

# For MTN SMS API (keep existing)
# MTN / MOMO
MTN_API_KEY = os.getenv('MTN_API_KEY')
MTN_CLIENT_ID = os.getenv('MTN_CLIENT_ID')
MTN_CLIENT_SECRET = os.getenv('MTN_CLIENT_SECRET')
MTN_SENDER_ID = os.getenv('MTN_SENDER_ID')

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = "High Prosper Services <obedpianoman@gmail.com>"


# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.BasicAuthentication',

    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',  # Only JSON responses (fixes TemplateDoesNotExist)
        # Uncomment the next line if you want the browsable API
        # 'rest_framework.renderers.BrowsableAPIRenderer',
    ),
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '2000/hour',
        'user': '10000/hour',
    },
}

# MTN MoMo API Credentials
MOMO_API_USER = os.getenv('MOMO_API_USER')
MOMO_API_KEY = os.getenv('MOMO_API_KEY')
MOMO_SUBSCRIPTION_KEY = os.getenv('MOMO_SUBSCRIPTION_KEY')

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_HEADER_TYPES': ('Bearer',),
}


LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{asctime} {levelname} {name} {message}',
            'style': '{',
        },
        'query': {
            'format': '\n\n[SQL QUERY] {asctime} {levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'ERROR',
            'class': 'logging.FileHandler',
            'filename': 'debug.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'query_console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'query',  # Special format for queries
        },
    },
    'loggers': {
        'core': {
            'handlers': ['file'],
            'level': 'ERROR',
            'propagate': True,
        },
        'collector': {
            'handlers': ['file', 'console'],
            'level': 'INFO',           # INFO for production, DEBUG for dev
            'propagate': False,
        },
        # Log all Django framework messages
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        # === SLOW QUERY LOGGING ===
        'django.db.backends': {
            'handlers': ['query_console'],  # Send to console (or add 'file' if you want in log file)
            'level': 'DEBUG',               # Capture all queries
            'propagate': False,
        },
    },
}



APPEND_SLASH = True

VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY")
VAPID_EMAIL = os.getenv("VAPID_EMAIL")

LOGIN_REDIRECT_URL = '/admin/'
LOGOUT_REDIRECT_URL = '/admin/login/'

# ERP Integration
ERP_ENABLED = True
ERP_API_URL = os.getenv('ERP_API_URL', 'https://api.erp-system.com')
ERP_API_KEY = os.getenv('ERP_API_KEY')
ERP_WEBHOOK_URL = os.getenv('ERP_WEBHOOK_URL', 'https://api.erp-system.com/webhooks/inventory')

# WebSocket Configuration
WEBSOCKET_URL = "ws://127.0.0.1:8000/ws/"

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/0',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    },
    'websocket': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

STOCK_THROTTLE_RATES = {
    'STOCK_OPERATION_RATE': '60/minute',
    'BATCH_OPERATION_RATE': '10/minute',
    'WAREHOUSE_TRANSFER_RATE': '20/minute',
    'VALUATION_RATE': '5/minute',
    'BULK_IMPORT_EXPORT_RATE': '3/hour',
    'SEARCH_FILTER_RATE': '120/minute',
    'DASHBOARD_RATE': '60/minute',
    'STOCK_USER_RATE': '200/hour',
    'STOCK_ANON_RATE': '20/hour',
    'MAX_BATCH_SIZE': 1000,
    'MAX_TRANSFER_VALUE': 50000,
    'MAX_IMPORT_FILE_SIZE_MB': 50
}

warnings.filterwarnings(
    "ignore",
    message="pkg_resources is deprecated as an API"
)

# Stripe
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY')
STRIPE_PUBLIC_KEY = os.getenv('STRIPE_PUBLIC_KEY')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')

# Billing plans
BILLING_PLANS = {
    'starter': {
        'name': 'Starter',
        'price_monthly': 9900,  # $99
        'price_yearly': 99000,  # $990
        'features': ['Up to 50 PRs/month', 'Basic AI', 'Email Support'],
    },
    'pro': {
        'name': 'Pro',
        'price_monthly': 29900,
        'price_yearly': 299000,
        'features': ['Unlimited PRs', 'Full ProsperBot AI', 'Blockchain', 'Priority Support'],
    },
    'enterprise': {
        'name': 'Enterprise',
        'price_monthly': None,  # Custom
        'features': ['White-label', 'Dedicated Instance', 'Custom AI Training'],
    },
}

# WhatsApp Business API
WHATSAPP_TOKEN = os.getenv('WHATSAPP_TOKEN')
WHATSAPP_PHONE_NUMBER_ID = os.getenv('WHATSAPP_PHONE_NUMBER_ID')
WHATSAPP_VERIFY_TOKEN = os.getenv('WHATSAPP_VERIFY_TOKEN')

# MoMo Disbursement
MOMO_ENVIRONMENT = os.getenv('MOMO_ENVIRONMENT', 'sandbox')  # 'sandbox' or 'production'
MOMO_DISBURSEMENT_USER = os.getenv('MOMO_DISBURSEMENT_USER')
MOMO_DISBURSEMENT_KEY = os.getenv('MOMO_DISBURSEMENT_KEY')
MOMO_DISBURSEMENT_SUBSCRIPTION_KEY = os.getenv('MOMO_DISBURSEMENT_SUBSCRIPTION_KEY')

# Africa's Talking
AFRICAS_TALKING_USERNAME = os.getenv('AFRICAS_TALKING_USERNAME')
AFRICAS_TALKING_API_KEY = os.getenv('AFRICAS_TALKING_API_KEY')
AFRICAS_TALKING_SENDER_ID = os.getenv('AFRICAS_TALKING_SENDER_ID', 'HighProsper')

# Admin phones for alerts
ADMIN_SMS_PHONES = os.getenv('ADMIN_SMS_PHONES', '+250781293073').split(',')

# settings.py — MTN MoMo Configuration
MTN_MOMO = {
    'SANDBOX': os.getenv('MOMO_SANDBOX', 'True') == 'True',  # Converts string to boolean
    'SUBSCRIPTION_KEY': os.getenv('MOMO_SUBSCRIPTION_KEY'),
    'API_USER_ID': os.getenv('MOMO_API_USER'),
    'API_KEY': os.getenv('MOMO_API_KEY'),
    'CALLBACK_HOST': os.getenv('MOMO_CALLBACK_HOST', 'https://yourdomain.com'),
    'TARGET_ENVIRONMENT': 'sandbox' if os.getenv('MOMO_SANDBOX', 'True') == 'True' else 'production',

    # Endpoints
    'BASE_URL': os.getenv('MOMO_BASE_URL', 'https://sandbox.momodeveloper.mtn.com'),
    'TOKEN_URL': '/collection/token/',
    'REQUEST_TO_PAY_URL': '/collection/v1_0/requesttopay',
    'DISBURSE_URL': '/disbursement/v1_0/transfer',
    'CHECK_STATUS_URL': '/collection/v1_0/requesttopay/',  # + transaction_id
}
