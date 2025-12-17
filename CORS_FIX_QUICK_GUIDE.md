# CORS Error - Quick Fix Guide

## Root Cause

**API Gateway is blocking OPTIONS requests** because your `/hint` endpoint requires Cognito authentication, but preflight requests don't include auth headers.

## The Fix (2 Steps)

### Step 1: Configure API Gateway (REQUIRED)

**In AWS Console:**

1. Go to API Gateway → Your API → `/hint` resource
2. **Add OPTIONS method** (if not exists):
   - Actions → Create Method → OPTIONS
3. **Configure OPTIONS:**
   - Integration: Lambda Function (same as POST)
   - Use Lambda Proxy: Yes
4. **Remove Auth from OPTIONS:**
   - Click OPTIONS method → Method Request
   - Change Authorization from "Cognito User Pool" to **"NONE"**
5. **Deploy:**
   - Actions → Deploy API → Select "prod" → Deploy

### Step 2: Deploy Updated Lambda (Already Done)

Your `hint_lambda_fixed.py` already handles OPTIONS correctly. Just deploy it:

```bash
# Zip and upload to Lambda
zip hint-lambda.zip hint_lambda_fixed.py
# Upload via AWS Console or CLI
```

## Why This Happens

```
Browser → OPTIONS (no auth) → API Gateway → ❌ BLOCKED (requires auth)
Browser → POST (with auth) → API Gateway → ✅ Allowed
```

**After fix:**
```
Browser → OPTIONS (no auth) → API Gateway → ✅ Allowed (OPTIONS has no auth)
Browser → POST (with auth) → API Gateway → ✅ Allowed (POST still requires auth)
```

## Test After Fix

```bash
# Test OPTIONS (should return 200)
curl -X OPTIONS https://4eqiod3qn4.execute-api.us-east-2.amazonaws.com/prod/hint \
  -H "Origin: http://localhost:5174" \
  -v
```

## Summary

- ✅ Lambda code is correct (handles OPTIONS)
- ❌ API Gateway blocks OPTIONS (needs configuration)
- ✅ Fix: Allow OPTIONS without authentication in API Gateway

