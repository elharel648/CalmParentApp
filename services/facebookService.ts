// services/facebookService.ts - Facebook Login with Expo AuthSession
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { auth, db } from './firebaseConfig';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

// Facebook App Configuration
const FACEBOOK_APP_ID = '1567376814402845';

// Enable web browser result handling
WebBrowser.maybeCompleteAuthSession();

// Discovery document for Facebook
const discovery = {
    authorizationEndpoint: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenEndpoint: 'https://graph.facebook.com/v18.0/oauth/access_token',
};

interface FacebookUser {
    id: string;
    name: string;
    email?: string;
    picture?: {
        data: {
            url: string;
        };
    };
}

interface FacebookFriend {
    id: string;
    name: string;
    picture?: {
        data: {
            url: string;
        };
    };
}

/**
 * Generate a secure random state for OAuth
 */
const generateState = async (): Promise<string> => {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

/**
 * Get the redirect URI for OAuth
 * For native builds, we use the Facebook SDK redirect format
 */
export const getRedirectUri = () => {
    // For native builds, use the Facebook callback URL
    return `fb${FACEBOOK_APP_ID}://authorize`;
};

/**
 * Login with Facebook using Expo AuthSession
 * Returns user data if successful
 */
export const loginWithFacebook = async (): Promise<{
    success: boolean;
    user?: FacebookUser;
    accessToken?: string;
    error?: string;
}> => {
    try {
        const state = await generateState();
        const redirectUri = getRedirectUri();

        // Request permissions: public_profile, email, user_friends
        const authUrl = `${discovery.authorizationEndpoint}?` +
            `client_id=${FACEBOOK_APP_ID}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&response_type=token` +
            `&scope=public_profile,email,user_friends` +
            `&state=${state}`;

        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

        if (result.type === 'success' && result.url) {
            // Parse the access token from the URL fragment
            const urlParams = new URLSearchParams(result.url.split('#')[1]);
            const accessToken = urlParams.get('access_token');

            if (accessToken) {
                // Fetch user profile
                const userResponse = await fetch(
                    `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`
                );
                const userData: FacebookUser = await userResponse.json();

                // Save Facebook connection to user's Firestore document
                const userId = auth.currentUser?.uid;
                if (userId) {
                    await updateDoc(doc(db, 'users', userId), {
                        facebookId: userData.id,
                        facebookConnected: true,
                        facebookAccessToken: accessToken, // Note: In production, store this securely
                        facebookName: userData.name,
                        facebookPictureUrl: userData.picture?.data?.url || null,
                    });
                }

                return {
                    success: true,
                    user: userData,
                    accessToken,
                };
            }
        }

        return {
            success: false,
            error: result.type === 'cancel' ? 'בוטל על ידי המשתמש' : 'התחברות נכשלה',
        };
    } catch (error) {
        console.error('Facebook login error:', error);
        return {
            success: false,
            error: 'שגיאה בהתחברות לפייסבוק',
        };
    }
};

/**
 * Get user's friends who also use the app
 * Note: This only returns friends who have also authorized the app
 */
export const getFacebookFriends = async (accessToken: string): Promise<FacebookFriend[]> => {
    try {
        const response = await fetch(
            `https://graph.facebook.com/me/friends?fields=id,name,picture.type(large)&access_token=${accessToken}`
        );
        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Error fetching Facebook friends:', error);
        return [];
    }
};

/**
 * Check for mutual friends between two users
 * Both users must have connected their Facebook accounts
 */
export const getMutualFriends = async (
    user1AccessToken: string,
    user2FacebookId: string
): Promise<FacebookFriend[]> => {
    try {
        const response = await fetch(
            `https://graph.facebook.com/${user2FacebookId}/mutualfriends?access_token=${user1AccessToken}`
        );
        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Error fetching mutual friends:', error);
        return [];
    }
};

/**
 * Get mutual friends between current user and a sitter
 * Returns list of mutual friends who also use the app
 */
export const getMutualFriendsWithSitter = async (sitterUserId: string): Promise<{
    mutualFriends: FacebookFriend[];
    sitterFacebookConnected: boolean;
}> => {
    try {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) {
            return { mutualFriends: [], sitterFacebookConnected: false };
        }

        // Get current user's Facebook data
        const currentUserDoc = await getDoc(doc(db, 'users', currentUserId));
        const currentUserData = currentUserDoc.data();

        if (!currentUserData?.facebookConnected || !currentUserData?.facebookAccessToken) {
            return { mutualFriends: [], sitterFacebookConnected: false };
        }

        // Get sitter's Facebook data
        const sitterDoc = await getDoc(doc(db, 'users', sitterUserId));
        const sitterData = sitterDoc.data();

        if (!sitterData?.facebookConnected || !sitterData?.facebookId) {
            return { mutualFriends: [], sitterFacebookConnected: false };
        }

        // Get mutual friends
        const mutualFriends = await getMutualFriends(
            currentUserData.facebookAccessToken,
            sitterData.facebookId
        );

        return {
            mutualFriends,
            sitterFacebookConnected: true,
        };
    } catch (error) {
        console.error('Error getting mutual friends with sitter:', error);
        return { mutualFriends: [], sitterFacebookConnected: false };
    }
};

/**
 * Disconnect Facebook from user's account
 */
export const disconnectFacebook = async (): Promise<boolean> => {
    try {
        const userId = auth.currentUser?.uid;
        if (!userId) return false;

        await updateDoc(doc(db, 'users', userId), {
            facebookId: null,
            facebookConnected: false,
            facebookAccessToken: null,
            facebookName: null,
            facebookPictureUrl: null,
        });

        return true;
    } catch (error) {
        console.error('Error disconnecting Facebook:', error);
        return false;
    }
};

/**
 * Check if current user has Facebook connected
 */
export const isUserFacebookConnected = async (): Promise<boolean> => {
    try {
        const userId = auth.currentUser?.uid;
        if (!userId) return false;

        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.data();

        return userData?.facebookConnected === true;
    } catch {
        return false;
    }
};
