# Generated manually to handle existing table
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            # Empty state_operations means Django won't create the table,
            # but will update its internal state
            state_operations=[
                migrations.CreateModel(
                    name='StatesByCountry',
                    fields=[
                        ('id', models.IntegerField(primary_key=True, serialize=False)),
                        ('name', models.CharField(blank=True, max_length=100, null=True)),
                        ('state_id', models.IntegerField(blank=True, null=True)),
                        ('state_code', models.CharField(blank=True, max_length=10, null=True)),
                        ('state_name', models.CharField(blank=True, max_length=100, null=True)),
                        ('country_id', models.IntegerField(blank=True, null=True)),
                        ('country_code', models.CharField(blank=True, max_length=10, null=True)),
                        ('country_name', models.CharField(blank=True, max_length=100, null=True)),
                        ('latitude', models.CharField(blank=True, max_length=50, null=True)),
                        ('longitude', models.CharField(blank=True, max_length=50, null=True)),
                        ('wiki_data_id', models.CharField(blank=True, max_length=50, null=True)),
                    ],
                    options={
                        'verbose_name': 'States By Country',
                        'verbose_name_plural': 'States By Countries',
                        'db_table': 'states_by_country',
                    },
                ),
            ],
            # Empty database_operations means no SQL will be run
            database_operations=[]
        ),
    ]
