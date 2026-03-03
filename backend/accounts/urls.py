from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Register ViewSets here as you build them, e.g.:
# from .views import UserViewSet
# router.register(r'users', UserViewSet)

router = DefaultRouter()

urlpatterns = [
    path('', include(router.urls)),
]