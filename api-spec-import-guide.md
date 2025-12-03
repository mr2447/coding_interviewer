# API Gateway Swagger/OpenAPI Import Guide

## Quick Import Steps

### Option 1: Import without Lambda integrations (Recommended for first time)

The `api-spec.yaml` file creates the API structure (paths, methods, request/response schemas) but **doesn't include Lambda integrations**. This is safer because:

1. It creates the resources and methods
2. You manually configure Lambda integrations (fewer ARN issues)
3. Less chance of import errors

**Steps:**

1. Open AWS Console → API Gateway
2. Click **Create API** → Select **REST API** → Click **Import**
3. Upload `api-spec.yaml` or paste its contents
4. Click **Import**
5. After import, configure Lambda integrations manually for each method:
   - Click on `/submit` → `POST` method
   - Integration type: **Lambda Function**
   - Check **Use Lambda Proxy integration**
   - Select your Lambda function
   - Repeat for `/hints` (POST) and `/questions` (GET)

### Option 2: Import with Lambda ARNs (Advanced)

If you want everything in one go, you need to **replace the placeholder ARNs** in `api-spec.yaml` first.

**Before importing, edit `api-spec.yaml`:**

Replace these three placeholders with your actual Lambda ARNs:

```yaml
# Find these lines (around line 90, 150, 220):
uri: arn:aws:apigateway:{region}:lambda:path/2015-03-31/functions/{codeSubmissionFunctionArn}/invocations

# Replace with your actual ARNs, for example:
uri: arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123456789012:function:codeSubmissionFunction/invocations
```

**Find your Lambda ARNs:**

```bash
# Using AWS CLI:
aws lambda list-functions --query 'Functions[*].[FunctionName,FunctionArn]' --output table

# Or in AWS Console:
# Lambda → Functions → Click function name → Configuration tab → ARN
```

Then follow Option 1 steps, but after import, Lambda integrations should already be configured.

---

## After Import

1. **Enable CORS** on all resources (`/submit`, `/hints`, `/questions`)
   - Select each resource → Actions → Enable CORS
   - Use default settings or customize

2. **Deploy the API**
   - Actions → Deploy API
   - Stage: `prod` (or create new stage)
   - Note the Invoke URL

3. **Update your `.env` file:**
   ```
   VITE_API_GATEWAY_URL=https://YOUR_API_ID.execute-api.REGION.amazonaws.com/prod
   ```

## Notes

- The Swagger file includes full request/response schemas matching your frontend code
- User ID is sent in request body for `/submit`, but should come from Cognito JWT for other endpoints (backend handles this)
- CORS is configured in the spec but you may need to enable it in console after import

