#!/bin/bash

# Deployment script for React frontend to AWS S3 + CloudFront
# This script builds the frontend and uploads it to S3

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
STACK_NAME="${STACK_NAME:-frontend-deployment}"
BUCKET_NAME="${BUCKET_NAME:-coding-interviewer-frontend}"
REGION="${AWS_REGION:-us-east-2}"
DIST_DIR="./dist"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if user is authenticated
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS credentials not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

echo -e "${GREEN}Starting frontend deployment...${NC}"

# Step 1: Check if CloudFormation stack exists
echo -e "${YELLOW}Step 1: Checking CloudFormation stack...${NC}"
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" &> /dev/null; then
    echo -e "${GREEN}Stack '$STACK_NAME' exists.${NC}"
    # Get bucket name from stack outputs
    BUCKET_NAME=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
        --output text)
    echo -e "${GREEN}Using bucket: $BUCKET_NAME${NC}"
else
    echo -e "${YELLOW}Stack '$STACK_NAME' does not exist. Creating it...${NC}"
    echo -e "${YELLOW}Please deploy the CloudFormation template first:${NC}"
    echo -e "${YELLOW}  aws cloudformation create-stack \\${NC}"
    echo -e "${YELLOW}    --stack-name $STACK_NAME \\${NC}"
    echo -e "${YELLOW}    --template-body file://frontend-deployment.yaml \\${NC}"
    echo -e "${YELLOW}    --parameters ParameterKey=BucketName,ParameterValue=$BUCKET_NAME \\${NC}"
    echo -e "${YELLOW}    --region $REGION${NC}"
    exit 1
fi

# Step 2: Build the frontend
echo -e "${YELLOW}Step 2: Building frontend...${NC}"
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Are you in the project root?${NC}"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Build the project
echo -e "${YELLOW}Running npm run build...${NC}"
npm run build

if [ ! -d "$DIST_DIR" ]; then
    echo -e "${RED}Error: Build failed. '$DIST_DIR' directory not found.${NC}"
    exit 1
fi

echo -e "${GREEN}Build completed successfully!${NC}"

# Step 3: Upload to S3
echo -e "${YELLOW}Step 3: Uploading files to S3 bucket '$BUCKET_NAME'...${NC}"

# Sync files to S3 (delete removed files, exclude node_modules)
aws s3 sync "$DIST_DIR" "s3://$BUCKET_NAME" \
    --region "$REGION" \
    --delete \
    --exclude "node_modules/*" \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "*.html" \
    --exclude "*.json"

# Upload HTML files with shorter cache (for index.html)
aws s3 sync "$DIST_DIR" "s3://$BUCKET_NAME" \
    --region "$REGION" \
    --exclude "*" \
    --include "*.html" \
    --include "*.json" \
    --cache-control "public, max-age=0, must-revalidate"

echo -e "${GREEN}Files uploaded successfully!${NC}"

# Step 4: Invalidate CloudFront cache
echo -e "${YELLOW}Step 4: Invalidating CloudFront cache...${NC}"
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
    --output text)

if [ -n "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "None" ]; then
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id "$DISTRIBUTION_ID" \
        --paths "/*" \
        --query 'Invalidation.Id' \
        --output text)
    echo -e "${GREEN}CloudFront invalidation created: $INVALIDATION_ID${NC}"
    echo -e "${YELLOW}Note: Cache invalidation may take a few minutes to complete.${NC}"
else
    echo -e "${YELLOW}No CloudFront distribution found. Skipping cache invalidation.${NC}"
fi

# Step 5: Get the CloudFront URL
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' \
    --output text)

if [ -n "$CLOUDFRONT_URL" ] && [ "$CLOUDFRONT_URL" != "None" ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Deployment completed successfully!${NC}"
    echo -e "${GREEN}Your app is available at:${NC}"
    echo -e "${GREEN}$CLOUDFRONT_URL${NC}"
    echo -e "${GREEN}========================================${NC}"
else
    S3_URL="http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Deployment completed successfully!${NC}"
    echo -e "${GREEN}Your app is available at:${NC}"
    echo -e "${GREEN}$S3_URL${NC}"
    echo -e "${YELLOW}Note: For production, use CloudFront URL instead.${NC}"
    echo -e "${GREEN}========================================${NC}"
fi

