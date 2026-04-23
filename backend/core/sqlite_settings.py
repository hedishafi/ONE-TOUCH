from .settings import *  # noqa: F403,F401

# Force SQLite for local test runs to avoid PostgreSQL CREATEDB permission issues.
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',  # noqa: F405
        'TEST': {
            'NAME': BASE_DIR / 'test_db.sqlite3',  # noqa: F405
        },
    }
}
from .settings import *
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
