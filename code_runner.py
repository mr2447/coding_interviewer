import boto3
import json
import os
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)
client = boto3.client("lambda")

def run_code():
    payload = json.loads(os.environ["PAYLOAD"])
    logger.info("Event received: %s", json.dumps(payload))
    payload['Results'] = "Hello, Lambda!"
    try:
        response = client.invoke(
            FunctionName = payload["ResultRelayer"],
            InvocationType = "Event",
            Payload = json.dumps(payload)
        )
    except Exception as e:
        logger.error(e)
        return None
    logger.info("Successfully triggered ResultRelayer.")
    logger.info("Passed Result:")
    logger.info(payload['Results'])
    return response