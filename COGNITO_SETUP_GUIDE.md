# AWS Cognito Setup Guide - Step by Step

This guide will walk you through creating an AWS Cognito User Pool and getting the required configuration values.

## Prerequisites

- An AWS account
- Access to AWS Console with permissions to create Cognito resources
- Your AWS region (you have `us-east-2` configured)

---

## Step 1: Sign in to AWS Console

1. Go to [https://aws.amazon.com/console/](https://aws.amazon.com/console/)
2. Click **Sign In to the Console**
3. Enter your AWS account credentials

---

## Step 2: Navigate to Amazon Cognito

1. In the AWS Console search bar at the top, type **"Cognito"**
2. Click on **Amazon Cognito** from the search results
3. You should see the Cognito dashboard

---

## Step 3: Create a User Pool

1. Click **Create user pool** button (or "User pools" in the left sidebar, then "Create user pool")
2. Choose **"Cognito user pool"** (not "Federated identity providers")

### Step 3a: Configure sign-in experience

1. Under **Sign-in options**, select:
   - ☑ Email (or Username - choose based on your preference)
   - You can select multiple options if needed
2. Click **Next**

### Step 3b: Configure security requirements

1. **Password policy**: Choose one of the preset options or customize:
   - Default: Minimum 8 characters, requires uppercase, lowercase, numbers, and symbols
   - For development, you might want a simpler policy
2. **Multi-factor authentication**: 
   - For now, select **No MFA** (you can enable later)
3. **User account recovery**: 
   - Select **Enable self-service account recovery**
   - Choose **Email only** for verification
4. Click **Next**

### Step 3c: Configure sign-up experience

1. **Self-service sign-up**: Select **Enable** (allows users to register)
2. **Cognito-assisted verification**: Select **Email** 
3. **Required attributes**: 
   - ☑ Email (should already be checked)
   - Add other attributes if needed (name, phone, etc.)
4. Click **Next**

### Step 3d: Configure message delivery

1. **Email provider**: Choose one:
   - **Send email with Cognito** (default, limited to 50 emails/day for testing)
   - **Send email with Amazon SES** (requires SES setup, higher limits)
2. For development/testing, **Send email with Cognito** is fine
3. Click **Next**

### Step 3e: Integrate your app

1. **User pool name**: Enter a descriptive name, e.g., `coding-interviewer-users`
2. Click **Next**

### Step 3f: Review and create

1. Review all your settings
2. Click **Create user pool** at the bottom
3. Wait for the creation to complete (usually takes 10-30 seconds)

---

## Step 4: Get Your User Pool ID

1. After creation, you'll be taken to the User Pool details page
2. At the top of the page, you'll see **User pool ID**
   - It looks like: `us-east-2_XXXXXXXXX`
   - **COPY THIS VALUE** - This is your `VITE_COGNITO_USER_POOL_ID`

---

## Step 5: Create an App Client

1. In the User Pool details page, scroll down to the left sidebar
2. Click **App integration** (or scroll down to the **App clients** section)
3. You should see **App clients and analytics** section
4. Click **Create app client** or **Add an app client** (if none exist)

### Step 5a: Configure app client

1. **App type**: Select **Public client** (since this is a frontend web app)
2. **App client name**: Enter a name, e.g., `coding-interviewer-web-client`
3. Click **Create app client**

### Step 5b: Get App Client ID

1. After creation, you'll see the **Client ID** displayed
   - It looks like: `1234567890abcdefghijklmn`
   - **COPY THIS VALUE** - This is your `VITE_COGNITO_CLIENT_ID`

2. **Client secret**: You won't see this for public clients (which is correct for web apps)

---

## Step 6: Configure App Client Settings (Optional but Recommended)

1. In the **App integration** tab, scroll to **Hosted UI** section
2. **Allowed callback URLs**: Add your app URLs:
   - For local development: `http://localhost:5173`, `http://localhost:5173/login`
   - For production: `https://yourdomain.com`, `https://yourdomain.com/login`
3. **Allowed sign-out URLs**: Add:
   - `http://localhost:5173` (for local dev)
   - `https://yourdomain.com` (for production)
4. **Allowed OAuth flows**: 
   - ☑ Authorization code grant
   - ☑ Implicit grant (if needed)
5. **Allowed OAuth scopes**:
   - ☑ openid
   - ☑ email
   - ☑ profile
6. Click **Save changes**

---

## Step 7: Update Your .env File

1. Open your `.env` file in the project root
2. Add or update these values:

```env
VITE_AWS_REGION=us-east-2
VITE_COGNITO_USER_POOL_ID=us-east-2_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=1234567890abcdefghijklmn
```

Replace the placeholder values with your actual values from Steps 4 and 5.

---

## Step 8: Verify Configuration

1. Save your `.env` file
2. Restart your development server:
   ```bash
   npm run dev
   ```
3. Check the browser console - you should **NOT** see the warning about incomplete Cognito configuration
4. Try registering a new user to test the setup

---

## Troubleshooting

### Issue: "User pool not found"
- **Solution**: Verify your `VITE_COGNITO_USER_POOL_ID` matches exactly (including the region prefix)
- Make sure you're using the correct region in `VITE_AWS_REGION`

### Issue: "Invalid client ID"
- **Solution**: Verify your `VITE_COGNITO_CLIENT_ID` is correct
- Make sure you copied the Client ID, not the App Client name

### Issue: Emails not sending
- **Solution**: If using Cognito's email service, you're limited to 50 emails/day
- For production, consider setting up Amazon SES

### Issue: CORS errors
- **Solution**: Make sure your callback URLs in Cognito match your app URLs exactly
- Include both with and without trailing slashes if needed

---

## Quick Reference: Where to Find Values

### User Pool ID
- AWS Console → Cognito → User pools → [Your Pool] → General settings tab
- Or in the URL: `/cognito/users?id=us-east-2_XXXXXXXXX`

### Client ID  
- AWS Console → Cognito → User pools → [Your Pool] → App integration → App clients
- Click on your app client name to see the Client ID

### Region
- Your current region: `us-east-2`
- You can find it in the AWS Console top-right corner, or in your User Pool ID prefix

---

## Next Steps

After setup:
1. Test user registration from your app
2. Test user login
3. Verify users appear in Cognito Console → Users tab
4. Consider adding email verification flow if needed
5. Set up production callback URLs before deploying

---

## Security Notes

- Never commit your `.env` file to version control (it should already be in `.gitignore`)
- The Client ID is safe to expose in frontend code
- User Pool ID is safe to expose in frontend code
- For production, consider using environment-specific User Pools

