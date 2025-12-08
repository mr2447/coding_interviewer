import logging
import boto3
import os
import json

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
  logger.info("Event received: %s", json.dumps(event))
  codeQueue = boto3.client('sqs', region_name = event["Region"])
  queue_url = os.environ['CodeQueueURL']
  attributes = {
    "Code": {
        "DataType": "String",
        "StringValue": event["submission"]
    },
    "Region": {
        "DataType": "String",
        "StringValue": event["Region"]
    },
    "cid": {
        "DataType": "String",
        "StringValue": str(event["cid"])
    },
    "qid": {
        "DataType": "String",
        "StringValue": str(event["qid"])
    },
    "language": {
        "DataType": "String",
        "StringValue": event["language"]
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
        "headers":
        {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "*"
        }
    }
  return {
    "statusCode": 200,
      "headers":
      {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "*"
      }
  }