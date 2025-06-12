"""
Signal handlers for the ecomm_superadmin app
"""
import logging
import pika
import os
import json
import datetime
import argparse
import subprocess
from typing import Optional, Dict, Any, Union, Literal

# Import the managers
try:
    from cns_core.utils.rabbitmq_management import RabbitMQManager
    from cns_core.utils.worker_manager import WorkerManager
    USE_CNS_CORE = True
except ImportError:
    # Handle the case where cns_core might not be installed
    WorkerManager = None
    USE_CNS_CORE = False
    
    # Define a basic RabbitMQ manager using pika directly
    class RabbitMQManager:
        """Basic RabbitMQ manager implementation when cns_core is not available"""
        
        def __init__(self, host: str = None, port: int = None, 
                     username: str = None, password: str = None,
                     virtual_host: str = None, mock: bool = False):
            # Check if we should use mock mode
            self.mock = mock or os.environ.get('RABBITMQ_MOCK', '').lower() == 'true'
            
            if self.mock:
                logger.info("RabbitMQ running in mock mode - no actual connection will be made")
            
            # Read from environment variables if not provided
            self.host = host or os.environ.get('RABBITMQ_HOST', 'localhost')
            self.port = port or int(os.environ.get('RABBITMQ_PORT', '5672'))
            self.username = username or os.environ.get('RABBITMQ_USER', 'guest')
            self.password = password or os.environ.get('RABBITMQ_PASSWORD', 'guest')
            self.virtual_host = virtual_host or os.environ.get('RABBITMQ_VHOST', '/')
            
            # Store created queues information (for mock mode)
            self.created_queues = {}
            
        def get_connection_params(self) -> Dict[str, Any]:
            """Get connection parameters for RabbitMQ"""
            return {
                'host': self.host,
                'port': self.port,
                'virtual_host': self.virtual_host,
                'credentials': pika.PlainCredentials(self.username, self.password)
            }
        
        def create_tenant_queue(self, tenant_slug: str) -> bool:
            """Create a queue for a specific tenant
            
            Args:
                tenant_slug: The unique identifier for the tenant
                
            Returns:
                bool: True if queue was created successfully, False otherwise
            """
            # Get queue name
            queue_name = f"q_{tenant_slug}"
            exchange_name = 'tenant_tasks'
            routing_key = f"tenant.{tenant_slug}"
            
            # If in mock mode, just log and return success
            if self.mock:
                # Store queue information
                self.created_queues[queue_name] = {
                    'tenant': tenant_slug,
                    'exchange': exchange_name,
                    'routing_key': routing_key,
                    'created_at': str(datetime.datetime.now())
                }
                
                logger.info(f"[MOCK] Created RabbitMQ queue '{queue_name}' for tenant {tenant_slug}")
                try:
                    # Save queue information to a JSON file for visibility
                    queues_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mock_queues.json')
                    with open(queues_file, 'w') as f:
                        json.dump(self.created_queues, f, indent=2)
                    logger.info(f"[MOCK] Saved queue information to {queues_file}")
                except Exception as e:
                    logger.warning(f"[MOCK] Could not save queue information: {str(e)}")
                    
                return True
                
            # Real RabbitMQ connection
            try:
                # Create connection
                connection_params = pika.ConnectionParameters(**self.get_connection_params())
                connection = pika.BlockingConnection(connection_params)
                channel = connection.channel()
                
                # Create exchange if it doesn't exist
                channel.exchange_declare(
                    exchange=exchange_name,
                    exchange_type='direct',
                    durable=True
                )
                
                # Create queue
                channel.queue_declare(
                    queue=queue_name,
                    durable=True,
                    arguments={
                        'x-message-ttl': 86400000,  # 24 hours in milliseconds
                        'x-max-length': 10000
                    }
                )
                
                # Bind queue to exchange
                channel.queue_bind(
                    exchange=exchange_name,
                    queue=queue_name,
                    routing_key=routing_key
                )
                
                # Close connection
                connection.close()
                return True
            except Exception as e:
                logger.exception(f"Error creating queue for tenant {tenant_slug}: {str(e)}")
                return False

logger = logging.getLogger(__name__)

def setup_tenant_rabbitmq_queue(tenant):
    """
        Creates a dedicated RabbitMQ queue for a given tenant.

        This function is standalone and can be called from any API view or signal.

        Args:
            tenant: The Tenant model instance.
        
        Returns:
            bool: True if the queue was created successfully, False otherwise.
    """

    if not RabbitMQManager:
        logger.warning("RabbitMQManager is not available. Skipping queue creation.")
        return False
    
    if RabbitMQManager is not None:
        try:
            rabbit_mgr = RabbitMQManager()
            queue_created = rabbit_mgr.create_tenant_queue(tenant.url_suffix)
            if queue_created:
                logger.info(f"Created RabbitMQ queue for tenant: {tenant.name}")
            else:
                logger.error(f"Failed to create RabbitMQ queue for tenant: {tenant.name}")
        except Exception as e:
            logger.error(f"Error creating RabbitMQ queue: {str(e)}")
                
    # Start Celery worker for this tenant
    if WorkerManager is not None:
        try:
            # Check if worker is already running
            if WorkerManager.is_worker_running(tenant.url_suffix):
                logger.info(f"Worker already running for tenant: {tenant.name}")
            else:
                # Get the path to the worker script
                project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                worker_script = os.path.join(project_root, 'scripts', 'run_tenant_celery_worker.py')
                
                # Start the worker process
                process = subprocess.Popen(
                    ['python', worker_script, tenant.url_suffix, 'INFO'],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    cwd=project_root
                )
                
                # Save the worker PID
                WorkerManager.save_worker_pid(instance.url_suffix, process.pid)
                
                logger.info(f"Started Celery worker for tenant: {instance.name}")
        except Exception as e:
            logger.error(f"Error starting Celery worker: {str(e)}")
    
def create_tenant_queue(tenant):
    """
    Create a RabbitMQ queue for a tenant
    
    Args:
        tenant: The Tenant instance to create a queue for
    """
    if not RabbitMQManager:
        logger.warning("RabbitMQManager not available, skipping queue creation")
        return
    
    # Get tenant slug (use url_suffix or schema_name)
    tenant_slug = tenant.url_suffix or tenant.schema_name
    
    if not tenant_slug:
        logger.error(f"Cannot create queue for tenant {tenant.name}: No slug available")
        return  
    
    try:
        # Create RabbitMQ manager
        rabbit_mgr = RabbitMQManager()
        
        # Create tenant queue
        logger.info(f"Creating RabbitMQ queue for tenant: {tenant_slug}")
        success = rabbit_mgr.create_tenant_queue(tenant_slug)
        
        if success:
            logger.info(f"Successfully created RabbitMQ queue for tenant: {tenant_slug}")
        else:
            logger.error(f"Failed to create RabbitMQ queue for tenant: {tenant_slug}")
    
    except Exception as e:
        logger.exception(f"Error creating RabbitMQ queue for tenant {tenant_slug}: {str(e)}")


def create_hardcoded_tenant_queue(tenant_name: str = "TestTenant", tenant_slug: str = "testtenant", schema_name: str = "test_schema", use_mock: bool = False):
    """
    Create a hardcoded tenant object and set up RabbitMQ queue for it.
    This function can be used for testing the RabbitMQ queue creation without
    needing to create a tenant through the normal flow.
    
    Args:
        tenant_name: The name of the tenant
        tenant_slug: The URL suffix for the tenant
        schema_name: The database schema name for the tenant
        use_mock: Whether to use mock mode for RabbitMQ operations
    
    Returns:
        bool: True if queue creation was successful, False otherwise
    """
    # Set environment variable for mock mode if specified
    if use_mock:
        os.environ['RABBITMQ_MOCK'] = 'true'
    else:
        # Ensure we're not in mock mode
        os.environ.pop('RABBITMQ_MOCK', None)
    
    # Create a mock tenant object with the provided values
    class MockTenant:
        def __init__(self, name, url_suffix, schema_name):
            self.name = name
            self.url_suffix = url_suffix
            self.schema_name = schema_name
    
    # Create a tenant instance
    mock_tenant = MockTenant(tenant_name, tenant_slug, schema_name)
    logger.info(f"Created tenant: {mock_tenant.name} with slug {mock_tenant.url_suffix}")
    
    # Call the queue creation function
    logger.info(f"Creating RabbitMQ queue for tenant: {mock_tenant.name}")
    result = create_tenant_queue(mock_tenant)
    
    if result:
        logger.info(f"Successfully created queue for tenant: {mock_tenant.name}")
    else:
        logger.error(f"Failed to create queue for tenant: {mock_tenant.name}")
        
    return result

# Execute the tenant queue creation if this script is run directly
if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Set up command line argument parsing
    parser = argparse.ArgumentParser(description="Create a RabbitMQ queue for a tenant")
    parser.add_argument("--tenant-name", type=str, default="TestTenant", help="Name of the tenant")
    parser.add_argument("--tenant-slug", type=str, default="testtenant", help="URL suffix for the tenant")
    parser.add_argument("--schema-name", type=str, default="test_schema", help="Database schema name for the tenant")
    parser.add_argument("--mock", action="store_true", help="Use mock mode instead of connecting to real RabbitMQ server")
    
    args = parser.parse_args()
    
    logger.info(f"Creating queue for tenant: {args.tenant_name} (slug: {args.tenant_slug})")
    logger.info(f"Mock mode: {'enabled' if args.mock else 'disabled'}")
    
    # Create the tenant queue
    result = create_hardcoded_tenant_queue(
        tenant_name=args.tenant_name,
        tenant_slug=args.tenant_slug,
        schema_name=args.schema_name,
        use_mock=args.mock
    )
    
    # Exit with appropriate status code
    exit(0 if result else 1)