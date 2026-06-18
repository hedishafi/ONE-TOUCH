from django.db import migrations


def fix_admin_hint_default(apps, schema_editor):
    """
    SQLite-compatible version: Update admin_hint field to have empty string default.
    This is a no-op if the field doesn't exist or is already correct.
    """
    # This migration is now a no-op since the field is properly defined in the model
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0020_user_has_provider_role_and_more'),
    ]

    operations = [
        migrations.RunPython(fix_admin_hint_default, reverse_code=migrations.RunPython.noop),
    ]
