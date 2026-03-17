#!/usr/bin/env python
"""Seed default service categories and sub-services."""

import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from accounts.models import ServiceCategory, SubService

# Create main service categories
print("Creating service categories...")

plumbing = ServiceCategory.objects.get_or_create(
    slug='plumbing',
    defaults={'name': 'Plumbing', 'description': 'Plumbing repair and installation services'}
)[0]
print(f"✓ {plumbing.name}")

electrical = ServiceCategory.objects.get_or_create(
    slug='electrical',
    defaults={'name': 'Electrical', 'description': 'Electrical repair and installation'}
)[0]
print(f"✓ {electrical.name}")

cleaning = ServiceCategory.objects.get_or_create(
    slug='cleaning',
    defaults={'name': 'Cleaning', 'description': 'Home and office cleaning services'}
)[0]
print(f"✓ {cleaning.name}")

# Create sub-services for Plumbing
print("\nCreating sub-services for Plumbing...")
SubService.objects.get_or_create(
    category=plumbing, slug='fix-faucet',
    defaults={'name': 'Fix Faucet'}
)
print("✓ Fix Faucet")

SubService.objects.get_or_create(
    category=plumbing, slug='unclog-pipe',
    defaults={'name': 'Unclog Pipe'}
)
print("✓ Unclog Pipe")

SubService.objects.get_or_create(
    category=plumbing, slug='install-fixture',
    defaults={'name': 'Install Fixture'}
)
print("✓ Install Fixture")

# Create sub-services for Electrical
print("\nCreating sub-services for Electrical...")
SubService.objects.get_or_create(
    category=electrical, slug='fix-wiring',
    defaults={'name': 'Fix Wiring'}
)
print("✓ Fix Wiring")

SubService.objects.get_or_create(
    category=electrical, slug='install-light',
    defaults={'name': 'Install Light'}
)
print("✓ Install Light")

SubService.objects.get_or_create(
    category=electrical, slug='repair-outlet',
    defaults={'name': 'Repair Outlet'}
)
print("✓ Repair Outlet")

# Create sub-services for Cleaning
print("\nCreating sub-services for Cleaning...")
SubService.objects.get_or_create(
    category=cleaning, slug='home-clean',
    defaults={'name': 'Home Cleaning'}
)
print("✓ Home Cleaning")

SubService.objects.get_or_create(
    category=cleaning, slug='office-clean',
    defaults={'name': 'Office Cleaning'}
)
print("✓ Office Cleaning")

print("\n✅ All service categories and sub-services created!")
