from django.db import migrations, models
import django.db.models.deletion


def remap_onboarding_services(apps, schema_editor):
    ProviderOnboardingSession = apps.get_model('accounts', 'ProviderOnboardingSession')
    AccountsServiceCategory = apps.get_model('accounts', 'ServiceCategory')
    AccountsSubService = apps.get_model('accounts', 'SubService')
    ServiceCategory = apps.get_model('services', 'ServiceCategory')
    SubService = apps.get_model('services', 'SubService')

    category_id_map = {}
    for old in AccountsServiceCategory.objects.all():
        new = ServiceCategory.objects.filter(id=old.id).first()
        if not new:
            new = ServiceCategory.objects.filter(slug=old.slug).first()
        if not new:
            new = ServiceCategory.objects.filter(name__iexact=old.name).first()
        if new:
            category_id_map[old.id] = new.id

    subservice_id_map = {}
    for old in AccountsSubService.objects.all():
        new_category_id = category_id_map.get(old.category_id)
        if not new_category_id:
            continue
        new = SubService.objects.filter(id=old.id).first()
        if not new:
            new = SubService.objects.filter(category_id=new_category_id, slug=old.slug).first()
        if new:
            subservice_id_map[old.id] = new.id

    for session in ProviderOnboardingSession.objects.all():
        updated = False
        if session.service_category_id:
            session.service_category_id = category_id_map.get(session.service_category_id)
            updated = True
        if session.service_ids:
            new_ids = []
            for old_id in session.service_ids:
                mapped = subservice_id_map.get(old_id)
                if mapped:
                    new_ids.append(mapped)
            session.service_ids = new_ids
            updated = True
        if updated:
            session.save(update_fields=['service_category', 'service_ids'])


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0017_deletedproviderrecord'),
        ('services', '0002_service_catalog_move'),
    ]

    operations = [
        migrations.AlterField(
            model_name='provideronboardingsession',
            name='service_category',
            field=models.IntegerField(blank=True, help_text='Primary service category (1 only)', null=True),
        ),
        migrations.RunPython(remap_onboarding_services, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='provideronboardingsession',
            name='service_category',
            field=models.ForeignKey(blank=True, help_text='Primary service category (1 only)', null=True, on_delete=django.db.models.deletion.SET_NULL, to='services.servicecategory'),
        ),
        migrations.DeleteModel(
            name='ProviderService',
        ),
        migrations.DeleteModel(
            name='SubService',
        ),
        migrations.DeleteModel(
            name='ServiceCategory',
        ),
    ]
