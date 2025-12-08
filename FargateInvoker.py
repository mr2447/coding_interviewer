import logging
import boto3
import os
import json

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    logger.info("Event received: %s", json.dumps(event))
    for record in event['Records']:
        # Extract attributes
        attributes = record['messageAttributes']
        codeRunner = boto3.client('ecs', region_name=attributes["Region"]['stringValue'])
        region = attributes['Region']['stringValue']
        code = attributes['Code']['stringValue']
        language = attributes['language']['stringValue']
        qid = attributes['qid']['stringValue']
        cid = attributes['cid']['stringValue']

        # Prepare payload for task
        payload = {
            "qid": qid,
            "cid": cid,
            "code": code,
            "language": language,
            "region": region,
            'ResultRelayer': os.environ['ResultRelayer']
        }
        # Run task
        try:
            response = codeRunner.run_task(
                cluster=os.environ["Cluster"],
                launchType="FARGATE",
                taskDefinition=os.environ['TaskDef'],
                count=1,
                networkConfiguration={
                    "awsvpcConfiguration": {
                        "subnets": os.environ["Subnets"].split(","),
                        "securityGroups": [os.environ["Security_Group"].strip()],
                        "assignPublicIp": "DISABLED"
                    }
                },
                overrides={
                    "containerOverrides": [
                        {
                            "name": os.environ["ContainerName"],
                            "environment": [
                                {"name": "PAYLOAD", "value": json.dumps(payload)}
                            ]
                        }
                    ]
                }
            )
            logger.info("Task started: %s", response)
        except Exception as e:
            raise e
        try:
            sqs = boto3.client('sqs', region_name=region)
            queue_url = os.environ['CodeQueueURL']
            receiptHandle = record['receiptHandle']
            sqs.delete_message(
                QueueUrl=queue_url,
                ReceiptHandle=receiptHandle
            )
            logger.info("Deleted message from Queue")
        except Exception as e:
            raise e
    return {
        "statusCode": 200,
    }