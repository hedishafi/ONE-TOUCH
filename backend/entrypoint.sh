#!/usr/bin/env bash
# Exit immediately if any command fails
set -e

# ─── Wait for Postgres ────────────────────────────────────────────────────────
echo "Waiting for Postgres at ${DB_HOST}:${DB_PORT:-5432}..."
until pg_isready -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USER}" >/dev/null 2>&1; do
  echo "  Postgres not ready — retrying in 1 second..."
  sleep 1
done
echo "Postgres is ready."

# ─── Apply migrations ─────────────────────────────────────────────────────────
echo "Running migrations..."
python manage.py migrate --noinput

# ─── Collect static files ─────────────────────────────────────────────────────
echo "Collecting static files..."
python manage.py collectstatic --noinput

# ─── Auto-create superuser (idempotent) ──────────────────────────────────────
# Only runs if DJANGO_SUPERUSER_USERNAME and DJANGO_SUPERUSER_PASSWORD are set.
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
  echo "Setting up superuser..."
  python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
username = '${DJANGO_SUPERUSER_USERNAME}'
email    = '${DJANGO_SUPERUSER_EMAIL:-admin@onetouch.com}'
password = '${DJANGO_SUPERUSER_PASSWORD}'
if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username, email, password)
    print(f'Superuser created: {username}')
else:
    print(f'Superuser already exists: {username}')
"
fi

# ─── Hand off to the main process (CMD in docker-compose) ────────────────────
# 'exec' replaces the shell process so signals (SIGTERM, etc.) reach Gunicorn.
echo "Starting application server..."
exec "$@"
