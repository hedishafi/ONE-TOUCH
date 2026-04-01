from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0014_identitydocument_extracted_gender_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='providerprofile',
            name='profile_picture',
            field=models.ImageField(blank=True, null=True, upload_to='provider/profile_pictures/'),
        ),
    ]
