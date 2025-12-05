import boto3
import json

client = boto3.client("lambda")

def run_code():
    response = client.invoke(
        FunctionName = "ResultRelayer",
        InvocationType = "Event",
        Payload = json.dumps({"results": "Hello, Lambda!"}).encode("utf-8")
    )
    return response