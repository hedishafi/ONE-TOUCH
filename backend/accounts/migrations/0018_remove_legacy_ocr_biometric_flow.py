from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0017_deletedproviderrecord'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='user',
            name='biometric_score',
        ),
        migrations.RemoveField(
            model_name='user',
            name='biometric_verified',
        ),
        migrations.DeleteModel(
            name='ClientOnboardingSession',
        ),
        migrations.DeleteModel(
            name='FaceBiometricVerification',
        ),
        migrations.DeleteModel(
            name='IdentityDocument',
        ),
        migrations.DeleteModel(
            name='ProviderOnboardingSession',
        ),
    ]
