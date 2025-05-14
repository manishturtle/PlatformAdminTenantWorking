import os
import sys

# Add the project root to Python path
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(project_root)

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'KeyProductSettings.settings')

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from ecomm_superadmin.models import Tenant, Application
from subscription_plan.models import SubscriptionPlan, Feature, PlanFeatureEntitlement

class Command(BaseCommand):
    help = 'Create test tenant and subscription data'

    def handle(self, *args, **options):
        print("Creating test data...")
        
        # Create a test tenant
        tenant, created = Tenant.objects.get_or_create(
            name="Test Tenant",
            schema_name="test_tenant",
            url_suffix="test",
            client_id=1,
            defaults={
                'status': 'active',
                'trial_end_date': None,
                'paid_until': None,
            }
        )
        print(f"Tenant created: {created}")
        
        # Create a test subscription plan
        plan, created = SubscriptionPlan.objects.get_or_create(
            name="Test Plan",
            defaults={
                'description': 'Test subscription plan',
                'status': 'active',
                'price': 100.00,
                'max_users': 100,
                'transaction_limit': 1000,
                'api_call_limit': 10000,
                'storage_limit': 100,
                'session_type': 'named',
                'support_level': 'standard',
                'valid_from': '2025-01-01',
                'valid_until': '2025-12-31',
                'detailed_entitlements': {}
            }
        )
        print(f"Subscription plan created: {created}")
        
        # Create a test feature
        feature, created = Feature.objects.get_or_create(
            app_id=1,
            key="test_feature",
            defaults={
                'name': 'Test Feature',
                'description': 'Test feature description'
            }
        )
        print(f"Feature created: {created}")
        
        # Link the feature to the plan
        entitlement, created = PlanFeatureEntitlement.objects.get_or_create(
            plan=plan,
            feature=feature,
            defaults={
                'granual_settings': {}
            }
        )
        print(f"Plan feature entitlement created: {created}")
        
        # Assign the plan to the tenant
        tenant.subscription_plan = plan
        tenant.save()
        print("Subscription plan assigned to tenant")
        
        # Create a test application
        app, created = Application.objects.get_or_create(
            app_id=1,
            application_name="Test Application",
            app_default_url="http://test.app.com",
            defaults={
                'description': 'Test application',
                'is_active': True
            }
        )
        print(f"Application created: {created}")
        
        print("Test data creation completed successfully!")
