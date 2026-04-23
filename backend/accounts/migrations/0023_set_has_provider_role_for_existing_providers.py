# Generated migration to set has_provider_role=True for existing provider users

from django.db import migrations


def set_provider_role_for_existing_providers(apps, schema_editor):
    """
    Set has_provider_role=True for all existing users with role='provider'
    This ensures existing providers can use the multi-role switching system
    """
    User = apps.get_model('accounts', 'User')
    
    # Update all provider users to have has_provider_role=True
    provider_count = User.objects.filter(role='provider').update(has_provider_role=True)
    
    print(f"✅ Updated {provider_count} provider users with has_provider_role=True")


def reverse_migration(apps, schema_editor):
    """
    Reverse migration - no action needed as we don't want to remove the flag
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0022_add_has_client_role'),
    ]

    operations = [
        migrations.RunPython(set_provider_role_for_existing_providers, reverse_migration),
    ]
