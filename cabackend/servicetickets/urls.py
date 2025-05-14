from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ServiceTicketViewSet, ServiceTicket_TasksViewSet

# Set the app namespace
app_name = 'servicetickets'

# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r'', ServiceTicketViewSet, basename='serviceticket')

# Create a separate router for tasks
tasks_router = DefaultRouter()
tasks_router.register(r'', ServiceTicket_TasksViewSet, basename='serviceticket-task')

# The API URLs are now determined automatically by the router.
# Generated URLs include:
# - /api/servicetickets/ (GET, POST)
# - /api/servicetickets/{id}/ (GET, PUT, PATCH, DELETE)
# - /api/servicetickets/?customerid={id} (Filtering by customer)
# - /api/servicetickets/?servicecategoryid={id} (Filtering by category)
# - /api/servicetickets/?serviceagentid={id} (Filtering by agent)
# - /api/servicetickets/?creation_date_start=YYYY-MM-DD (Date filtering)
# - /api/servicetickets/?creation_date_end=YYYY-MM-DD
# - /api/servicetickets/?target_date_start=YYYY-MM-DD
#
# For tasks:
# - /api/servicetickets/tasks/ (GET, POST)
# - /api/servicetickets/tasks/{id}/ (GET, PUT, PATCH, DELETE)
# - /api/servicetickets/tasks/?ServiceTicketId={id} (Filtering by service ticket)
# - /api/servicetickets/tasks/?TaskServiceAgent={id} (Filtering by agent)
# - /api/servicetickets/tasks/?TaskStatus=New (Filtering by status)
# - /api/servicetickets/tasks/reorder/ (POST - Reorder tasks)
# - /api/servicetickets/tasks/by_service_ticket/?service_ticket_id={id} (GET - Get tasks for a service ticket)
# - /api/servicetickets/?target_date_end=YYYY-MM-DD
# - /api/servicetickets/?search=query (Search in description)
# - /api/servicetickets/?ordering=createdat (Order by creation date)
# - /api/servicetickets/?ordering=-createdat (Order by creation date, descending)
# - /api/servicetickets/?page=1&page_size=10 (Pagination)

urlpatterns = [
    path('', include(router.urls)),
    path('tasks/', include(tasks_router.urls)),
]
