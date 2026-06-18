from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminOrReadOnly(BasePermission):
	message = 'Only admins can modify this resource.'

	def has_permission(self, request, view):
		if request.method in SAFE_METHODS:
			return True
		return (
			request.user
			and request.user.is_authenticated
			and (request.user.is_staff or request.user.role == request.user.ROLE_ADMIN)
		)


class IsProviderOrAdmin(BasePermission):
	message = 'Only providers or admins can access this resource.'

	def has_permission(self, request, view):
		return (
			request.user
			and request.user.is_authenticated
			and (
				request.user.is_staff
				or request.user.role in (request.user.ROLE_PROVIDER, request.user.ROLE_ADMIN)
			)
		)


class CanManageService(BasePermission):
	message = 'You can only manage services linked to your provider profile.'

	def has_object_permission(self, request, view, obj):
		if request.method in SAFE_METHODS:
			return True
		if request.user.is_staff or request.user.role == request.user.ROLE_ADMIN:
			return True
		if request.user.role != request.user.ROLE_PROVIDER:
			return False
		return obj.providers.filter(user=request.user).exists()


class IsPricingOwnerOrAdmin(BasePermission):
	message = 'You can only manage your own pricing records.'

	def has_object_permission(self, request, view, obj):
		if request.user.is_staff or request.user.role == request.user.ROLE_ADMIN:
			return True
		return getattr(obj.provider, 'user_id', None) == request.user.id


class IsProviderSkillOwnerOrAdmin(BasePermission):
	message = 'You can only manage your own provider skill records.'

	def has_object_permission(self, request, view, obj):
		if request.user.is_staff or request.user.role == request.user.ROLE_ADMIN:
			return True
		return getattr(obj.provider, 'user_id', None) == request.user.id
