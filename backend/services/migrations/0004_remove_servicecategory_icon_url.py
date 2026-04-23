from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0003_delete_commissionrule'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='servicecategory',
            name='icon_url',
        ),
    ]
