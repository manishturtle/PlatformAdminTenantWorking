from django.shortcuts import render, get_object_or_404
from django.db.models import Q, Max, F
from django.db import transaction
from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from .models import ServiceTicket, ServiceTicket_Tasks
from .serializers import ServiceTicketSerializer, ServiceTicket_TasksSerializer
from servicecategory.models import ServiceCategory
from sop.models import SOPMaster, SOPSteps
from datetime import datetime, date

class CustomPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class ServiceTicketViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing service tickets.
    
    List Endpoint (GET /api/servicetickets/):
    - Supports filtering by:
        * customer: Filter by customer ID
        * category: Filter by service category ID
        * agent: Filter by service agent ID
        * creation_date: Filter by creation date
        * search: Search in ticket description
    
    Create Endpoint (POST /api/servicetickets/):
    - Creates a new service ticket
    - Required fields:
        * customerid
        * serviceticketdesc
    - Optional fields:
        * servicecategoryid
        * serviceagentid
        * targetclosuredate
    
    Retrieve Endpoint (GET /api/servicetickets/{id}/):
    - Returns detailed information about a specific ticket
    
    Update Endpoint (PUT/PATCH /api/servicetickets/{id}/):
    - Updates an existing service ticket
    - All fields are optional for updates
    
    Delete Endpoint (DELETE /api/servicetickets/{id}/):
    - Deletes an existing service ticket
    """
    
    queryset = ServiceTicket.objects.all().order_by('-createdat')
    serializer_class = ServiceTicketSerializer
    pagination_class = CustomPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['customerid', 'servicecategoryid', 'serviceagentid']
    search_fields = ['serviceticketdesc']
    ordering_fields = ['createdat', 'targetclosuredate']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Date range filtering
        creation_date_start = self.request.query_params.get('creation_date_start')
        creation_date_end = self.request.query_params.get('creation_date_end')
        if creation_date_start:
            queryset = queryset.filter(creationdate__gte=creation_date_start)
        if creation_date_end:
            queryset = queryset.filter(creationdate__lte=creation_date_end)
            
        # Target date range filtering
        target_date_start = self.request.query_params.get('target_date_start')
        target_date_end = self.request.query_params.get('target_date_end')
        if target_date_start:
            queryset = queryset.filter(targetclosuredate__gte=target_date_start)
        if target_date_end:
            queryset = queryset.filter(targetclosuredate__lte=target_date_end)
            
        return queryset

    def perform_create(self, serializer):
        # Set default values for clientid and companyid
        service_ticket = serializer.save(
            clientid=1,
            companyid=1,
            createdby=self.request.user.user_id if hasattr(self.request.user, 'user_id') else 'system',
            updatedby=self.request.user.user_id if hasattr(self.request.user, 'user_id') else 'system'
        )
        
        # If a service category is provided, create tasks based on SOP steps
        if service_ticket.servicecategoryid:
            self.create_tasks_from_sop(service_ticket)

    def perform_update(self, serializer):
        # Update the updatedby field
        serializer.save(
            updatedby=self.request.user.user_id if hasattr(self.request.user, 'user_id') else 'system'
        )
    
    def create_tasks_from_sop(self, service_ticket):
        """Create ServiceTicket_Tasks based on SOP steps for the given service ticket"""
        # Get the SOP associated with the service category
        service_category = service_ticket.servicecategoryid
        if not service_category or not service_category.sopid:
            return
        
        sop = service_category.sopid
        
        # Get all steps for this SOP
        sop_steps = SOPSteps.objects.filter(SOPId=sop).order_by('Sequence')
        
        # Create a task for each SOP step
        for i, step in enumerate(sop_steps, 1):
            ServiceTicket_Tasks.objects.create(
                Client_Id=service_ticket.clientid,
                Company_Id=service_ticket.companyid,
                ServiceTicketId=service_ticket,
                SOPStepID=step,
                Sequence=i,  # Use the step sequence or create a new sequence
                TaskName=step.StepName,
                TaskStatus='New',
                TaskClosureDate=service_ticket.targetclosuredate,
                Createdby=service_ticket.createdby,
                Updatedby=service_ticket.updatedby
            )


class ServiceTicket_TasksViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing service ticket tasks.
    
    List Endpoint (GET /api/serviceticket-tasks/):
    - Supports filtering by service ticket ID
    
    Create Endpoint (POST /api/serviceticket-tasks/):
    - Creates a new service ticket task
    - Required fields:
        * ServiceTicketId
        * TaskName
        * Sequence
    
    Retrieve Endpoint (GET /api/serviceticket-tasks/{id}/):
    - Returns detailed information about a specific task
    
    Update Endpoint (PUT/PATCH /api/serviceticket-tasks/{id}/):
    - Updates an existing service ticket task
    - All fields are optional for updates
    
    Delete Endpoint (DELETE /api/serviceticket-tasks/{id}/):
    - Deletes an existing service ticket task
    
    Reorder Endpoint (POST /api/serviceticket-tasks/reorder/):
    - Updates the sequence of tasks for a service ticket
    - Requires a list of task IDs in the desired order
    """
    
    queryset = ServiceTicket_Tasks.objects.all().order_by('ServiceTicketId', 'Sequence')
    serializer_class = ServiceTicket_TasksSerializer
    pagination_class = CustomPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['ServiceTicketId', 'TaskServiceAgent', 'TaskStatus']
    search_fields = ['TaskName']
    ordering_fields = ['Sequence', 'TaskStartDate', 'TaskClosureDate']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by task status
        task_status = self.request.query_params.get('task_status')
        if task_status:
            queryset = queryset.filter(TaskStatus=task_status)
            
        # Filter by date ranges
        start_date_start = self.request.query_params.get('start_date_start')
        start_date_end = self.request.query_params.get('start_date_end')
        if start_date_start:
            queryset = queryset.filter(TaskStartDate__gte=start_date_start)
        if start_date_end:
            queryset = queryset.filter(TaskStartDate__lte=start_date_end)
            
        closure_date_start = self.request.query_params.get('closure_date_start')
        closure_date_end = self.request.query_params.get('closure_date_end')
        if closure_date_start:
            queryset = queryset.filter(TaskClosureDate__gte=closure_date_start)
        if closure_date_end:
            queryset = queryset.filter(TaskClosureDate__lte=closure_date_end)
            
        return queryset
    
    def perform_create(self, serializer):
        # Get the service ticket
        service_ticket_id = self.request.data.get('ServiceTicketId')
        
        # If sequence is not provided, set it to the next available sequence
        if 'Sequence' not in self.request.data or not self.request.data['Sequence']:
            max_sequence = ServiceTicket_Tasks.objects.filter(
                ServiceTicketId=service_ticket_id
            ).aggregate(Max('Sequence'))['Sequence__max'] or 0
            sequence = max_sequence + 1
        else:
            sequence = self.request.data['Sequence']
        
        # Set default values for Client_Id and Company_Id
        serializer.save(
            Client_Id=1,
            Company_Id=1,
            Sequence=sequence,
            Createdby=self.request.user.user_id if hasattr(self.request.user, 'user_id') else 'system',
            Updatedby=self.request.user.user_id if hasattr(self.request.user, 'user_id') else 'system'
        )

    def perform_update(self, serializer):
        # Update the Updatedby field
        serializer.save(
            Updatedby=self.request.user.user_id if hasattr(self.request.user, 'user_id') else 'system'
        )
    
    def perform_destroy(self, instance):
        # Get all tasks for this service ticket with higher sequence numbers
        higher_sequence_tasks = ServiceTicket_Tasks.objects.filter(
            ServiceTicketId=instance.ServiceTicketId,
            Sequence__gt=instance.Sequence
        )
        
        # Delete the instance
        instance.delete()
        
        # Decrement sequence for all tasks with higher sequence numbers
        with transaction.atomic():
            for task in higher_sequence_tasks:
                task.Sequence -= 1
                task.save()
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """
        Reorder tasks for a service ticket.
        
        Expected request format:
        {
            "service_ticket_id": 1,
            "task_order": [3, 1, 2]  # List of task IDs in the desired order
        }
        """
        service_ticket_id = request.data.get('service_ticket_id')
        task_order = request.data.get('task_order', [])
        
        if not service_ticket_id or not task_order:
            return Response(
                {"error": "Both service_ticket_id and task_order are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the service ticket
        service_ticket = get_object_or_404(ServiceTicket, serviceticketid=service_ticket_id)
        
        # Validate that all tasks exist and belong to this service ticket
        tasks = ServiceTicket_Tasks.objects.filter(ServiceTicketId=service_ticket)
        task_ids = set(tasks.values_list('ServiceTicketTaskId', flat=True))
        
        if not all(task_id in task_ids for task_id in task_order):
            return Response(
                {"error": "All tasks must exist and belong to the specified service ticket"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update the sequence of tasks
        with transaction.atomic():
            for index, task_id in enumerate(task_order, 1):
                task = tasks.get(ServiceTicketTaskId=task_id)
                task.Sequence = index
                task.save()
        
        # Return the updated tasks
        updated_tasks = ServiceTicket_Tasks.objects.filter(
            ServiceTicketId=service_ticket
        ).order_by('Sequence')
        serializer = self.get_serializer(updated_tasks, many=True)
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_service_ticket(self, request):
        """
        Get all tasks for a specific service ticket.
        
        Query parameter: service_ticket_id
        """
        service_ticket_id = request.query_params.get('service_ticket_id')
        
        if not service_ticket_id:
            return Response(
                {"error": "service_ticket_id query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the service ticket
        service_ticket = get_object_or_404(ServiceTicket, serviceticketid=service_ticket_id)
        
        # Get all tasks for this service ticket
        tasks = ServiceTicket_Tasks.objects.filter(
            ServiceTicketId=service_ticket
        ).order_by('Sequence')
        
        serializer = self.get_serializer(tasks, many=True)
        return Response(serializer.data)
