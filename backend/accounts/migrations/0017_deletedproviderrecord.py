from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0016_user_provider_uid'),
    ]

    operations = [
        migrations.CreateModel(
            name='DeletedProviderRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('phone_number', models.CharField(db_index=True, max_length=30, unique=True)),
                ('provider_uid', models.CharField(blank=True, max_length=6)),
                ('deleted_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Deleted Provider Record',
                'verbose_name_plural': 'Deleted Provider Records',
                'ordering': ['-deleted_at'],
            },
        ),
    ]
