from django.contrib import admin

from orders.models import Order, OrderAssignment, OrderMatch, OrderStatusLog


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
	list_display = ('status', 'client', 'category', 'sub_service', 'created_at')
	list_filter = ('status', 'input_type')
	search_fields = ('client__username', 'description')


@admin.register(OrderMatch)
class OrderMatchAdmin(admin.ModelAdmin):
	list_display = ('order', 'provider', 'status', 'notified_at')
	list_filter = ('status',)


@admin.register(OrderAssignment)
class OrderAssignmentAdmin(admin.ModelAdmin):
	list_display = ('order', 'provider', 'commission_fee', 'commission_paid', 'client_contact_released')


@admin.register(OrderStatusLog)
class OrderStatusLogAdmin(admin.ModelAdmin):
	list_display = ('order', 'old_status', 'new_status', 'changed_by', 'created_at')
