import psycopg2
import os
import logging
import boto3
import json

logger = logging.getLogger()
logger.setLevel(logging.INFO)

PORT = 5432
# Get credentials from Environment Variables
DB_HOST = os.environ.get('DB_Host')
DB_USER = os.environ.get('DB_User')
DB_PASS = os.environ.get('DB_Pass')
DB_NAME = os.environ.get('DB_Name', 'postgres')

def lambda_handler(event, context):
  logger.info("event: {}".format(event))
  connection = psycopg2.connect(
    host=DB_HOST,
    user=DB_USER,
    password=DB_PASS,
    database=DB_NAME,
    port=PORT,
    connect_timeout=5
  )
  cursor = connection.cursor()
#   cursor.execute("""
#     UPDATE public.test_cases
#     SET expected_output = 'false'::jsonb
#     WHERE problem_id = 4
#     AND input = '1234567899'::jsonb;
# """)
  cursor.execute(
    """
    SELECT input, expected_output 
    FROM public.test_cases 
    WHERE problem_id = 4;
    """)
  connection.commit()
  result = cursor.fetchall()
  logger.info("result: {}".format(result))
  return {
    'statusCode': 200,
    'body': json.dumps('Hello from Lambda!')
  }