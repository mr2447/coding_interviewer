# API Gateway CORS Configuration Guide

## The Problem

Your `/hint` endpoint requires Cognito authentication (`security: - CognitoAuthorizer: []`), but OPTIONS preflight requests don't include auth headers. API Gateway is rejecting OPTIONS requests before they reach Lambda.

## Solution: Configure OPTIONS Method Without Auth

You need to configure API Gateway to allow OPTIONS requests without authentication.

### Option 1: AWS Console (Recommended)

1. **Go to API Gateway Console**
   - Navigate to your API: `https://console.aws.amazon.com/apigateway/`
   - Select your API
   - Go to `/hint` resource

2. **Add OPTIONS Method**
   - Click "Actions" → "Create Method"
   - Select "OPTIONS" from dropdown
   - Click the checkmark

3. **Configure OPTIONS Integration**
   - Integration type: **Lambda Function**
   - Use Lambda Proxy integration: **Yes**
   - Lambda Function: Select your hint Lambda function
   - Click "Save" and confirm

4. **Remove Auth from OPTIONS**
   - Click on the OPTIONS method
   - Click "Method Request"
   - Under "Authorization": Change from "AWS_IAM" or "Cognito User Pool" to **"NONE"**
   - Click the checkmark to save

5. **Deploy**
   - Click "Actions" → "Deploy API"
   - Select your deployment stage (e.g., "prod")
   - Click "Deploy"

### Option 2: Update API Spec (If Using Import)

Add an explicit OPTIONS method to your `api-spec.yaml`:

```yaml
  /hint:
    options:
      summary: CORS preflight for hint endpoint
      operationId: hintOptions
      # NO security - OPTIONS must be public
      responses:
        '200':
          description: CORS preflight response
          headers:
            Access-Control-Allow-Origin:
              schema:
                type: string
                example: "*"
            Access-Control-Allow-Methods:
              schema:
                type: string
                example: "POST,OPTIONS"
            Access-Control-Allow-Headers:
              schema:
                type: string
                example: "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token"
      x-amazon-apigateway-integration:
        type: aws_proxy
        httpMethod: POST
        uri: arn:aws:apigateway:us-east-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-2:YOUR_ACCOUNT:function:hintGenerationFunction/invocations
    post:
      # ... existing POST configuration ...
```

### Option 3: CloudFormation/SAM Template

If using Infrastructure as Code, add:

```yaml
HintOptionsMethod:
  Type: AWS::ApiGateway::Method
  Properties:
    RestApiId: !Ref YourApi
    ResourceId: !Ref HintResource
    HttpMethod: OPTIONS
    AuthorizationType: NONE  # No auth for OPTIONS
    Integration:
      Type: AWS_PROXY
      IntegrationHttpMethod: POST
      Uri: !Sub arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${HintLambdaFunction}/invocations
```

## Verify Configuration

After setup, test with:

```bash
curl -X OPTIONS https://4eqiod3qn4.execute-api.us-east-2.amazonaws.com/prod/hint \
  -H "Origin: http://localhost:5174" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

You should get:
- Status: 200 OK
- Headers include: `Access-Control-Allow-Origin: *`

## Important Notes

1. **OPTIONS must be public** - Preflight requests cannot include auth headers
2. **POST still requires auth** - Only OPTIONS bypasses authentication
3. **Lambda handles both** - Your Lambda code already handles OPTIONS requests
4. **Deploy after changes** - Always deploy API Gateway after configuration changes

## Current Lambda Code Status

Your `hint_lambda_fixed.py` already handles OPTIONS correctly:
- Detects `httpMethod == "OPTIONS"`
- Returns 200 with CORS headers
- No processing needed for preflight

The issue is purely API Gateway configuration blocking OPTIONS before it reaches Lambda.

