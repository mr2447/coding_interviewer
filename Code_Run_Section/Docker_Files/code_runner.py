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
            expected_output = str(case["expected_output"])
            break
        i += 1

    #Format response
    runtime = time.time() - start
    if failed_case == 0:
        response = {"success": True,
                    "runtime": runtime}
    else:
        response = {"success": False,
                    "failed_case": failed_case,
                    "output": failed_output,
                    "expected_output": expected_output}

    logger.info(f"Response:\n {response}")
    try:
        response = client.invoke(
            FunctionName=payload["TargetLambda"],
            InvocationType="Event",
            Payload=json.dumps(response)
        )
    except Exception as e:
        logger.error(e)

if __name__ == "__main__":
    run_code()