import logging
import boto3
import os
import json

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
  logger.info("Event received: %s", json.dumps(event))
  return {
    "statusCode": 200,
  }