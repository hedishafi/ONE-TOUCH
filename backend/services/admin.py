from django.contrib import admin

from .models import (
	ProviderCategoryPricing,
	ProviderService,
	ProviderSkill,
	Service,
	ServiceCategory,
	Skill,
	SubService,
)

admin.site.register(ServiceCategory)
admin.site.register(Service)
admin.site.register(Skill)
admin.site.register(ProviderSkill)
admin.site.register(ProviderCategoryPricing)
admin.site.register(SubService)
admin.site.register(ProviderService)