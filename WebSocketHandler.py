import logging
import boto3
import os
import json

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')


def lambda_handler(event, context):
    """
    WebSocket handler Lambda for API Gateway WebSocket API.
    
    Handles:
    - $connect: Store connectionId and userId in DynamoDB
    - $disconnect: Remove connectionId from DynamoDB
    - Custom routes: Can be added later for handling other messages
    """
    connections_table_name = os.environ['CONNECTIONS_TABLE']
    table = dynamodb.Table(connections_table_name)
    
    route_key = event.get('requestContext', {}).get('routeKey')
    connection_id = event.get('requestContext', {}).get('connectionId')
    
    logger.info(f"WebSocket event - routeKey: {route_key}, connectionId: {connection_id}")
    
    if route_key == '$connect':
        return handle_connect(event, table, connection_id)
    elif route_key == '$disconnect':
        return handle_disconnect(table, connection_id)
    else:
        # Handle custom routes if needed
        logger.warning(f"Unhandled route: {route_key}")
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Route not handled'})
        }


def handle_connect(event, table, connection_id):
    """
    Handle WebSocket connection.
    
    Extracts userId from query string parameters and stores connectionId in DynamoDB.
    The WebSocket URL should include ?userId=<user_id> as a query parameter.
    """
    try:
        # Get query string parameters
        query_params = event.get('queryStringParameters') or {}
        user_id = query_params.get('userId')
        
        if not user_id:
            logger.warning(f"No userId provided in query string for connection {connection_id}")
            # Store connection without userId - can be updated later via custom route
            # For now, we'll reject connections without userId
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'userId query parameter required'})
            }
        
        # Store connection in DynamoDB
        table.put_item(
            Item={
                'connectionId': connection_id,
                'userId': user_id,
                'connectedAt': event.get('requestContext', {}).get('connectedAt', '')
            }
        )
        
        logger.info(f"Stored connection {connection_id} for userId {user_id}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Connected',
                'connectionId': connection_id
            })
        }
        
    except Exception as e:
        logger.error(f"Error handling connect: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


def handle_disconnect(table, connection_id):
    """
    Handle WebSocket disconnection.
    
    Removes the connectionId from DynamoDB.
    """
    try:
        if not connection_id:
            logger.warning("No connectionId provided for disconnect")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'connectionId required'})
            }
        
        # Delete connection from DynamoDB
        table.delete_item(
            Key={
                'connectionId': connection_id
            }
        )
        
        logger.info(f"Removed connection {connection_id} from DynamoDB")
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Disconnected'})
        }
        
    except Exception as e:
        logger.error(f"Error handling disconnect: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

