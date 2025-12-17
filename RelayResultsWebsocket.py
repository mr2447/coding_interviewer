import logging
import boto3
import os
import json
from urllib.parse import urlparse
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
apigatewaymanagementapi = None  # Will be initialized with the correct endpoint


def get_apigateway_client():
    """Initialize API Gateway Management API client with the WebSocket endpoint"""
    global apigatewaymanagementapi
    if apigatewaymanagementapi is None:
        websocket_endpoint = os.environ['WEBSOCKET_API_ENDPOINT']
        # For API Gateway Management API, try WITH the stage path
        # Some configurations require the stage to be included
        # e.g., https://abc123.execute-api.us-east-1.amazonaws.com/prod
        # Keep the full endpoint including /prod
        endpoint_url = websocket_endpoint
        logger.info(f"Using Management API endpoint: {endpoint_url} (with stage path)")
        
        # Extract region from endpoint
        parsed = urlparse(websocket_endpoint)
        region = parsed.netloc.split('.')[2] if len(parsed.netloc.split('.')) > 2 else os.environ.get('AWS_REGION', 'us-east-1')
        
        apigatewaymanagementapi = boto3.client(
            'apigatewaymanagementapi',
            endpoint_url=endpoint_url,
            region_name=region
        )
    return apigatewaymanagementapi


def get_connection_id(user_id, connections_table_name):
    """
    Query DynamoDB connections table to find the WebSocket connectionId for a user.
    
    Args:
        user_id: The user ID to look up
        connections_table_name: Name of the DynamoDB connections table
        
    Returns:
        connection_id (str) or None if not found
    """
    try:
        table = dynamodb.Table(connections_table_name)
        
        # Query the userId-index GSI
        response = table.query(
            IndexName='userId-index',
            KeyConditionExpression='userId = :userId',
            ExpressionAttributeValues={
                ':userId': user_id
            }
        )
        
        items = response.get('Items', [])
        if items:
            # Return the first connectionId found (there should typically be only one active connection per user)
            connection_id = items[0].get('connectionId')
            logger.info(f"Found connectionId {connection_id} for userId {user_id}")
            return connection_id
        else:
            logger.warning(f"No connection found for userId {user_id}")
            return None
    except Exception as e:
        logger.error(f"Error querying connections table for userId {user_id}: {str(e)}")
        return None


def send_websocket_message(connection_id, message):
    """
    Send a message to a WebSocket connection.
    
    Args:
        connection_id: The WebSocket connection ID
        message: The message to send (will be JSON stringified)
        
    Returns:
        True if successful, False otherwise
    """
    try:
        api_client = get_apigateway_client()
        endpoint_url = os.environ.get('WEBSOCKET_API_ENDPOINT', 'Not set')
        logger.info(f"Attempting to send message to connectionId {connection_id} via endpoint: {endpoint_url}")
        api_client.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(message)
        )
        logger.info(f"Successfully sent message to connectionId {connection_id}")
        return True
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        error_message = e.response.get('Error', {}).get('Message', '')
        endpoint_url = os.environ.get('WEBSOCKET_API_ENDPOINT', 'Not set')
        if error_code == 'GoneException':
            logger.warning(f"Connection {connection_id} is gone (disconnected)")
        elif error_code == 'ForbiddenException':
            logger.error(f"ForbiddenException sending to {connection_id}. Error: {error_message}")
            logger.error(f"Endpoint URL: {endpoint_url}")
            logger.error(f"Check IAM permissions for execute-api:ManageConnections and execute-api:Invoke")
            logger.error(f"Full error response: {json.dumps(e.response)}")
        else:
            logger.error(f"ClientError sending message to connectionId {connection_id}: Code={error_code}, Message={error_message}")
        return False
    except Exception as e:
        logger.error(f"Error sending message to connectionId {connection_id}: {str(e)}")
        return False


def parse_results(results_data):
    """
    Parse the Results field which might be a string or already an object.
    
    Args:
        results_data: Results data (string or dict)
        
    Returns:
        Parsed results dict
    """
    if isinstance(results_data, str):
        try:
            return json.loads(results_data)
        except json.JSONDecodeError:
            # If it's not JSON, treat it as a simple message
            return {"message": results_data}
    return results_data if isinstance(results_data, dict) else {}


def lambda_handler(event, context):
    """
    Lambda handler for relaying code execution results to the frontend via WebSocket.
    
    Expected event payload (from code_runner.py):
    {
        "qid": "question_id",
        "cid": "conversation_id or user_id",
        "code": "user_code",
        "language": "python|javascript|...",
        "region": "aws_region",
        "ResultRelayer": "relay-results",
        "Results": "test results as JSON string or object"
    }
    """
    logger.info("Event received: %s", json.dumps(event))
    
    connections_table = os.environ['CONNECTIONS_TABLE']
    
    try:
        # Extract payload data
        # The event might be the payload directly (when invoked from Lambda)
        # or wrapped in a different structure
        payload = event
        if isinstance(event, dict) and 'body' in event:
            # If event has a body, parse it
            try:
                payload = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
            except:
                payload = event
        
        # Handle case where code_runner sends only test_results (without context)
        # If payload only has test result fields, it might be missing context
        has_context = any(key in payload for key in ['userId', 'cid', 'user_id', 'qid', 'problem_id', 'questionId'])
        
        if not has_context and ('success' in payload or 'runtime' in payload):
            # This looks like test results without context - might be from code_runner
            # Try to extract from event context or log warning
            logger.warning("Received test results without context fields. Payload keys: %s", list(payload.keys()))
            logger.warning("This might be from code_runner that didn't include context. Check code_runner.py")
        
        # Extract user ID (try multiple possible field names)
        # Also check if it's in the Results object
        user_id = (payload.get('userId') or payload.get('cid') or payload.get('user_id') or 
                  payload.get('Results', {}).get('userId') if isinstance(payload.get('Results'), dict) else None)
        
        logger.info(f"Extracted userId: {user_id} from payload keys: {list(payload.keys())}")
        
        if not user_id:
            logger.error("No userId found in payload. Available keys: %s", list(payload.keys()))
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "userId not found in payload"})
            }
        
        # Get connection ID from DynamoDB
        logger.info(f"Looking up connectionId for userId: {user_id} in table: {connections_table}")
        connection_id = get_connection_id(user_id, connections_table)
        
        if not connection_id:
            logger.warning(f"No active WebSocket connection found for userId {user_id}")
            return {
                "statusCode": 404,
                "body": json.dumps({"error": "No active WebSocket connection found for user"})
            }
        
        # Parse results
        # Handle both formats:
        # 1. From code_runner: payload has 'Results' field with test results
        # 2. From teammate: payload IS the results (has success, runtime, problem_id, etc.)
        results_data = payload.get('Results') or payload.get('results')
        
        # If no Results field, the payload itself might be the results (teammate's format)
        if results_data is None:
            # Check if payload looks like test results (has success, runtime, etc.)
            if 'success' in payload or 'runtime' in payload:
                results_data = payload
                logger.info("Payload appears to be test results directly (teammate's format)")
            else:
                results_data = {}
        
        parsed_results = parse_results(results_data)
        
        # Extract question ID (handle both qid and problem_id)
        question_id = payload.get('qid') or payload.get('problem_id') or payload.get('questionId')
        if not question_id and isinstance(parsed_results, dict):
            question_id = parsed_results.get('qid') or parsed_results.get('problem_id')
        
        # Extract language
        language = payload.get('language')
        if not language and isinstance(parsed_results, dict):
            language = parsed_results.get('language')
        
        # Prepare message to send to frontend
        message = {
            "type": "result",
            "testResults": parsed_results,
            "questionId": question_id,
            "language": language,
            "success": parsed_results.get('success', False) if isinstance(parsed_results, dict) else False
        }
        
        # If parsed_results has test results structure, include it
        if isinstance(parsed_results, dict):
            if 'tests' in parsed_results:
                message['testResults'] = parsed_results
                message['success'] = parsed_results.get('passed', 0) == parsed_results.get('total', 0) and parsed_results.get('total', 0) > 0
            elif 'success' in parsed_results:
                message['success'] = parsed_results['success']
            # Handle teammate's format: success, runtime, failed test case
            elif 'runtime' in parsed_results:
                message['success'] = parsed_results.get('success', False)
                message['runtime'] = parsed_results.get('runtime')
        
        # Send message via WebSocket
        success = send_websocket_message(connection_id, message)
        
        if success:
            return {
                "statusCode": 200,
                "body": json.dumps({"message": "Result relayed successfully"})
            }
        else:
            return {
                "statusCode": 500,
                "body": json.dumps({"error": "Failed to send message via WebSocket"})
            }
            
    except Exception as e:
        logger.error(f"Error in lambda_handler: {str(e)}", exc_info=True)
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }