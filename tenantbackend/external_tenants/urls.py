from django.urls import path
from .views import OrderProcessedView

urlpatterns = [
    # This will create the endpoint at /api/ecommerce/order_processed
    path('order_processed', OrderProcessedView.as_view(), name='order-processed'),
]
