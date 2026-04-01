from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ProviderCategoryPricingViewSet,
    ProviderSkillViewSet,
    ServiceCategoryViewSet,
    ServiceViewSet,
    SkillViewSet,
)

router = DefaultRouter()
router.register(r'services/categories', ServiceCategoryViewSet, basename='service-category')
router.register(r'services/skills', SkillViewSet, basename='service-skill')
router.register(r'services/provider-skills', ProviderSkillViewSet, basename='provider-skill')
router.register(r'services/provider-pricing', ProviderCategoryPricingViewSet, basename='provider-category-pricing')
router.register(r'services', ServiceViewSet, basename='service')

urlpatterns = [
    path('', include(router.urls)),
]
