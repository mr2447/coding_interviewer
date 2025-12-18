import boto3
import json
import os
import logging
import sys
import subprocess
import time

from markdown_it.common.html_re import declaration

# setup logger
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger()

# setup lambda client
client = boto3.client("lambda")

# Strings to add to user code before running
IMPORTS = """
#include <iostream>
#include<vector>
using namespace std;

"""
#This stores overrides for the << operator in c++. For now,
#we are only using this for the vector class.
OVERRIDES = """
template<typename T>
ostream& operator<<(ostream& os, const vector<T>& v)
{
    os << "[";
    if(v.size() > 0)
        os << v[0];
    for(size_t i = 1; i < v.size(); i++)
        os << ", " << v[i];
    os << "]";
    return os;
}

"""

def handle_list(val):
    if len(val) == 0:
        return "{}"
    first = True
    test_case = "{"
    for i in range(0, len(val)):
        if first:
            first = False
        else:
            test_case += ", "
        if isinstance(val[i], list):
            test_case += handle_list(val)
        else:
            test_case += str(val[i])
    test_case += "}"
    return test_case

def parse_test_case(raw_test_case):
    logger.info(raw_test_case)
    test_case = ""
    first = True
    for val in raw_test_case.values():
        if first:
            first = False
        else:
            test_case += ", "
        #Currently only handling lists and literal values
        if isinstance(val, list):
            test_case += handle_list(val)
        else:
            test_case += str(val)
    return test_case

def get_cpp_type(val):
    if isinstance(val, bool):
        return "bool"
    if isinstance(val, int):
        return "int"
    if isinstance(val, str):
        return "string"
    if isinstance(val, list):
        # If the list is empty, we will assume that base type is int.
        # Will need to be fixed later.
        if len(val) == 0:
            return "vector<int>"
        # Recursive step: Get the type of the first element
        inner_type = get_cpp_type(val[0])
        return f"vector<{inner_type}>"
    return "auto"

def run_code():
    payload = json.loads(os.environ["PAYLOAD"])
    logger.info("Payload: %s", json.dumps(payload))

    func_name = f"{payload["func_name"]}("
    failed_case = 0
    failed_output = ""
    expected_output = ""
    failed_returncode = 0

    start = time.time()
    for i, case in enumerate(payload["test_cases"], 1):
        declarations = ""
        arg_names = []
        #create arguments line by line
        for idx, val in enumerate(case["input"].values()):
            var_name = f"arg{idx}"
            cpp_type = get_cpp_type(val)

            val_str = ""
            if isinstance(val, list):
                val_str = handle_list(val)
            elif isinstance(val, bool):
                val_str = "1" if val else "0"
            else:
                val_str = str(val)

            declarations += f" {cpp_type} {var_name} = {val_str};\n"
            arg_names.append(var_name)
        # Joins args for the function call
        args_str = ", ".join(arg_names)
        #contsruct main function
        main_body = f"""
        int main() {{
            Solution sol;
        {declarations}
            cout << sol.{func_name}({args_str});
            return 0;
        }}
        """
        full_script = IMPORTS + OVERRIDES + payload["code"] + main_body;
        logger.info(json.dumps({"script": full_script}))

        if os.path.exists("submission.cpp"):
            os.remove("submission.cpp")
        with open("submission.cpp", "w") as f:
            f.write(full_script)

        #compile c++ file
        compile_proc = subprocess.run(
            ["g++", "-O2", "submission.cpp", "-o", "submission"],
            capture_output = True,
            text = True)

        if compile_proc.returncode != 0:
            logger.info(f"result.stderr: {compile_proc.stderr}")
            failed_output = compile_proc.stderr
            failed_case = i
            failed_returncode = compile_proc.returncode
            expected_output = str(case["expected_output"])
            break
        run_proc = subprocess.run(
            ["./submission"],
            capture_output = True,
            text = True,
            timeout = 30
        )

        os.remove("submission.cpp")
        os.remove("submission")

        # check if output matches
        logger.info(f"Actual output: {run_proc.stdout}")
        logger.info(f"Expected output: {case["expected_output"]}")
        expected_output = str(case["expected_output"])
        if expected_output == "True":
            expected_output = "1"
        elif expected_output == "False":
            expected_output = "0"

        if run_proc.stdout != expected_output:
            if run_proc.returncode == 0:
                failed_output = run_proc.stdout
            else:
                failed_output = run_proc.stderr
            failed_case = i
            failed_returncode = run_proc.returncode
            expected_output = str(case["expected_output"])
            break
        i += 1

    #Format response
    runtime = time.time() - start
    if failed_case == 0:
        response = {"success": True,
                    "runtime": runtime,
                    "user_id": payload["cid"]}
    else:
        response = {"success": False,
                    "failed_case": failed_case,
                    "output": failed_output,
                    "expected_output": expected_output,
                    "user_id": payload["cid"]}

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