import logging
import math
from datetime import timedelta

from django.utils import timezone

from accounts.models import ProviderProfile
from orders.models import OrderMatch
from services.models import ProviderService

logger = logging.getLogger(__name__)


def haversine_distance(lat1, lon1, lat2, lon2):
    radius = 6371.0
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)

    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius * c


def find_matching_providers(order):
    total_providers = ProviderProfile.objects.count()
    online_available_count = ProviderProfile.objects.filter(
        is_online=True,
        is_available=True,
    ).count()
    with_coordinates_count = ProviderProfile.objects.filter(
        is_online=True,
        is_available=True,
        current_latitude__isnull=False,
        current_longitude__isnull=False,
    ).count()
    logger.info(
        'Matching providers: total=%s, online_available=%s, with_coordinates=%s',
        total_providers,
        online_available_count,
        with_coordinates_count,
    )

    providers = ProviderProfile.objects.filter(
        is_online=True,
        is_available=True,
        current_latitude__isnull=False,
        current_longitude__isnull=False,
    )

    matching = []
    within_radius_count = 0
    service_match_count = 0
    for provider in providers:
        distance_km = haversine_distance(
            order.client_latitude,
            order.client_longitude,
            provider.current_latitude,
            provider.current_longitude,
        )
        if distance_km > 5:
            continue
        within_radius_count += 1

        service = ProviderService.objects.filter(provider=provider).first()
        if not service:
            continue

        if order.category and service.primary_service_id == order.category_id:
            matching.append(provider)
            service_match_count += 1
            continue

        if order.sub_service and service.subservices.filter(id=order.sub_service_id).exists():
            matching.append(provider)
            service_match_count += 1

    logger.info(
        'Matching providers: within_radius=%s, service_match=%s, matched_total=%s',
        within_radius_count,
        service_match_count,
        len(matching),
    )

    return matching


def notify_providers(order, providers):
    notified_count = 0
    existing_count = 0
    for provider in providers:
        match, created = OrderMatch.objects.get_or_create(
            order=order,
            provider=provider,
            defaults={"status": OrderMatch.STATUS_NOTIFIED},
        )
        if created:
            notified_count += 1
        else:
            existing_count += 1

    order.expires_at = timezone.now() + timedelta(minutes=30)
    order.status = order.STATUS_MATCHING
    order._status_log_note = 'Order moved to matching after provider notification.'
    order.save(update_fields=["expires_at", "status", "updated_at"])

    logger.info(
        'Provider notifications: providers=%s, matches_created=%s, matches_existing=%s',
        len(providers),
        notified_count,
        existing_count,
    )

    # TODO: integrate with notifications app to push provider alerts.
    return notified_count
