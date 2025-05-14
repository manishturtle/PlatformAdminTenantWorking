from rest_framework import serializers
from .models import ServiceTicket, ServiceTicket_Tasks
from customers.serializers import CustomerSerializer
from servicecategory.serializers import ServiceCategorySerializer
from serviceagent.serializers import ServiceAgentSerializer
from sop.serializers import SOPStepsSerializer
from customers.models import Customer
from servicecategory.models import ServiceCategory
from serviceagent.models import ServiceAgent
from sop.models import SOPSteps

class ServiceTicket_TasksSerializer(serializers.ModelSerializer):
    # Nested serializers for detailed representation
    sop_step_details = SOPStepsSerializer(source='SOPStepID', read_only=True)
    agent_details = ServiceAgentSerializer(source='TaskServiceAgent', read_only=True)
    
    # String representations for simpler display
    agent_name = serializers.SerializerMethodField()
    step_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ServiceTicket_Tasks
        fields = [
            'ServiceTicketTaskId',
            'Client_Id',
            'Company_Id',
            'ServiceTicketId',
            'SOPStepID',
            'sop_step_details',
            'step_name',
            'TaskServiceAgent',
            'agent_details',
            'agent_name',
            'Sequence',
            'TaskName',
            'TaskStartDate',
            'TaskClosureDate',
            'TaskStatus',
            'Createdat',
            'Createdby',
            'Updatedat',
            'Updatedby'
        ]
        read_only_fields = ['ServiceTicketTaskId', 'Createdat', 'Updatedat']
        extra_kwargs = {
            'Client_Id': {'default': 1},
            'Company_Id': {'default': 1},
            'Createdby': {'default': 'system'},
            'Updatedby': {'default': 'system'}
        }
    
    def get_agent_name(self, obj):
        if obj.TaskServiceAgent:
            return obj.TaskServiceAgent.serviceagentname
        return None
    
    def get_step_name(self, obj):
        if obj.SOPStepID:
            return obj.SOPStepID.StepName
        return None
    
    def validate(self, data):
        # Validate service ticket exists
        service_ticket_id = data.get('ServiceTicketId')
        if not ServiceTicket.objects.filter(serviceticketid=service_ticket_id.serviceticketid).exists():
            raise serializers.ValidationError({"ServiceTicketId": "Invalid service ticket ID"})
        
        # Validate SOP step if provided
        sop_step_id = data.get('SOPStepID')
        if sop_step_id and not SOPSteps.objects.filter(StepId=sop_step_id.StepId).exists():
            raise serializers.ValidationError({"SOPStepID": "Invalid SOP step ID"})
        
        # Validate service agent if provided
        task_service_agent = data.get('TaskServiceAgent')
        if task_service_agent and not ServiceAgent.objects.filter(serviceagentid=task_service_agent.serviceagentid).exists():
            raise serializers.ValidationError({"TaskServiceAgent": "Invalid service agent ID"})
        
        # Validate dates
        task_start_date = data.get('TaskStartDate')
        task_closure_date = data.get('TaskClosureDate')
        if task_closure_date and task_start_date and task_closure_date < task_start_date:
            raise serializers.ValidationError({"TaskClosureDate": "Task closure date cannot be earlier than task start date"})
        
        return data
    
    def create(self, validated_data):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and hasattr(user, 'user_id'):
            validated_data['Createdby'] = user.user_id
            validated_data['Updatedby'] = user.user_id
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and hasattr(user, 'user_id'):
            validated_data['Updatedby'] = user.user_id
        
        return super().update(instance, validated_data)


class ServiceTicketSerializer(serializers.ModelSerializer):
    # Nested serializers for detailed representation
    customer_details = CustomerSerializer(source='customerid', read_only=True)
    category_details = ServiceCategorySerializer(source='servicecategoryid', read_only=True)
    agent_details = ServiceAgentSerializer(source='serviceagentid', read_only=True)
    tasks = ServiceTicket_TasksSerializer(many=True, read_only=True)
    
    # String representations for simpler display
    customer_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    agent_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ServiceTicket
        fields = [
            'serviceticketid',
            'clientid',
            'companyid',
            'customerid',
            'customer_details',
            'customer_name',
            'servicecategoryid',
            'category_details',
            'category_name',
            'serviceagentid',
            'agent_details',
            'agent_name',
            'serviceticketsubject',
            'serviceticketdesc',
            'creationdate',
            'targetclosuredate',
            'status',
            'tasks',  
            'createdat',
            'createdby',
            'updatedat',
            'updatedby'
        ]
        read_only_fields = ['serviceticketid', 'createdat', 'updatedat']
        extra_kwargs = {
            'serviceticketsubject': {'required': True},
            'clientid': {'default': 1},
            'companyid': {'default': 1},
            'createdby': {'default': 'system'},
            'updatedby': {'default': 'system'}
        }

    def get_customer_name(self, obj):
        if obj.customerid:
            return f"{obj.customerid.FirstName} {obj.customerid.LastName}"
        return None

    def get_category_name(self, obj):
        if obj.servicecategoryid:
            return obj.servicecategoryid.servicecategoryname
        return None

    def get_agent_name(self, obj):
        if obj.serviceagentid:
            return obj.serviceagentid.serviceagentname
        return None

    def validate(self, data):
        # Ensure subject is provided
        if not data.get('serviceticketsubject') or not data.get('serviceticketsubject').strip():
            raise serializers.ValidationError({'serviceticketsubject': 'This field is required.'})

        # Validate customer exists
        customerid = data.get('customerid')
        if not Customer.objects.filter(CustomerID=customerid.CustomerID).exists():
            raise serializers.ValidationError({"customerid": "Invalid customer ID"})

        # Validate service category if provided
        servicecategoryid = data.get('servicecategoryid')
        if servicecategoryid and not ServiceCategory.objects.filter(servicecategoryid=servicecategoryid.servicecategoryid).exists():
            raise serializers.ValidationError({"servicecategoryid": "Invalid service category ID"})

        # Validate service agent if provided
        serviceagentid = data.get('serviceagentid')
        if serviceagentid and not ServiceAgent.objects.filter(serviceagentid=serviceagentid.serviceagentid).exists():
            raise serializers.ValidationError({"serviceagentid": "Invalid service agent ID"})

        # Validate dates
        creationdate = data.get('creationdate')
        targetclosuredate = data.get('targetclosuredate')
        if targetclosuredate and creationdate and targetclosuredate < creationdate:
            raise serializers.ValidationError({"targetclosuredate": "Target closure date cannot be earlier than creation date"})

        return data

    def create(self, validated_data):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and hasattr(user, 'user_id'):
            validated_data['createdby'] = user.user_id
            validated_data['updatedby'] = user.user_id
        
        return super().create(validated_data)

    def update(self, instance, validated_data):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and hasattr(user, 'user_id'):
            validated_data['updatedby'] = user.user_id
        
        return super().update(instance, validated_data)
