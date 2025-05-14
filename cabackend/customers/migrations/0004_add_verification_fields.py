from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('customers', '0002_alter_customer_source'),
    ]

    operations = [
        migrations.AddField(
            model_name='customer',
            name='EmailVerified',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='customer',
            name='MobileVerified',
            field=models.BooleanField(default=False),
        ),
    ]
