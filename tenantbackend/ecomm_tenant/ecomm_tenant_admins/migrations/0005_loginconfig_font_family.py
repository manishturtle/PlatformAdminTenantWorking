# Generated by Django 5.0.6 on 2025-06-09 13:33

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ecomm_tenant_admins', '0004_loginconfig_app_language_loginconfig_theme_color'),
    ]

    operations = [
        migrations.AddField(
            model_name='loginconfig',
            name='font_family',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
