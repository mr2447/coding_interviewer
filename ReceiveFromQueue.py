import boto3
import json
import os
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)
client = boto3.client("lambda")

def lambda_handler(event, context):
    logger.info("Event received: %s", json.dumps(event))
    try:
        response = client.invoke(
            FunctionName = "invoke-fargate",
            InvocationType = "Event",
            Payload = json.dumps(event)
        )
    except Exception as e:
        logger.error(e)
        return None
    return response