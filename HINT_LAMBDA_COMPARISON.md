# Hint Lambda Function - Frontend vs Backend Comparison

## Summary
The frontend correctly sends the data according to the API spec, but the lambda function has some issues that need to be fixed.

## Frontend Sends (from `src/utils/api.js`)

```javascript
{
  userId: userId,                    // ✅ Sent
  qid: qid,                          // ✅ Sent (integer)
  thread_id: threadId || null,       // ✅ Sent
  user_code: userCode,               // ✅ Sent
  test_results_summary: testResultsSummary || null,  // ✅ Sent
  question_desc: questionDesc || null  // ✅ Sent
}
```

## Lambda Currently Expects

```python
body = event.get("body")  # Expects API Gateway format
user_code = body.get("user_code")  # ✅ Matches
test_results = body.get("test_results_summary", None)  # ✅ Matches
prev_id = body.get("thread_id", None)  # ✅ Matches
question_description = body.get("question_desc", None)  # ✅ Matches
# user_name = body.get("user_name")  # ❌ NOT SENT BY FRONTEND
```

## Issues Found

### 1. ❌ Missing `user_name` Field
- **Lambda expects**: `user_name` (mentioned in docstring)
- **Frontend sends**: `userId` (matches API spec)
- **Status**: Lambda doesn't actually use `user_name` in the code, so this is not a critical issue, but the docstring is misleading

### 2. ⚠️ Body Parsing Issue
- **Lambda code**: `body = event.get("body")` assumes body might be a string
- **API Gateway Lambda Proxy**: Body is typically a JSON string that needs parsing
- **Status**: Lambda should handle both string and dict formats

### 3. ✅ Field Names Match
- `user_code` ✅
- `test_results_summary` ✅
- `thread_id` ✅
- `question_desc` ✅

### 4. ℹ️ Unused Field
- `qid` is sent by frontend but not used in lambda (this is fine, just informational)

## Fixes Applied in `hint_lambda_fixed.py`

1. ✅ Added proper body parsing (handles both string and dict)
2. ✅ Removed reference to `user_name` (not needed)
3. ✅ Added error handling for JSON parsing
4. ✅ Added validation for required `user_code` field
5. ✅ Added proper error responses with CORS headers
6. ✅ Added try-catch for OpenAI API calls

## Testing Checklist

- [ ] Test with first hint request (no `thread_id`)
- [ ] Test with subsequent hint requests (with `thread_id`)
- [ ] Test with `test_results_summary` present
- [ ] Test with `test_results_summary` null
- [ ] Test with empty `user_code` (should return 400 error)
- [ ] Test error handling for OpenAI API failures

