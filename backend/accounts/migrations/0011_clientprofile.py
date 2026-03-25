# Generated migration for ClientProfile model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0010_clientonboardingsession'),
    ]

    operations = [
        migrations.CreateModel(
            name='ClientProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('client_type', models.CharField(choices=[('individual', 'Individual'), ('business', 'Business')], default='individual', help_text='Individual or Business client', max_length=20)),
                ('full_name', models.CharField(blank=True, max_length=255)),
                ('business_name', models.CharField(blank=True, max_length=255)),
                ('tax_id', models.CharField(blank=True, max_length=50)),
                ('business_address', models.CharField(blank=True, max_length=500)),
                ('selfie_url', models.URLField(blank=True, max_length=500)),
                ('id_document_url', models.URLField(blank=True, max_length=500)),
                ('loyalty_tier', models.CharField(choices=[('bronze', 'Bronze'), ('silver', 'Silver'), ('gold', 'Gold'), ('platinum', 'Platinum')], default='bronze', help_text='Client loyalty tier for reward tracking', max_length=20)),
                ('wallet_balance', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('total_bookings', models.PositiveIntegerField(default=0)),
                ('total_spent', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('avg_rating', models.FloatField(default=0.0, help_text='Average rating given to providers')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='client_profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Client Profile',
                'verbose_name_plural': 'Client Profiles',
            },
        ),
    ]
