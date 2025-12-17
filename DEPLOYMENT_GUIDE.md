# Frontend Deployment Guide

This guide walks you through deploying the React frontend application to AWS S3 and CloudFront.

## Prerequisites

1. **AWS CLI installed and configured**
   ```bash
   aws --version
   aws configure
   ```

2. **Node.js and npm installed**
   ```bash
   node --version
   npm --version
   ```

3. **AWS Account with appropriate permissions**
   - S3 (create bucket, upload files)
   - CloudFormation (create/update stacks)
   - CloudFront (create distribution, invalidate cache)
   - IAM (create roles and policies)

## Step 1: Set Environment Variables

Before building, you need to configure environment variables for your frontend. Create a `.env` file in the project root:

```bash
# .env file
VITE_AWS_REGION=us-east-2
VITE_COGNITO_USER_POOL_ID=us-east-2_jSbGE8cJ3
VITE_COGNITO_CLIENT_ID=your-client-id-here
VITE_API_GATEWAY_URL=https://your-api-id.execute-api.us-east-2.amazonaws.com/prod
VITE_WEBSOCKET_URL=https://your-websocket-api-id.execute-api.us-east-2.amazonaws.com/prod
```

### How to Get These Values:

1. **VITE_AWS_REGION**: Your AWS region (e.g., `us-east-2`)

2. **VITE_COGNITO_USER_POOL_ID**: 
   - Go to AWS Cognito Console
   - Find your User Pool
   - Copy the User Pool ID (format: `us-east-2_xxxxx`)

3. **VITE_COGNITO_CLIENT_ID**:
   - In the same User Pool, go to "App integration" → "App clients"
   - Copy the Client ID

4. **VITE_API_GATEWAY_URL**:
   - Go to API Gateway Console
   - Find your REST API
   - Copy the Invoke URL (format: `https://xxxxx.execute-api.region.amazonaws.com/stage`)
   - This should be the base URL without any path (e.g., `https://abc123.execute-api.us-east-2.amazonaws.com/prod`)

5. **VITE_WEBSOCKET_URL**:
   - Go to API Gateway Console
   - Find your WebSocket API
   - Copy the WebSocket URL (format: `wss://xxxxx.execute-api.region.amazonaws.com/stage`)
   - Use the HTTPS format: `https://xxxxx.execute-api.region.amazonaws.com/prod`
   - The frontend will automatically convert it to `wss://` for WebSocket connections

## Step 2: Deploy Infrastructure (S3 + CloudFront)

### Option A: Using CloudFormation (Recommended)

1. **Create the CloudFormation stack**:
   ```bash
   aws cloudformation create-stack \
     --stack-name frontend-deployment \
     --template-body file://frontend-deployment.yaml \
     --parameters ParameterKey=BucketName,ParameterValue=coding-interviewer-frontend \
     --region us-east-2
   ```

   **Note**: Replace `coding-interviewer-frontend` with a globally unique bucket name (S3 bucket names must be unique across all AWS accounts).

2. **Wait for stack creation** (takes 5-10 minutes):
   ```bash
   aws cloudformation wait stack-create-complete \
     --stack-name frontend-deployment \
     --region us-east-2
   ```

3. **Get the outputs**:
   ```bash
   aws cloudformation describe-stacks \
     --stack-name frontend-deployment \
     --region us-east-2 \
     --query 'Stacks[0].Outputs'
   ```

### Option B: Manual Setup (Alternative)

If you prefer to create resources manually:

1. **Create S3 Bucket**:
   - Go to S3 Console
   - Create bucket with a unique name
   - Enable "Static website hosting"
   - Set index document: `index.html`
   - Set error document: `index.html`
   - Make bucket public (or use CloudFront OAI)

2. **Create CloudFront Distribution**:
   - Go to CloudFront Console
   - Create distribution
   - Origin: Your S3 bucket
   - Default root object: `index.html`
   - Add custom error responses:
     - 404 → 200 → `/index.html`
     - 403 → 200 → `/index.html`

## Step 3: Build the Frontend

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Build the project**:
   ```bash
   npm run build
   ```

   This creates a `dist/` directory with optimized production files.

## Step 4: Deploy to S3

### Option A: Using the Deployment Script (Recommended)

1. **Make the script executable**:
   ```bash
   chmod +x deploy-frontend.sh
   ```

2. **Set environment variables** (optional):
   ```bash
   export STACK_NAME=frontend-deployment
   export BUCKET_NAME=coding-interviewer-frontend
   export AWS_REGION=us-east-2
   ```

3. **Run the deployment script**:
   ```bash
   ./deploy-frontend.sh
   ```

   The script will:
   - Build the frontend
   - Upload files to S3
   - Invalidate CloudFront cache
   - Display the deployment URL

### Option B: Manual Upload

1. **Upload files to S3**:
   ```bash
   aws s3 sync dist/ s3://your-bucket-name \
     --region us-east-2 \
     --delete \
     --cache-control "public, max-age=31536000, immutable" \
     --exclude "*.html" \
     --exclude "*.json"
   ```

2. **Upload HTML files with shorter cache**:
   ```bash
   aws s3 sync dist/ s3://your-bucket-name \
     --region us-east-2 \
     --exclude "*" \
     --include "*.html" \
     --include "*.json" \
     --cache-control "public, max-age=0, must-revalidate"
   ```

3. **Invalidate CloudFront cache** (if using CloudFront):
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id YOUR_DISTRIBUTION_ID \
     --paths "/*"
   ```

## Step 5: Verify Deployment

1. **Get your CloudFront URL**:
   ```bash
   aws cloudformation describe-stacks \
     --stack-name frontend-deployment \
     --region us-east-2 \
     --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' \
     --output text
   ```

2. **Open the URL in your browser** and verify:
   - The app loads correctly
   - Authentication works (login/register)
   - API calls are successful (check browser console)
   - WebSocket connections work (check browser console)

## Step 6: Update Environment Variables for Production

Since environment variables are baked into the build at compile time, you need to rebuild and redeploy whenever you change them:

1. Update `.env` file with new values
2. Rebuild: `npm run build`
3. Redeploy: `./deploy-frontend.sh`

## Troubleshooting

### Issue: "Access Denied" when accessing S3 bucket

**Solution**: Ensure the bucket policy allows public read access. The CloudFormation template includes this, but if you created the bucket manually, add:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

### Issue: React Router routes return 404

**Solution**: Ensure CloudFront has custom error responses configured:
- 404 → 200 → `/index.html`
- 403 → 200 → `/index.html`

This allows React Router to handle client-side routing.

### Issue: CORS errors when calling API Gateway

**Solution**: 
1. Check that API Gateway has CORS enabled
2. Verify the `VITE_API_GATEWAY_URL` is correct
3. Check browser console for specific CORS error messages

### Issue: WebSocket connection fails

**Solution**:
1. Verify `VITE_WEBSOCKET_URL` is set correctly (use HTTPS format, not WSS)
2. Check that the WebSocket API Gateway is deployed
3. Verify the WebSocket API has proper permissions
4. Check browser console for connection errors

### Issue: Environment variables not working

**Solution**:
- Vite requires environment variables to be prefixed with `VITE_`
- Rebuild the project after changing `.env` file
- Check that `.env` file is in the project root
- Verify variable names match exactly (case-sensitive)

## Custom Domain Setup (Optional)

To use a custom domain:

1. **Request an ACM certificate** (must be in `us-east-1` for CloudFront):
   ```bash
   aws acm request-certificate \
     --domain-name example.com \
     --validation-method DNS \
     --region us-east-1
   ```

2. **Validate the certificate** (add DNS records as instructed)

3. **Update CloudFormation stack**:
   ```bash
   aws cloudformation update-stack \
     --stack-name frontend-deployment \
     --template-body file://frontend-deployment.yaml \
     --parameters \
       ParameterKey=BucketName,ParameterValue=coding-interviewer-frontend \
       ParameterKey=DomainName,ParameterValue=example.com \
       ParameterKey=CertificateArn,ParameterValue=arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT_ID \
     --region us-east-2
   ```

4. **Create Route53 record** pointing to CloudFront distribution

## Continuous Deployment

For automated deployments, you can:

1. **Use GitHub Actions** or **GitLab CI/CD** to run the deployment script on push
2. **Set up AWS CodePipeline** for automated builds and deployments
3. **Use AWS Amplify** for a fully managed CI/CD solution

## Cost Estimation

- **S3**: ~$0.023 per GB storage + $0.005 per 1,000 requests
- **CloudFront**: ~$0.085 per GB data transfer (first 10TB)
- **Total**: Very low cost for small to medium traffic (< $10/month typically)

## Security Best Practices

1. **Use CloudFront** instead of direct S3 website hosting for better security
2. **Enable HTTPS** (CloudFront provides free SSL certificates)
3. **Use Origin Access Identity (OAI)** to restrict S3 access to CloudFront only
4. **Set up WAF** rules if needed for additional protection
5. **Monitor CloudWatch** for access patterns and potential issues

## Next Steps

After deployment:
1. Test all features thoroughly
2. Set up monitoring and alerts
3. Configure custom domain (if needed)
4. Set up CI/CD for automated deployments
5. Review and optimize CloudFront caching rules

