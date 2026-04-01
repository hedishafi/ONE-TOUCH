# OneTouch Django Backend — Complete Beginner-to-Professional Guide

---

## Table of Contents

1. [Current System Overview](#1-current-system-overview)
2. [What Each Container Does](#2-what-each-container-does)
3. [Commands Explanation](#3-commands-explanation)
4. [How Django Connects to PostgreSQL Inside Docker](#4-how-django-connects-to-postgresql-inside-docker)
5. [How Swagger / OpenAPI Works](#5-how-swagger--openapi-works)
6. [Why Swagger Shows "No Operations Defined"](#6-why-swagger-shows-no-operations-defined)
7. [How to Fix Swagger — Add Real API Endpoints](#7-how-to-fix-swagger--add-real-api-endpoints)
8. [How to Properly Structure Django Apps](#8-how-to-properly-structure-django-apps)
9. [How to Connect urls.py Between Apps and Core Project](#9-how-to-connect-urlspy-between-apps-and-core-project)
10. [Step-by-Step Next Development Plan](#10-step-by-step-next-development-plan)
11. [Testing Strategy](#11-testing-strategy)
12. [Deployment Readiness Checklist](#12-deployment-readiness-checklist)

---

## 1. Current System Overview

Your backend is a **Django REST API** that runs inside **Docker containers**.

Here is what has already been completed and is working:

| What | Status |
|------|--------|
| Django project (`core/`) | ✅ Done |
| Custom User model (`accounts/`) | ✅ Done |
| 5 Django apps created | ✅ Done |
| PostgreSQL database | ✅ Running |
| Redis (for Celery tasks) | ✅ Running |
| Celery worker | ✅ Running |
| Gunicorn WSGI server | ✅ Running |
| JWT Authentication config | ✅ Done |
| Swagger API docs | ✅ Running (empty — no views yet) |
| Docker networking | ✅ Done |
| Migrations applied | ✅ Done |

**What is NOT done yet (your next work):**
- Models for `services`, `orders`, `payments`, `notifications`
- Serializers for all apps
- Views (API endpoints) for all apps
- URL routing for all endpoints
- Tests
Client (AI/chat) → ORDER(status: pending)
  → Provider sees order on dashboard → accepts it
      → ORDER.status = accepted
          → Provider pays commission via TeleBirr
              → COMMISSION_PAYMENT.status = success
                  → ORDER.client_phone_visible = True   ← contact unlocked
                  → ORDER.status = commission_paid
                      → Provider calls client directly
                          → Work done → ORDER.status = completed
                              → REVIEW + REWARD_TRANSACTION created
                              → NOTIFICATIONs sent to both parties

## 2. What Each Container Does

When you run `docker compose up -d`, Docker starts **4 containers**. Think of each one as a separate mini-computer doing a specific job.

```
┌─────────────────────────────────────────────────────────────┐
│                        Your Mac                             │
│                                                             │
│   Browser → http://localhost:8000 ──────────────────────┐  │
│                                                          ▼  │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────┐  │  │
│  │   backend-   │   │  backend-    │   │  backend-   │  │  │
│  │    web-1     │   │    db-1      │   │   redis-1   │  │  │
│  │  (Django +   │◄──┤  (Postgres)  │   │  (Redis)    │  │  │
│  │  Gunicorn)   │   │  Port: 5432  │   │  Port: 6379 │  │  │
│  │  Port: 8000  │   └──────────────┘   └──────┬──────┘  │  │
│  └──────┬───────┘                             │         │  │
│         │                           ┌─────────▼──────┐  │  │
│         │                           │  backend-      │  │  │
│         └──────────────────────────►│  celery-1      │  │  │
│                                     │  (background   │  │  │
│                                     │   tasks)       │  │  │
│                                     └────────────────┘  │  │
└─────────────────────────────────────────────────────────────┘
```

### `backend-web-1` — Django + Gunicorn
- This is your **main server**.
- It runs your Django code.
- **Gunicorn** is a production-grade Python web server (like a waiter taking requests).
- It listens on port `8000` so your browser can reach it.
- On startup it: waits for DB → runs migrations → collects static files → starts Gunicorn.

### `backend-db-1` — PostgreSQL
- This is your **database**.
- Stores all your data: users, orders, services, payments.
- Django connects to it using credentials from your `.env` file.
- Data is persisted in a Docker volume (`postgres_data`) so it survives restarts.

### `backend-redis-1` — Redis
- This is a **fast in-memory store**.
- Used as a **message broker** — Celery sends tasks here.
- Think of it like a post office: Django drops a task in, Celery picks it up.

### `backend-celery-1` — Celery Worker
- This runs **background tasks** (things that shouldn't block the web response).
- Examples: sending emails, processing payments, sending notifications.
- It watches Redis for new tasks and runs them.

---

## 3. Commands Explanation

### Starting and Stopping

```bash
# Start all 4 containers in the background (-d means detached/background)
docker compose up -d

# Expected output:
# ✔ Container backend-redis-1   Running
# ✔ Container backend-db-1      Healthy
# ✔ Container backend-celery-1  Started
# ✔ Container backend-web-1     Started
```

```bash
# Stop all containers (data is KEPT in the database volume)
docker compose down

# Stop all containers AND delete the database (full reset)
docker compose down -v
```

```bash
# Restart only one container (useful after code changes)
docker compose restart web
```

---

### Checking Status

```bash
# See all running containers and their ports
docker compose ps

# Expected output — web must show 0.0.0.0:8000->8000/tcp:
# NAME               STATUS          PORTS
# backend-web-1      Up 2 minutes    0.0.0.0:8000->8000/tcp
# backend-db-1       Up 2 minutes    0.0.0.0:5432->5432/tcp
# backend-redis-1    Up 2 minutes    0.0.0.0:6379->6379/tcp
# backend-celery-1   Up 2 minutes    8000/tcp
```

```bash
# See live logs from Django (Ctrl+C to stop watching)
docker compose logs -f web

# See last 50 lines of logs
docker compose logs --tail=50 web
```

---

### Django Management Commands

All Django commands run **inside** the web container using `docker compose exec`:

```bash
# General format:
docker compose exec web python manage.py <command>
```

```bash
# 1. Create migration files after editing models.py
docker compose exec web python manage.py makemigrations

# 2. Apply migrations to the database
docker compose exec web python manage.py migrate

# 3. Open interactive Django shell (like Python REPL with Django loaded)
docker compose exec web python manage.py shell

# 4. Create a superuser manually
docker compose exec web python manage.py createsuperuser

# 5. Run all tests
docker compose exec web python manage.py test

# 6. Run Django system checks (like a health check)
docker compose exec web python manage.py check
```

> **Common mistake:** Running `python manage.py` directly on your Mac.
> That will fail because Python on your Mac doesn't have the project dependencies.
> **Always use:** `docker compose exec web python manage.py ...`

---

### Rebuilding After Dependency Changes

If you change `requirements.txt` or `Dockerfile`, you must rebuild:

```bash
# Rebuild the web image
docker compose build

# Then restart with the new image
docker compose up -d
```

> **Rule:** Code changes → just restart (`docker compose restart web`).
> Dependency changes → rebuild (`docker compose build`) then restart.

---

## 4. How Django Connects to PostgreSQL Inside Docker

Inside Docker, containers talk to each other using **service names** as hostnames.

Your `.env` file has:
```
DB_HOST=db        ← "db" is the name of the postgres service in docker-compose.yml
DB_PORT=5432
DB_NAME=onetouch
DB_USER=onetouch
DB_PASSWORD=onetouch
```

Your `settings.py` reads these and builds the database config:
```python
DATABASES = {
    'default': {
        'ENGINE':   'django.db.backends.postgresql',
        'NAME':     'onetouch',
        'USER':     'onetouch',
        'PASSWORD': 'onetouch',
        'HOST':     'db',       ← Docker resolves "db" to the postgres container's IP
        'PORT':     '5432',
    }
}
```

**Flow:**
```
Django (web container) → "db:5432" → PostgreSQL (db container)
```

Docker's internal network automatically resolves `db` to the Postgres container.
You never need to use an IP address.

---

## 5. How Swagger / OpenAPI Works

**Swagger** is an auto-generated interactive API documentation page.

- URL: http://localhost:8000/api/docs/
- It reads all your Django REST Framework views and generates a visual interface.
- You can click endpoints and test them directly from the browser.

The package that generates it is **drf-spectacular**:
```python
# installed in requirements.txt
drf-spectacular>=0.27,<1.0

# configured in settings.py
SPECTACULAR_SETTINGS = {
    'TITLE':   'OneTouch API',
    'VERSION': 'v1',
}

# exposed in core/urls.py
path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
path('api/docs/',   SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
```

---

## 6. Why Swagger Shows "No Operations Defined"

Because **you have no API views yet**.

Swagger documents views. Your apps currently have empty `views.py` files.

```
accounts/views.py    ← empty
services/views.py    ← empty
orders/views.py      ← empty
payments/views.py    ← empty
notifications/views.py ← empty
```

The moment you add a ViewSet or APIView, Swagger will automatically show it.

---

## 7. How to Fix Swagger — Add Real API Endpoints

Here is the pattern for every app. You build 3 files: `models.py` → `serializers.py` → `views.py`.

### Step 1 — Define a Model (models.py)

```python
# services/models.py
from django.db import models
from accounts.models import User

class ServiceCategory(models.Model):
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return self.name


class Service(models.Model):
    STATUS_ACTIVE   = 'active'
    STATUS_INACTIVE = 'inactive'
    STATUS_CHOICES  = [(STATUS_ACTIVE, 'Active'), (STATUS_INACTIVE, 'Inactive')]

    provider    = models.ForeignKey(User, on_delete=models.CASCADE, related_name='services')
    category    = models.ForeignKey(ServiceCategory, on_delete=models.SET_NULL, null=True)
    title       = models.CharField(max_length=200)
    description = models.TextField()
    price       = models.DecimalField(max_digits=10, decimal_places=2)
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
```

### Step 2 — Create a Serializer (serializers.py)

```python
# services/serializers.py
from rest_framework import serializers
from .models import Service, ServiceCategory

class ServiceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = ServiceCategory
        fields = '__all__'

class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Service
        fields = '__all__'
        read_only_fields = ['provider', 'created_at']
```

### Step 3 — Create a View (views.py)

```python
# services/views.py
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from .models import Service, ServiceCategory
from .serializers import ServiceSerializer, ServiceCategorySerializer

class ServiceCategoryViewSet(ModelViewSet):
    queryset         = ServiceCategory.objects.all()
    serializer_class = ServiceCategorySerializer
    permission_classes = [IsAuthenticated]

class ServiceViewSet(ModelViewSet):
    serializer_class   = ServiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Service.objects.filter(status='active')

    def perform_create(self, serializer):
        serializer.save(provider=self.request.user)
```

### Step 4 — Register URLs (urls.py)

```python
# services/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ServiceViewSet, ServiceCategoryViewSet

router = DefaultRouter()
router.register(r'categories', ServiceCategoryViewSet, basename='category')
router.register(r'services',   ServiceViewSet,         basename='service')

urlpatterns = [
    path('', include(router.urls)),
]
```

### Step 5 — Create Migrations

```bash
docker compose exec web python manage.py makemigrations services
docker compose exec web python manage.py migrate
```

After this, Swagger at http://localhost:8000/api/docs/ will show your endpoints.

---

## 8. How to Properly Structure Django Apps

Every app follows this exact pattern:

```
services/
├── __init__.py       ← tells Python this is a package (never touch)
├── apps.py           ← registers the app with Django, auto-loads signals
├── models.py         ← database tables (WRITE THIS FIRST)
├── serializers.py    ← converts models to/from JSON
├── views.py          ← handles HTTP requests (GET, POST, PUT, DELETE)
├── urls.py           ← maps URL paths to views
├── admin.py          ← registers models in Django admin panel
├── permissions.py    ← who can access what (custom rules)
├── filters.py        ← search/filter query parameters
├── tasks.py          ← background jobs (Celery)
├── signals.py        ← auto-actions on model events (e.g. post_save)
├── tests.py          ← unit and integration tests
└── migrations/       ← auto-generated database schema files
    └── __init__.py
```

**Development order for each app:**
```
models.py → makemigrations → migrate → serializers.py → views.py → urls.py → tests.py
```

---

## 9. How to Connect urls.py Between Apps and Core Project

Django URL routing works like a tree:

```
Browser request: GET /api/v1/services/
         │
         ▼
core/urls.py          ← root urls (entry point)
    │
    └── path('api/v1/', include('services.urls'))
              │
              ▼
         services/urls.py   ← app-level urls
              │
              └── router.register('services', ServiceViewSet)
                        │
                        ▼
                   services/views.py → ServiceViewSet.list()
```

### core/urls.py (already configured)

```python
# core/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('', RedirectView.as_view(url='/api/docs/', permanent=False)),
    path('admin/', admin.site.urls),

    path('api/v1/', include('accounts.urls')),
    path('api/v1/', include('services.urls')),
    path('api/v1/', include('orders.urls')),
    path('api/v1/', include('payments.urls')),
    path('api/v1/', include('notifications.urls')),

    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/',   SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

### Resulting URL map

| URL | View |
|-----|------|
| `/api/v1/services/` | List all services |
| `/api/v1/services/<id>/` | Get/update/delete one service |
| `/api/v1/categories/` | List categories |
| `/api/v1/orders/` | List orders |
| `/api/v1/payments/` | List payments |
| `/admin/` | Django admin |
| `/api/docs/` | Swagger UI |

> **Common mistake:** Defining the same prefix twice in `core/urls.py`.
> `path('api/v1/', include('services.urls'))` — let the app's own `urls.py` define the rest.

---

## 10. Step-by-Step Next Development Plan

Follow this sequence exactly. Do not skip steps.

### Phase 1 — Accounts & Auth (Week 1)
```
1. Review accounts/models.py (already has User, ProviderProfile, ClientProfile)
2. Write accounts/serializers.py:
   - RegisterSerializer
   - LoginSerializer
   - UserProfileSerializer
3. Write accounts/views.py:
   - RegisterView
   - LoginView (returns JWT tokens)
   - ProfileView
4. Write accounts/urls.py and register routes
5. Test with Postman:
   - POST /api/v1/auth/register/
   - POST /api/v1/auth/login/
   - GET  /api/v1/auth/profile/
6. Write accounts/tests.py
```

### Phase 2 — Services (Week 2)
```
1. Write services/models.py (ServiceCategory, Service)
2. makemigrations + migrate
3. Register in services/admin.py
4. Write services/serializers.py
5. Write services/views.py (ViewSets)
6. Write services/urls.py
7. Test in Swagger
```

### Phase 3 — Orders (Week 3)
```
1. Write orders/models.py (Order, OrderStatus)
2. makemigrations + migrate
3. Write serializers, views, urls
4. Add order status signals in orders/signals.py
5. Test full flow: login → browse services → place order
```

### Phase 4 — Payments (Week 3-4)
```
1. Write payments/models.py (Payment, Transaction)
2. Integrate Chapa API (Ethiopian payment gateway)
3. Write payments/views.py:
   - InitiatePaymentView
   - ChapaWebhookView (for payment confirmation callback)
4. Write payments/tasks.py (verify payment async via Celery)
```

### Phase 5 — Notifications (Week 4)
```
1. Write notifications/models.py (Notification)
2. Write notifications/signals.py (trigger on order/payment events)
3. Write notifications/views.py (list, mark as read)
4. Connect to Celery for async sending
```

### Phase 6 — Polish & Security (Week 5)
```
1. Add custom permissions.py to each app
2. Add filters.py (search, filter by status, date)
3. Add core/exceptions.py global error handler
4. Add core/pagination.py custom paginator
5. Throttling (rate limiting) in settings.py
6. Write complete test coverage
```

---

## 11. Testing Strategy

### Test via Swagger (Browser)

1. Go to http://localhost:8000/api/docs/
2. Click "Authorize" → enter your JWT token
3. Click any endpoint → "Try it out" → "Execute"
4. Read the response

### Test via curl (Terminal)

```bash
# Register a new user
curl -X POST http://localhost:8000/api/v1/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"pass1234","email":"test@test.com"}'

# Login and get JWT token
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"pass1234"}'

# Use the token to access protected endpoints
curl -X GET http://localhost:8000/api/v1/services/ \
  -H "Authorization: Bearer <paste_your_token_here>"
```

### Test via Django shell

```bash
# Open Django shell inside container
docker compose exec web python manage.py shell
```
```python
# Inside the shell — query your database directly
from accounts.models import User
User.objects.all()
User.objects.count()

from services.models import Service
Service.objects.filter(status='active')
```

### Automated Tests (tests.py)

```python
# services/tests.py
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()

class ServiceTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='provider',
            password='pass1234',
            role='provider'
        )
        self.client.force_authenticate(user=self.user)

    def test_list_services(self):
        response = self.client.get('/api/v1/services/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
```

```bash
# Run all tests
docker compose exec web python manage.py test

# Run tests for one app only
docker compose exec web python manage.py test services
```

---

## 12. Deployment Readiness Checklist

When you are ready to go live (not now — finish building first):

### Security
- [ ] Set `DEBUG=False` in `.env`
- [ ] Set a strong random `SECRET_KEY` (not the default)
- [ ] Set `ALLOWED_HOSTS` to your real domain only
- [ ] Use environment variables for all secrets (never hardcode)
- [ ] Enable HTTPS (SSL certificate via Let's Encrypt)

### Database
- [ ] Use a strong DB password
- [ ] Enable regular automated backups
- [ ] Never use default postgres credentials in production

### Static Files
- [ ] Switch `STATICFILES_STORAGE` back to WhiteNoise compressed storage
- [ ] Run `collectstatic` during CI/CD build (not on container start)

### Docker
- [ ] Remove `--reload` from Gunicorn in docker-compose (development only)
- [ ] Increase Gunicorn `--workers` to `(2 × CPU cores) + 1`
- [ ] Add resource limits to containers

### Performance
- [ ] Add a Nginx container in front of Gunicorn
- [ ] Add database connection pooling (pgbouncer or django-db-geventpool)
- [ ] Configure Celery with proper concurrency settings

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Set up uptime monitoring
- [ ] Set up log aggregation

---

## Quick Reference Card

```bash
# Daily workflow
docker compose up -d                                    # start
docker compose logs -f web                              # watch logs
docker compose exec web python manage.py shell          # Django shell
docker compose exec web python manage.py makemigrations # after model changes
docker compose exec web python manage.py migrate        # apply migrations
docker compose down                                     # stop

# URLs
http://localhost:8000/          → redirects to API docs
http://localhost:8000/admin/    → Django admin (admin / admin1234)
http://localhost:8000/api/docs/ → Swagger UI
http://localhost:8000/api/v1/   → REST API root
```

---

*Generated for OneTouch backend — March 2026*
