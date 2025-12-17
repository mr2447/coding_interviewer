import logging
import boto3
import os
import json

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
  logger.info("Event received: %s", json.dumps(event))
  
  # Get allowed origin from environment variable, default to localhost for development
  allowed_origin = os.environ.get('ALLOWED_ORIGIN', 'http://localhost:5174')
  
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