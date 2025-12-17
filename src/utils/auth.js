import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js';
import { awsConfig } from '../config/aws-config';

// Initialize Cognito User Pool
const userPool = new CognitoUserPool({
  UserPoolId: awsConfig.userPoolId,
  ClientId: awsConfig.userPoolWebClientId,
});

/**
 * Register a new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<CognitoUser>}
 */
export const signUp = (email, password) => {
  return new Promise((resolve, reject) => {
    const attributeList = [
      new CognitoUserAttribute({
        Name: 'email',
        Value: email,
      }),
    ];

    userPool.signUp(email, password, attributeList, null, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result.user);
    });
  });
};

/**
 * Confirm user registration with verification code
 * @param {string} email - User email
 * @param {string} code - Verification code from email
 * @returns {Promise<void>}
 */
export const confirmSignUp = (email, code) => {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.confirmRegistration(code, true, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
};

/**
 * Resend verification code to user's email
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
export const resendConfirmationCode = (email) => {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.resendConfirmationCode((err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
};

/**
 * Sign in an existing user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{accessToken: string, idToken: string, refreshToken: string}>}
 */
export const signIn = (email, password) => {
  return new Promise((resolve, reject) => {
    const authenticationDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result) => {
        resolve({
          accessToken: result.getAccessToken().getJwtToken(),
          idToken: result.getIdToken().getJwtToken(),
          refreshToken: result.getRefreshToken().getToken(),
        });
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
};

/**
 * Sign out the current user
 */
export const signOut = () => {
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) {
    cognitoUser.signOut();
  }
};

/**
 * Get the current authenticated user
 * @returns {Promise<CognitoUser|null>}
 */
export const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
      resolve(null);
      return;
    }

    cognitoUser.getSession((err, session) => {
      if (err) {
        reject(err);
        return;
      }

      if (!session.isValid()) {
        resolve(null);
        return;
      }

      resolve(cognitoUser);
    });
  });
};

/**
 * Get user attributes (email, username, etc.)
 * @param {CognitoUser} cognitoUser
 * @returns {Promise<Object>}
 */
export const getUserAttributes = (cognitoUser) => {
  return new Promise((resolve, reject) => {
    cognitoUser.getUserAttributes((err, attributes) => {
      if (err) {
        reject(err);
        return;
      }

      const userAttributes = {};
      attributes.forEach((attr) => {
        userAttributes[attr.Name] = attr.Value;
      });

      resolve(userAttributes);
    });
  });
};

/**
 * Decode JWT token to extract claims
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

/**
 * Get current user info (email, username, and userId/sub)
 * @returns {Promise<{email: string, username: string, userId: string}|null>}
 */
export const getCurrentUserInfo = async () => {
  try {
    const cognitoUser = await getCurrentUser();
    if (!cognitoUser) {
      return null;
    }

    const attributes = await getUserAttributes(cognitoUser);
    const username = cognitoUser.getUsername();
    const email = attributes.email || username;

    // Extract userId (sub claim) from ID token - this is the unique, immutable user ID
    // The 'sub' (subject) claim in Cognito tokens is the unique user identifier
    let userId = username; // Fallback to username if we can't get the token
    try {
      // Get session to extract ID token
      const session = await new Promise((resolve, reject) => {
        cognitoUser.getSession((err, sess) => {
          if (err) reject(err);
          else resolve(sess);
        });
      });

      if (session && session.isValid()) {
        const idToken = session.getIdToken().getJwtToken();
        const decodedToken = decodeJWT(idToken);
        if (decodedToken && decodedToken.sub) {
          userId = decodedToken.sub; // Use Cognito sub (subject) as userId
        }
      }
    } catch (error) {
      // If we can't get the token, fall back to username
      console.warn('Could not extract userId from ID token, using username as fallback:', error);
    }

    return {
      email,
      username,
      userId, // This is the Cognito sub (unique user ID) if available, otherwise username
    };
  } catch (error) {
    console.error('Error getting current user info:', error);
    return null;
  }
};

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>}
 */
export const isAuthenticated = async () => {
  try {
    const cognitoUser = await getCurrentUser();
    return cognitoUser !== null;
  } catch (error) {
    return false;
  }
};

/**
 * Get the current Cognito ID token (JWT).
 * Returns null if no user/session is available.
 */
export const getIdToken = async () => {
  const cognitoUser = await getCurrentUser();
  if (!cognitoUser) {
    return null;
  }

  const session = await new Promise((resolve, reject) => {
    cognitoUser.getSession((err, sess) => {
      if (err) reject(err);
      else resolve(sess);
    });
  });

  if (!session || !session.isValid()) {
    return null;
  }

  return session.getIdToken().getJwtToken();
};

