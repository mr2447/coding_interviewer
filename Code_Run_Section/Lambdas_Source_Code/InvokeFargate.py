import psycopg2
import os
import logging
import boto3
import json

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Get credentials from Environment Variables
DB_HOST = os.environ.get('DB_Host')
DB_USER = os.environ.get('DB_User')
DB_PASS = os.environ.get('DB_Pass')
DB_NAME = os.environ.get('DB_Name')
PORT = os.environ.get('DB_Port')

def pull_from_RDS(qid):
    connection = None
    try:
        connection = psycopg2.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME,
            port=PORT,
            connect_timeout=5
        )

        cursor = connection.cursor()
        #Pull test cases
        cursor.execute(
            """
            SELECT input, expected_output 
            FROM public.test_cases 
            WHERE problem_id = %s;
            """, (qid,)
        )
        result = cursor.fetchall()

        test_cases = []
        for case in result:
            test_cases.append({
                "input": case[0],
                "expected_output": case[1]
            })

        #Pull function name
        cursor.execute(
            """
            SELECT func_name 
            FROM public.problems
            WHERE problem_id = %s;
            """, (qid,)
        )
        func_name = cursor.fetchone()[0]

        return (test_cases, func_name)

    except psycopg2.OperationalError as e:
        # This catches connection errors (timeouts, wrong password, etc)
        logger.error(f"Database connection failed: {e}")
        raise e

    finally:
        if connection:
            connection.close()

def run_task(attributes, problem_info):
    logger.info(f"Test cases: {test_cases}")
    logger.info(f"Function name: {func_name}")
    test_cases, func_name = problem_info
    # Extract attributes
    region = attributes['Region']['stringValue']
    code = attributes['Code']['stringValue']
    language = attributes['language']['stringValue']
    qid = attributes['qid']['stringValue']
    cid = attributes['cid']['stringValue']
    target_lambda = attributes['TargetLambda']['stringValue']

    codeRunner = boto3.client('ecs', region_name=region)

    # Prepare payload for task
    payload = {
        "qid": qid,
        "cid": cid,
        "code": code,
        "language": language,
        "region": region,
        "test_cases": test_cases,
        "func_name": func_name,
        "TargetLambda": target_lambda
    }

    # Run the task
    response = codeRunner.run_task(
        cluster=os.environ["Cluster"],
        launchType="FARGATE",
        taskDefinition=os.environ['TaskDef'],
        count=1,
        networkConfiguration={
            "awsvpcConfiguration": {
                "subnets": os.environ["Subnets"].split(","),
                "securityGroups": [os.environ["SecurityGroup"].strip()],
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
    logger.info(f"Task started: {response}")


def lambda_handler(event, context):
    logger.info(f"Event received: {json.dumps(event)}")
    for record in event['Records']:
        try:
            attributes = record['messageAttributes']
            # PUll test cases and run task
            problem_info = pull_from_RDS(attributes['qid']['stringValue'])
            run_task(attributes, problem_info)
            logger.info("Task started")
            # Delete message from queue
            sqs = boto3.client('sqs', region_name=attributes['Region']['stringValue'])
            queue_url = os.environ['CodeQueueURL']
            receiptHandle = record['receiptHandle']
            sqs.delete_message(
                QueueUrl=queue_url,
                ReceiptHandle=receiptHandle
            )
            logger.info("Deleted message from Queue")

        except Exception as e:
            logger.error(f"Error:\n{e}")
            raise e

    return {
        "statusCode": 200,
    }