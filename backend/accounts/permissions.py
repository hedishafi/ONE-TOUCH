from rest_framework.permissions import BasePermission


class IsProvider(BasePermission):
    """Allow access only to users with provider role capability (has_provider_role=True)."""

    message = 'Only service providers can perform this action.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.has_provider_role
        )


class IsClient(BasePermission):
    """Allow access only to users with client role capability (has_client_role=True)."""

    message = 'Only clients can perform this action.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.has_client_role
        )


class IsAdmin(BasePermission):
    """Allow access only to users with role='admin' or is_staff=True."""

    message = 'Only admins can perform this action.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and (
                request.user.role == request.user.ROLE_ADMIN
                or request.user.is_staff
            )
        )


class IsProviderOrAdmin(BasePermission):
    """Allow access to providers or admins."""

    message = 'Only service providers or admins can perform this action.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and (
                request.user.has_provider_role
                or request.user.role == request.user.ROLE_ADMIN
                or request.user.is_staff
            )
        )


class IsOwnerOrAdmin(BasePermission):
    """Object-level: allow if the requesting user owns the object, or is admin."""

    message = 'You do not have permission to access this object.'

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff or request.user.role == request.user.ROLE_ADMIN:
            return True
        # obj is expected to have a `user` attribute
        return getattr(obj, 'user', None) == request.user
