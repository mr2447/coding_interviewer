import logging
import boto3
import os
import json

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def get_cors_origin(event):
  """
  Get the appropriate CORS origin based on the request.
  Supports multiple allowed origins: localhost for development and CloudFront for production.
  """
  # List of allowed origins
  allowed_origins = [
    'http://localhost:5174',  # Local development
    'https://d218nvq550m5aj.cloudfront.net',  # Production CloudFront
    'http://localhost:5173',  # Alternative local port
  ]
  
  # Get additional allowed origins from environment variable (comma-separated)
  env_origins = os.environ.get('ALLOWED_ORIGINS', '')
  if env_origins:
    allowed_origins.extend([origin.strip() for origin in env_origins.split(',')])
  
  # Get the origin from the request headers
  headers = event.get('headers', {})
  # Headers can be case-insensitive, so check both cases
  request_origin = headers.get('Origin') or headers.get('origin')
  
  # If request origin is in allowed list, return it (browser requirement)
  if request_origin and request_origin in allowed_origins:
    return request_origin
  
  # Default to first allowed origin if no match
  return allowed_origins[0]

def lambda_handler(event, context):
  logger.info("Event received: %s", json.dumps(event))
  
  # Get the appropriate CORS origin for this request
  allowed_origin = get_cors_origin(event)
  
  # Handle OPTIONS preflight request for CORS
  if event.get('httpMethod') == 'OPTIONS' or (event.get('requestContext', {}).get('http', {}).get('method') == 'OPTIONS'):
    return {
      "statusCode": 200,
      "headers": {
        "Access-Control-Allow-Origin": allowed_origin,
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Max-Age": "86400"
      },
      "body": ""
    }
  
  # Parse request body (API Gateway Lambda Proxy integration)
  try:
    if isinstance(event.get('body'), str):
      body = json.loads(event['body'])
    else:
      body = event.get('body', {})
  except json.JSONDecodeError:
    return {
      "statusCode": 400,
      "headers": {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowed_origin,
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "POST,OPTIONS"
      },
      "body": json.dumps({"error": "Invalid JSON in request body"})
    }
  
  # Extract fields from request body
  code = body.get('code', '')
  question_id = body.get('questionId', '')
  language = body.get('language', '')
  user_id = body.get('userId', '')
  
  # Get region from event context or use default
  region = event.get('requestContext', {}).get('region', 'us-east-2')
  
  codeQueue = boto3.client('sqs', region_name=region)
  queue_url = os.environ['CodeQueueURL']
  
  attributes = {
    "Code": {
        "DataType": "String",
        "StringValue": code
    },
    "Region": {
        "DataType": "String",
        "StringValue": region
    },
    "cid": {
        "DataType": "String",
        "StringValue": str(user_id)
    },
    "qid": {
        "DataType": "String",
        "StringValue": str(question_id)
    },
    "language": {
        "DataType": "String",
        "StringValue": language
    }
  }

  try:
    codeQueue.send_message(
      QueueUrl=queue_url,
      MessageBody = "Filler String",
      MessageAttributes = attributes
      )
  except Exception as e:
    logger.error(e)
    return {
      "statusCode": 500,
      "headers": {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowed_origin,
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "POST,OPTIONS"
      },
      "body": json.dumps({"error": "Failed to submit code"})
    }
  return {
    "statusCode": 200,
    "headers": {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": allowed_origin,
      "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Methods": "POST,OPTIONS"
    },
    "body": json.dumps({"success": True, "message": "Code submitted successfully"})
  }