# Complete API Spec vs Frontend vs Lambda Comparison

## API Spec (`api-spec.yaml` lines 140-246)

### Request Body (Required Fields)
- ✅ `userId` (string, required) - Cognito user ID
- ✅ `qid` (integer, required) - Question ID
- ✅ `user_code` (string, required) - Current code in editor

### Request Body (Optional Fields)
- ✅ `thread_id` (string, nullable) - Conversation state identifier
- ✅ `test_results_summary` (object, nullable) - Execution history
  - `status` (enum: "Passed" | "Failed")
  - `first_failed_test` (object, nullable)
    - `input` (string)
    - `expected` (string)
    - `actual` (string)
- ✅ `question_desc` (string, nullable) - Full question description

### Response (200 OK)
- ✅ `hint` (string) - Generated hint text
- ✅ `thread_id` (string) - Conversation thread identifier

---

## Frontend (`src/utils/api.js` lines 106-144)

### Sends:
```javascript
{
  userId: userId,                    // ✅ Matches spec
  qid: qid,                          // ✅ Matches spec
  thread_id: threadId || null,       // ✅ Matches spec
  user_code: userCode,               // ✅ Matches spec
  test_results_summary: testResultsSummary || null,  // ✅ Matches spec
  question_desc: questionDesc || null  // ✅ Matches spec
}
```

### Expects Response:
```javascript
{
  hint: string,                      // ✅ Matches spec
  thread_id: string                  // ✅ Matches spec
}
```

**Status: ✅ Frontend PERFECTLY matches API spec**

---

## Lambda Function (Your Current Code)

### Currently Expects:
```python
body = event.get("body")  # Needs parsing if string
user_code = body.get("user_code")  # ✅ Matches spec
test_results = body.get("test_results_summary", None)  # ✅ Matches spec
prev_id = body.get("thread_id", None)  # ✅ Matches spec
question_description = body.get("question_desc", None)  # ✅ Matches spec
# user_name = body.get("user_name")  # ❌ NOT IN SPEC!
```

### Currently Returns:
```python
{
  "hint": hint,           # ✅ Matches spec
  "thread_id": thread_id  # ✅ Matches spec
}
```

**Status: ⚠️ Lambda has issues**

---

## Issues Found

### 1. ❌ Field Name Mismatch
- **API Spec**: `userId` (required)
- **Frontend**: `userId` ✅
- **Lambda**: Expects `user_name` ❌ (not even used in lambda code, but docstring mentions it)

### 2. ⚠️ Body Parsing
- **API Gateway Lambda Proxy**: Body comes as JSON string
- **Lambda**: Uses `event.get("body")` but doesn't handle string parsing
- **Fix Needed**: Parse JSON string if body is a string

### 3. ✅ Response Format
- Lambda response format matches API spec perfectly!

### 4. ℹ️ Unused Field
- `qid` is sent by frontend and required by spec, but lambda doesn't use it
- This is fine - lambda can receive it without using it

---

## Summary

| Component | Status | Notes |
|-----------|--------|-------|
| **API Spec** | ✅ Reference | Defines the contract |
| **Frontend** | ✅ Perfect | Matches API spec exactly |
| **Lambda** | ⚠️ Needs Fix | Missing body parsing, docstring mentions wrong field |

---

## Required Lambda Fixes

1. ✅ Parse body if it's a JSON string (API Gateway format)
2. ✅ Remove reference to `user_name` (not in spec)
3. ✅ Add proper error handling
4. ✅ Add CORS headers to responses
5. ✅ Validate required fields (`user_code`)

The fixed lambda in `hint_lambda_fixed.py` addresses all these issues.

