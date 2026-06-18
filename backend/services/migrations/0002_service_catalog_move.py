from django.db import migrations, models
import django.db.models.deletion


def copy_service_catalog(apps, schema_editor):
    AccountsServiceCategory = apps.get_model('accounts', 'ServiceCategory')
    AccountsSubService = apps.get_model('accounts', 'SubService')
    AccountsProviderService = apps.get_model('accounts', 'ProviderService')

    ServiceCategory = apps.get_model('services', 'ServiceCategory')
    SubService = apps.get_model('services', 'SubService')
    ProviderService = apps.get_model('services', 'ProviderService')

    category_id_map = {}

    for old in AccountsServiceCategory.objects.all():
        existing = ServiceCategory.objects.filter(id=old.id).first()
        if not existing:
            existing = ServiceCategory.objects.filter(slug=old.slug).first()
        if not existing:
            existing = ServiceCategory.objects.filter(name__iexact=old.name).first()

        if existing:
            updates = {}
            if hasattr(existing, 'icon_url') and not existing.icon_url and old.icon_url:
                updates['icon_url'] = old.icon_url
            if hasattr(existing, 'is_active') and existing.is_active != old.is_active:
                updates['is_active'] = old.is_active
            if not existing.description and old.description:
                updates['description'] = old.description
            if updates:
                ServiceCategory.objects.filter(id=existing.id).update(**updates)
            category_id_map[old.id] = existing.id
            continue

        created = ServiceCategory.objects.create(
            id=old.id,
            name=old.name,
            slug=old.slug,
            description=old.description,
            icon_url=old.icon_url,
            is_active=old.is_active,
        )
        category_id_map[old.id] = created.id

    subservice_id_map = {}
    for old in AccountsSubService.objects.all():
        new_category_id = category_id_map.get(old.category_id)
        if not new_category_id:
            continue

        existing = SubService.objects.filter(id=old.id).first()
        if not existing:
            existing = SubService.objects.filter(category_id=new_category_id, slug=old.slug).first()

        if existing:
            subservice_id_map[old.id] = existing.id
            continue

        created = SubService.objects.create(
            id=old.id,
            category_id=new_category_id,
            name=old.name,
            slug=old.slug,
            description=old.description,
            is_active=old.is_active,
        )
        subservice_id_map[old.id] = created.id

    for old in AccountsProviderService.objects.all():
        primary_id = category_id_map.get(old.primary_service_id) if old.primary_service_id else None
        provider_service, _ = ProviderService.objects.get_or_create(
            provider_id=old.provider_id,
            defaults={'primary_service_id': primary_id},
        )

        if primary_id and provider_service.primary_service_id != primary_id:
            provider_service.primary_service_id = primary_id
            provider_service.save(update_fields=['primary_service'])

        new_sub_ids = []
        for sub_id in old.subservices.values_list('id', flat=True):
            mapped = subservice_id_map.get(sub_id)
            if mapped:
                new_sub_ids.append(mapped)
        if new_sub_ids:
            provider_service.subservices.set(new_sub_ids)


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0001_initial'),
        ('accounts', '0017_deletedproviderrecord'),
    ]

    operations = [
        migrations.AddField(
            model_name='servicecategory',
            name='icon_url',
            field=models.URLField(blank=True, help_text='Legacy icon URL (optional)'),
        ),
        migrations.AddField(
            model_name='servicecategory',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        migrations.CreateModel(
            name='SubService',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('slug', models.SlugField()),
                ('description', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('category', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subservices', to='services.servicecategory')),
            ],
            options={
                'ordering': ['category', 'name'],
                'unique_together': {('category', 'slug')},
            },
        ),
        migrations.CreateModel(
            name='ProviderService',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('primary_service', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='services.servicecategory')),
                ('provider', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='service_offering', to='accounts.providerprofile')),
                ('subservices', models.ManyToManyField(help_text='Sub-services provider offers (can be multiple)', to='services.subservice')),
            ],
            options={
                'verbose_name_plural': 'Provider Services',
            },
        ),
        migrations.RunPython(copy_service_catalog, migrations.RunPython.noop),
    ]
