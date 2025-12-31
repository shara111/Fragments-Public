// src/auth.js

import { UserManager } from 'oidc-client-ts';

// Support runtime configuration via window object, fallback to process.env (for Parcel build)
const AWS_COGNITO_POOL_ID = (typeof window !== 'undefined' && window.AWS_COGNITO_POOL_ID) 
  || process.env.AWS_COGNITO_POOL_ID 
  || 'us-east-1_g5TXlyiPe';

const AWS_COGNITO_CLIENT_ID = (typeof window !== 'undefined' && window.AWS_COGNITO_CLIENT_ID) 
  || process.env.AWS_COGNITO_CLIENT_ID 
  || '7nkncraia5ltnasjck840p3dtm';

const OAUTH_SIGN_IN_REDIRECT_URL = (typeof window !== 'undefined' && window.OAUTH_SIGN_IN_REDIRECT_URL) 
  || process.env.OAUTH_SIGN_IN_REDIRECT_URL 
  || 'http://localhost:1234';

const cognitoAuthConfig = {
  authority: `https://cognito-idp.us-east-1.amazonaws.com/${AWS_COGNITO_POOL_ID}`,
  client_id: AWS_COGNITO_CLIENT_ID,
  redirect_uri: OAUTH_SIGN_IN_REDIRECT_URL,
  response_type: 'code',
  scope: 'phone openid email',
  // no revoke of "access token" (https://github.com/authts/oidc-client-ts/issues/262)
  revokeTokenTypes: ['refresh_token'],
  // no silent renew via "prompt=none" (https://github.com/authts/oidc-client-ts/issues/366)
  automaticSilentRenew: false,
};

// Create a UserManager instance
const userManager = new UserManager({
  ...cognitoAuthConfig,
});

export async function signIn() {
  // Trigger a redirect to the Cognito auth page, so user can authenticate
  await userManager.signinRedirect();
}

export async function signOut() {
  // Sign out the user and clear the session
  await userManager.signoutRedirect();
}



// Create a simplified view of the user, with an extra method for creating the auth headers
function formatUser(user) {
  console.log('User Authenticated', { user });
  return {
    // If you add any other profile scopes, you can include them here
    username: user.profile['cognito:username'],
    email: user.profile.email,
    idToken: user.id_token,
    accessToken: user.access_token,
    authorizationHeaders: (contentType) => {
      const headers = {
        Authorization: `Bearer ${user.id_token}`,
      };
      // Only add Content-Type if provided (for GET requests, we don't need it)
      if (contentType) {
        headers['Content-Type'] = contentType;
      }
      return headers;
    },
  };
}

export async function getUser() {
  // First, check if we're handling a signin redirect callback (e.g., is ?code=... in URL)
  if (window.location.search.includes('code=')) {
    const user = await userManager.signinCallback();
    // Remove the auth code from the URL without triggering a reload
    window.history.replaceState({}, document.title, window.location.pathname);
    return formatUser(user);
  }

  // Otherwise, get the current user
  const user = await userManager.getUser();
  return user ? formatUser(user) : null;
}