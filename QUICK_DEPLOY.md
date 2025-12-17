# Quick Deployment Reference

## Prerequisites Check
```bash
aws --version          # Should be installed
aws sts get-caller-identity  # Should show your AWS account
node --version         # Should be v16+
npm --version          # Should be installed
```

## Quick Start (5 Steps)

### 1. Create `.env` file
Create a `.env` file in the project root with:
```bash
VITE_AWS_REGION=us-east-2
VITE_COGNITO_USER_POOL_ID=us-east-2_jSbGE8cJ3
VITE_COGNITO_CLIENT_ID=your-client-id
VITE_API_GATEWAY_URL=https://your-api-id.execute-api.us-east-2.amazonaws.com/prod
VITE_WEBSOCKET_URL=https://your-websocket-id.execute-api.us-east-2.amazonaws.com/prod
```

### 2. Deploy Infrastructure
```bash
aws cloudformation create-stack \
  --stack-name frontend-deployment \
  --template-body file://frontend-deployment.yaml \
  --parameters ParameterKey=BucketName,ParameterValue=coding-interviewer-frontend-YOUR-UNIQUE-ID \
  --region us-east-2

# Wait for completion (5-10 minutes)
aws cloudformation wait stack-create-complete \
  --stack-name frontend-deployment \
  --region us-east-2
```

### 3. Build Frontend
```bash
npm install
npm run build
```

### 4. Deploy to S3
```bash
./deploy-frontend.sh
```

### 5. Get Your URL
```bash
aws cloudformation describe-stacks \
  --stack-name frontend-deployment \
  --region us-east-2 \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' \
  --output text
```

## Updating Deployment

After making changes to your code:
```bash
npm run build
./deploy-frontend.sh
```

## Getting Environment Variable Values

| Variable | Where to Find |
|----------|---------------|
| `VITE_COGNITO_USER_POOL_ID` | Cognito Console → User Pools → Your Pool → Pool ID |
| `VITE_COGNITO_CLIENT_ID` | Cognito Console → User Pools → Your Pool → App integration → App clients |
| `VITE_API_GATEWAY_URL` | API Gateway Console → REST APIs → Your API → Stages → prod → Invoke URL |
| `VITE_WEBSOCKET_URL` | API Gateway Console → WebSocket APIs → Your API → Stages → prod → WebSocket URL (use HTTPS format) |

## Common Issues

**"Bucket name already exists"**: Use a unique bucket name (add random suffix)

**"Access Denied"**: Check bucket policy allows public read

**"404 on routes"**: Ensure CloudFront has custom error responses (404→200→/index.html)

**"CORS errors"**: Verify API Gateway CORS settings and VITE_API_GATEWAY_URL

For detailed troubleshooting, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

