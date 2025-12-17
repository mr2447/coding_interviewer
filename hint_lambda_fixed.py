import json

from openai import OpenAI

client = OpenAI()

system_instructions = """

You are a Technical Teaching Assistant helping a student.
Your Constraints:
1. The student interacts via a "Get Hint" button only. THEY CANNOT REPLY TO YOU.
2. DO NOT ask questions expecting an answer (e.g., "What is the value of X?").
3. Instead, use rhetorical questions or observations (e.g., "Consider checking the value of X.").

4. Keep hints short (under 3 sentences).

5. DO NOT provide code solutions or rewrite their function.

Your Logic:

1. Compare the "Last Execution Result" with the "Current Editor Code".

2. If the "Last Execution Result" shows an error (like Timeout or wrong output), check the "Current Editor Code":

   - Did the user attempt to fix it? If NO, hint gently that the specific error might still be present.

   - If YES, analyze the new code for logic bugs.

3. If there is no execution history, analyze the code for syntax or logical flaws.

"""

def create_input(desc_context, results_context, user_code):
    return f"""

    {desc_context}

    {results_context}

    Current Editor Code:

    {user_code}

    ---

    Based on the above, provide a hint to unblock me. Remember I cannot reply to you.

    """

def lambda_handler(event, context):
    """
    Entry point for hint-generation Lambda.
    
    Expected event (API Gateway Lambda Proxy format):
    {
        "body": "{\"userId\": \"...\", \"qid\": 105, \"user_code\": \"...\", \"test_results_summary\": {...}, \"question_desc\": \"...\", \"thread_id\": \"...\"}"
    }
    
    OR if body is already parsed:
    {
        "body": {
            "userId": "...",
            "qid": 105,
            "user_code": "...",
            "test_results_summary": {...},
            "question_desc": "...",
            "thread_id": "..."
        }
    }
    """
    
    # Handle CORS preflight (OPTIONS) requests
    # Check both httpMethod and requestContext.httpMethod for compatibility
    http_method = event.get("httpMethod") or event.get("requestContext", {}).get("httpMethod", "")
    if http_method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "POST,OPTIONS",
                "Access-Control-Max-Age": "86400",
                "Content-Type": "application/json"
            },
            "body": ""
        }
    
    # Handle API Gateway Lambda Proxy format
    # Body can be a string (needs parsing) or already a dict
    body = event.get("body")
    
    # Handle empty body
    if body is None:
        body = {}
    elif isinstance(body, str) and body.strip() == "":
        body = {}
    
    # Parse body if it's a string (API Gateway format)
    if isinstance(body, str):
        try:
            body = json.loads(body)
        except json.JSONDecodeError as e:
            return {
                "statusCode": 400,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                    "Access-Control-Allow-Methods": "POST,OPTIONS",
                    "Content-Type": "application/json"
                },
                "body": json.dumps({
                    "error": f"Invalid JSON in request body: {str(e)}"
                })
            }
    
    # Extract fields (matching API spec and frontend)
    user_code = body.get("user_code")
    test_results = body.get("test_results_summary", None)
    prev_id = body.get("thread_id", None)
    question_description = body.get("question_desc", None)
    userId = body.get("userId")  # Required by API spec but not used in hint logic
    qid = body.get("qid")  # Required by API spec but not used in hint logic
    
    # Validate required fields per API spec
    missing_fields = []
    if not userId:
        missing_fields.append("userId")
    if qid is None:
        missing_fields.append("qid")
    if not user_code:
        missing_fields.append("user_code")
    
    if missing_fields:
        return {
            "statusCode": 400,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "POST,OPTIONS",
                "Content-Type": "application/json"
            },
            "body": json.dumps({
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            })
        }
    
    # Construct the Context String
    desc_context = ""
    if not prev_id and question_description:
        desc_context = f"Question Description: {question_description}"
    
    results_context = "No execution history."
    if test_results:
        results_context = f"""

        Last Execution Result:

        Status: {test_results.get("status")}

        Failed Input: {test_results.get('first_failed_test', {}).get('input')}

        """
    
    input_context = create_input(desc_context, results_context, user_code)
    
    print(input_context)
    
    response_args = {
        "model": "gpt-4o-mini",
        "instructions": system_instructions,
        "input": input_context,
    }
    
    if prev_id:
        response_args["previous_response_id"] = prev_id
    else:
        response_args["store"] = True
    
    try:
        response = client.responses.create(**response_args)
        hint = response.output_text
        
        if not prev_id:
            thread_id = response.id
        else:
            thread_id = prev_id
        
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "POST,OPTIONS",
                "Content-Type": "application/json"
            },
            "body": json.dumps({
                "hint": hint,
                "thread_id": thread_id,
            })
        }
    except Exception as e:
        print(f"Error calling OpenAI: {str(e)}")
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "POST,OPTIONS",
                "Content-Type": "application/json"
            },
            "body": json.dumps({
                "error": f"Failed to generate hint: {str(e)}"
            })
        }

