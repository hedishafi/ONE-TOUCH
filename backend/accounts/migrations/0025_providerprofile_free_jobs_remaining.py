from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0024_merge_20260423_1450'),
    ]

    operations = [
        migrations.AddField(
            model_name='providerprofile',
            name='free_jobs_remaining',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
