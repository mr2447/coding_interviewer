// AWS Cognito Configuration
// Replace these with your actual Cognito User Pool values

export const awsConfig = {
  region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
  userPoolWebClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
};

// Validate configuration
if (!awsConfig.userPoolId || !awsConfig.userPoolWebClientId) {
  console.warn(
    'AWS Cognito configuration is incomplete. Please set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID environment variables.'
  );
}

