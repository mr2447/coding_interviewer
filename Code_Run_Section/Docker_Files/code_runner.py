import boto3
import json
import os
import logging
import sys
import subprocess
import time

#setup logger
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger()

#setup lambda client
client = boto3.client("lambda")

#Strings to add to user code before running
IMPORTS = "import sys\n"
MAIN = "\nif __name__ == \"__main__\":\n\tsol = Solution()\n\tprint(sol."

def run_code():
    payload = json.loads(os.environ["PAYLOAD"])
    logger.info("Payload: %s", json.dumps(payload))

    func_name = f"{payload["func_name"]}("
    failed_case = 0
    failed_output = ""
    expected_output = ""
    failed_returncode = 0  # Track return code of failed test

    start = time.time()
    i = 1
    #Run each test case
    for case in payload["test_cases"]:
        full_script = IMPORTS + payload["code"] + MAIN + func_name + str(case["input"]) + "), end = \"\")"
        logger.info(json.dumps({"script": full_script}))
        #write python file
        if os.path.exists("submission.py"):
            os.remove("submission.py")
        with open("submission.py", "w") as f:
            f.write(full_script)

        #run python file
        result = subprocess.run(["python", "submission.py"],
                                capture_output=True,
                                text=True)
        os.remove("submission.py")

        #check if output matches
        logger.info(f"result.stdout: {result.stdout}")
        logger.info(f"Expected output: {case["expected_output"]}")
        if result.stdout != str(case["expected_output"]):
            if result.returncode == 0:
                failed_output = result.stdout
            else:
                failed_output = result.stderr
            failed_case = i
            failed_returncode = result.returncode
            expected_output = str(case["expected_output"])
            break
        i += 1

    #Format test results
    runtime = time.time() - start
    total_tests = len(payload["test_cases"])
    # Number of tests that actually ran (all if no failure, or up to first failure)
    tests_run = total_tests if failed_case == 0 else failed_case
    passed_tests = total_tests if failed_case == 0 else failed_case - 1
    
    # Format test results in a structure that frontend expects
    test_results = {
        "success": failed_case == 0,
        "passed": passed_tests,
        "total": tests_run,  # Only count tests that were actually run
        "runtime": runtime,
        "tests": []
    }
    
    # Build tests array - only include tests that were actually executed
    for i in range(tests_run):
        case = payload["test_cases"][i]
        test_status = "passed" if (failed_case == 0 or i < failed_case - 1) else "failed"
        test_obj = {
            "test": i + 1,
            "status": test_status,
            "input": str(case["input"]),
            "expected": str(case["expected_output"])
        }
        
        if test_status == "failed" and i == failed_case - 1:
            # This is the failed test
            test_obj["actual"] = failed_output
            test_obj["error"] = failed_output if failed_returncode != 0 else None
        elif test_status == "passed":
            # For passed tests, actual equals expected
            test_obj["actual"] = str(case["expected_output"])
        
        test_results["tests"].append(test_obj)
    
    # Prepare payload for relay-results lambda
    # Include context fields needed by relay-results to send to frontend
    relay_payload = {
        "qid": payload.get("qid"),
        "cid": payload.get("cid"),  # userId - relay-results will look for userId or cid
        "userId": payload.get("cid"),  # Also include as userId for clarity
        "language": payload.get("language"),
        "code": payload.get("code"),
        "region": payload.get("region"),
        "Results": test_results  # The test results in expected format
    }

    logger.info(f"Test results:\n {test_results}")
    logger.info(f"Sending to relay-results:\n {relay_payload}")
    
    try:
        response = client.invoke(
            FunctionName=payload["TargetLambda"],
            InvocationType="Event",
            Payload=json.dumps(relay_payload)
        )
    except Exception as e:
        logger.error(e)

if __name__ == "__main__":
    run_code()