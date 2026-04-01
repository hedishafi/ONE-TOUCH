from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0011_clientprofile'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='provideronboardingsession',
            name='document_file',
        ),
        migrations.AddField(
            model_name='provideronboardingsession',
            name='back_image',
            field=models.FileField(blank=True, help_text='Back side of identity document', null=True, upload_to='onboarding_temp/'),
        ),
        migrations.AddField(
            model_name='provideronboardingsession',
            name='front_image',
            field=models.FileField(blank=True, help_text='Front side of identity document', null=True, upload_to='onboarding_temp/'),
        ),
        migrations.AlterField(
            model_name='clientonboardingsession',
            name='document_type',
            field=models.CharField(blank=True, choices=[('national_id', 'National ID'), ('drivers_license', "Driver's License"), ('kebele_id', 'Kebele ID')], max_length=20, null=True),
        ),
        migrations.AlterField(
            model_name='identitydocument',
            name='doc_type',
            field=models.CharField(choices=[('national_id', 'National ID'), ('drivers_license', "Driver's License"), ('kebele_id', 'Kebele ID')], max_length=20),
        ),
        migrations.AlterField(
            model_name='provideronboardingsession',
            name='document_type',
            field=models.CharField(blank=True, choices=[('national_id', 'National ID'), ('drivers_license', "Driver's License"), ('kebele_id', 'Kebele ID')], max_length=20, null=True),
        ),
    ]
