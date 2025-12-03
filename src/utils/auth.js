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
 * Get current user info (email and username)
 * @returns {Promise<{email: string, username: string}|null>}
 */
export const getCurrentUserInfo = async () => {
  try {
    const cognitoUser = await getCurrentUser();
    if (!cognitoUser) {
      return null;
    }

    const attributes = await getUserAttributes(cognitoUser);
    return {
      email: attributes.email || cognitoUser.getUsername(),
      username: cognitoUser.getUsername(),
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

