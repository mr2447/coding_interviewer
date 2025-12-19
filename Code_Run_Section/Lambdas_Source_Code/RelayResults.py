import logging
import boto3
import os
import json
from urllib.parse import urlparse
from botocore.exceptions import ClientError
import psycopg2

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
apigatewaymanagementapi = None  # Will be initialized with the correct endpoint

# Global DB connection for RDS
db_conn = None


def get_apigateway_client():
    """Initialize API Gateway Management API client with the WebSocket endpoint"""
    global apigatewaymanagementapi
    if apigatewaymanagementapi is None:
        websocket_endpoint = os.environ['WEBSOCKET_API_ENDPOINT']
        endpoint_url = websocket_endpoint
        logger.info(f"Using Management API endpoint: {endpoint_url} (with stage path)")

        # Extract region from endpoint
        parsed = urlparse(websocket_endpoint)
        region = parsed.netloc.split('.')[2] if len(parsed.netloc.split('.')) > 2 else os.environ.get('AWS_REGION',
                                                                                                      'us-east-2')

        apigatewaymanagementapi = boto3.client(
            'apigatewaymanagementapi',
            endpoint_url=endpoint_url,
            region_name=region
        )
    return apigatewaymanagementapi


# -------------------------
# RDS / Postgres connection
# -------------------------

def get_db_connection():
    """
    Get or create a global PostgreSQL connection to RDS.
    Expects env vars: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, optional DB_PORT.
    """
    global db_conn
    if db_conn is not None and db_conn.closed == 0:
        return db_conn

    db_host = os.environ['DB_HOST']
    db_name = os.environ['DB_NAME']
    db_user = os.environ['DB_USER']
    db_password = os.environ['DB_PASSWORD']
    db_port = int(os.environ.get('DB_PORT', '5432'))

    logger.info(f"Connecting to RDS at {db_host}:{db_port}/{db_name} as {db_user}")
    db_conn = psycopg2.connect(
        host=db_host,
        dbname=db_name,
        user=db_user,
        password=db_password,
        port=db_port,
    )
    db_conn.autocommit = True  # simplify for Lambda
    return db_conn


def insert_submission(user_sub, question_id, code, language, results):
    """
    Insert a submission row into the submissions table.

    Maps to columns:
    - user_sub
    - problem_id
    - code
    - language
    - status
    - runtime_ms
    - created_at (NOW() in SQL)
    """
    try:
        if not user_sub or not question_id or not code or not language:
            logger.warning(
                f"insert_submission: missing required fields. "
                f"user_sub={user_sub}, question_id={question_id}, language={language}"
            )
            return

        # results is expected to be a dict (parsed_results)
        success_bool = bool(results.get('success', False)) if isinstance(results, dict) else False
        status = "pass" if success_bool else "fail"
        runtime = None
        if isinstance(results, dict):
            runtime = results.get('runtime')

        runtime_ms = None
        if isinstance(runtime, (int, float)):
            runtime_ms = runtime * 1000.0  # seconds -> ms

        # Convert question_id to int if it's a string like "1"
        problem_id = None
        if isinstance(question_id, int):
            problem_id = question_id
        elif isinstance(question_id, str):
            try:
                problem_id = int(question_id)
            except ValueError:
                logger.warning(f"insert_submission: could not convert question_id '{question_id}' to int")
                return
        else:
            logger.warning(f"insert_submission: unsupported question_id type: {type(question_id)}")
            return

        conn = get_db_connection()
        logger.info("Parameters before sql insertion:")
        logger.info(
            f"User {user_sub} | Problem: {problem_id} | Status: {status} "
            f"({runtime_ms}ms) | Lang: {language} | Code: {repr(code)}"
        )
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO submissions (
                    user_sub,
                    problem_id,
                    code,
                    language,
                    status,
                    runtime_ms,
                    created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, NOW());
                """,
                (user_sub, problem_id, code, language, status, runtime_ms)
            )
        logger.info(
            f"Inserted submission: user_sub={user_sub}, problem_id={problem_id}, "
            f"success={status}, runtime_ms={runtime_ms}"
        )

    except Exception as e:
        logger.error(f"Error inserting submission into RDS: {str(e)}", exc_info=True)


# -------------------------
# DynamoDB connection lookup (unchanged)
# -------------------------

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
            logger.error(
                f"ClientError sending message to connectionId {connection_id}: Code={error_code}, Message={error_message}")
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
    Lambda handler for relaying code execution results to the frontend via WebSocket,
    and storing submission results in RDS.
    """
    logger.info("Event received: %s", json.dumps(event))

    connections_table = os.environ['CONNECTIONS_TABLE']

    try:
        # Extract payload data
        payload = event
        if isinstance(event, dict) and 'body' in event:
            try:
                payload = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
            except Exception:
                payload = event

        has_context = any(key in payload for key in ['userId', 'cid', 'user_id', 'qid', 'problem_id', 'questionId'])

        if not has_context and ('success' in payload or 'runtime' in payload):
            logger.warning("Received test results without context fields. Payload keys: %s", list(payload.keys()))
            logger.warning("This might be from code_runner that didn't include context. Check code_runner.py")

        # Extract user ID
        user_id = (
                payload.get('userId')
                or payload.get('cid')
                or payload.get('user_id')
                or (payload.get('Results', {}).get('userId')
                    if isinstance(payload.get('Results'), dict)
                    else None)
        )

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
            # Even if there's no WebSocket connection, we still want to store the submission
            # so we do NOT return here. We just skip sending the message later.

        # Parse results
        results_data = payload.get('Results') or payload.get('results')

        if results_data is None:
            if 'success' in payload or 'runtime' in payload:
                results_data = payload
                logger.info("Payload appears to be test results directly (teammate's format)")
            else:
                results_data = {}

        parsed_results = parse_results(results_data)

        # Extract question ID
        question_id = payload.get('qid') or payload.get('problem_id') or payload.get('questionId')
        if not question_id and isinstance(parsed_results, dict):
            question_id = parsed_results.get('qid') or parsed_results.get('problem_id')

        # Extract language
        language = payload.get('language')
        if not language and isinstance(parsed_results, dict):
            language = parsed_results.get('language')

        # Extract code
        code = payload.get('code', "")

        # 🔹 Insert into RDS submissions table
        insert_submission(
            user_sub=user_id,
            question_id=question_id,
            code=code,
            language=language,
            results=parsed_results
        )

        # Prepare message to send to frontend
        message = {
            "type": "result",
            "testResults": parsed_results,
            "questionId": question_id,
            "language": language,
            "success": parsed_results.get('success', False) if isinstance(parsed_results, dict) else False
        }
        print("Message", message)

        if isinstance(parsed_results, dict):
            if 'tests' in parsed_results:
                message['testResults'] = parsed_results
                message['success'] = (
                        parsed_results.get('passed', 0) == parsed_results.get('total', 0)
                        and parsed_results.get('total', 0) > 0
                )
            elif 'success' in parsed_results:
                message['success'] = parsed_results['success']
            elif 'runtime' in parsed_results:
                message['success'] = parsed_results.get('success', False)
                message['runtime'] = parsed_results.get('runtime')

        logger.info(f"Prepared message to send to frontend: {json.dumps(message)}")
        # Send message via WebSocket if we have a connection
        if connection_id:
            success = send_websocket_message(connection_id, message)
            if success:
                return {
                    "statusCode": 200,
                    "body": json.dumps({"message": "Result relayed and submission stored successfully"})
                }
            else:
                return {
                    "statusCode": 500,
                    "body": json.dumps({"error": "Failed to send message via WebSocket, but submission was stored"})
                }
        else:
            # No active WebSocket, but DB insert was attempted
            return {
                "statusCode": 200,
                "body": json.dumps({"message": "Submission stored; no active WebSocket connection"})
            }

    except Exception as e:
        logger.error(f"Error in lambda_handler: {str(e)}", exc_info=True)
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }