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
        # Convert HTTPS endpoint to WebSocket API Gateway Management endpoint
        # e.g., https://abc123.execute-api.us-east-1.amazonaws.com/prod
        # becomes: abc123.execute-api.us-east-1.amazonaws.com
        parsed = urlparse(websocket_endpoint)
        endpoint_url = f"https://{parsed.netloc}"
        
        # Extract region from endpoint
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
        api_client.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(message)
        )
        logger.info(f"Successfully sent message to connectionId {connection_id}")
        return True
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        if error_code == 'GoneException':
            logger.warning(f"Connection {connection_id} is gone (disconnected)")
        else:
            logger.error(f"ClientError sending message to connectionId {connection_id}: {str(e)}")
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
        
        # Extract user ID (try multiple possible field names)
        user_id = payload.get('userId') or payload.get('cid') or payload.get('user_id')
        
        if not user_id:
            logger.error("No userId found in payload. Available keys: %s", list(payload.keys()))
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "userId not found in payload"})
            }
        
        # Get connection ID from DynamoDB
        connection_id = get_connection_id(user_id, connections_table)
        
        if not connection_id:
            logger.warning(f"No active WebSocket connection found for userId {user_id}")
            return {
                "statusCode": 404,
                "body": json.dumps({"error": "No active WebSocket connection found for user"})
            }
        
        # Parse results
        results_data = payload.get('Results') or payload.get('results') or {}
        parsed_results = parse_results(results_data)
        
        # Prepare message to send to frontend
        message = {
            "type": "result",
            "testResults": parsed_results,
            "questionId": payload.get('qid'),
            "language": payload.get('language'),
            "success": parsed_results.get('success', False) if isinstance(parsed_results, dict) else False
        }
        
        # If parsed_results has test results structure, include it
        if isinstance(parsed_results, dict):
            if 'tests' in parsed_results:
                message['testResults'] = parsed_results
                message['success'] = parsed_results.get('passed', 0) == parsed_results.get('total', 0) and parsed_results.get('total', 0) > 0
            elif 'success' in parsed_results:
                message['success'] = parsed_results['success']
        
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