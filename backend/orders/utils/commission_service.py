import logging
from decimal import Decimal, ROUND_HALF_UP

from services.models import ProviderCategoryPricing

logger = logging.getLogger(__name__)


def calculate_commission(provider_profile, category):
    pricing = ProviderCategoryPricing.objects.filter(
        provider=provider_profile,
        category=category,
    ).first()
    if not pricing:
        logger.warning(
            "No ProviderCategoryPricing found for provider %s and category %s",
            provider_profile.id,
            getattr(category, "id", None),
        )
        return Decimal("0.00")

    mean_price = (pricing.min_price + pricing.max_price) / Decimal("2")
    commission = mean_price * Decimal("0.02")
    return commission.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
