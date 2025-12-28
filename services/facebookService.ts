// services/facebookService.ts - Facebook Login with Native SDK
import { auth, db } from './firebaseConfig';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

// Safely import native module to avoid crashes in Expo Go / Old Dev Clients
let Settings: any, LoginManager: any, AccessToken: any, GraphRequest: any, GraphRequestManager: any;

let isNativeSdkAvailable = false;

try {
    const fbsdk = require('react-native-fbsdk-next');
    
    // Check if the module exports are available
    if (fbsdk && fbsdk.Settings && fbsdk.LoginManager && fbsdk.AccessToken) {
        Settings = fbsdk.Settings;
        LoginManager = fbsdk.LoginManager;
        AccessToken = fbsdk.AccessToken;
        GraphRequest = fbsdk.GraphRequest;
        GraphRequestManager = fbsdk.GraphRequestManager;

        // Initialize SDK settings
        try {
            Settings.initializeSDK();
            isNativeSdkAvailable = true;
            console.log('✅ Facebook SDK initialized successfully');
        } catch (initError) {
            console.warn('⚠️ Facebook SDK found but initialization failed:', initError);
            isNativeSdkAvailable = false;
        }
    } else {
        console.warn('⚠️ Facebook SDK module loaded but exports are missing');
        isNativeSdkAvailable = false;
    }
} catch (e: any) {
    console.warn('❌ Native Facebook SDK not found:', e?.message || e);
    console.warn('💡 Make sure you have run: npx expo prebuild && npx expo run:ios (or run:android)');
    // Mock objects to prevent undefined errors if called
    Settings = { initializeSDK: () => { } };
    LoginManager = { logInWithPermissions: async () => ({ isCancelled: true }) };
    AccessToken = { getCurrentAccessToken: async () => null };
    GraphRequest = class { };
    GraphRequestManager = class { addRequest() { return this; } start() { } };
}

// =============================================================================
// 🔧 DEV MOCK MODE - Set to false to use real Facebook login
// =============================================================================
const DEV_MOCK_ENABLED = false; // Disabled to prioritize Real Login

// Mock user data for development fallback if needed
const MOCK_FACEBOOK_USER = {
    id: 'mock_fb_123456789',
    name: 'הראל כהן',
    email: 'harel@example.com',
    picture: {
        data: {
            url: 'https://i.pravatar.cc/300?img=8',
        },
    },
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
 * Login with Facebook using Native SDK
 * Returns user data if successful
 */
export const loginWithFacebook = async (): Promise<{
    success: boolean;
    user?: FacebookUser;
    accessToken?: string;
    error?: string;
}> => {
    // 🔧 DEV MOCK
    if (DEV_MOCK_ENABLED && __DEV__) {
        console.log('🔧 DEV MOCK: Simulating Facebook login...');
        await new Promise(resolve => setTimeout(resolve, 800));

        const userId = auth.currentUser?.uid;
        if (userId) {
            await updateDoc(doc(db, 'users', userId), {
                facebookId: MOCK_FACEBOOK_USER.id,
                facebookConnected: true,
                facebookAccessToken: 'mock_access_token_dev',
                facebookName: MOCK_FACEBOOK_USER.name,
                facebookPictureUrl: MOCK_FACEBOOK_USER.picture.data.url,
            });
        }
        return { success: true, user: MOCK_FACEBOOK_USER, accessToken: 'mock_access_token_dev' };
    }

    // Check for native SDK presence
    if (!isNativeSdkAvailable) {
        return {
            success: false,
            error: 'רכיב פייסבוק חסר (Native Module). יש לבנות מחדש את האפליקציה (Prebuild).'
        };
    }

    try {
        // 1. Attempt Login
        // Note: user_friends requires App Review - removed to allow basic login to work
        const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);

        if (result.isCancelled) {
            return { success: false, error: 'התחברות בוטלה' };
        }

        // 2. Get Access Token
        const data = await AccessToken.getCurrentAccessToken();
        if (!data) {
            return { success: false, error: 'לא התקבל טוקן גישה' };
        }

        const accessToken = data.accessToken.toString();

        // 3. Fetch User Profile via Graph API
        return new Promise((resolve) => {
            const infoRequest = new GraphRequest(
                '/me',
                {
                    accessToken,
                    parameters: {
                        fields: {
                            string: 'id,name,email,picture.type(large)'
                        }
                    }
                },
                async (error, result: any) => {
                    if (error) {
                        console.error('Error fetching data: ', error);
                        resolve({ success: false, error: 'שגיאה בקבלת נתוני משתמש' });
                    } else {
                        // 4. Save to Firestore
                        const userData: FacebookUser = result;
                        const userId = auth.currentUser?.uid;

                        if (userId) {
                            try {
                                await updateDoc(doc(db, 'users', userId), {
                                    facebookId: userData.id,
                                    facebookConnected: true,
                                    facebookAccessToken: accessToken,
                                    facebookName: userData.name,
                                    facebookPictureUrl: userData.picture?.data?.url || null,
                                });
                            } catch (e) {
                                console.error("Firestore update failed", e);
                                // We still consider login successful even if save fails locally? 
                                // Ideally we should alert, but let's proceed.
                            }
                        }

                        resolve({
                            success: true,
                            user: userData,
                            accessToken
                        });
                    }
                }
            );

            new GraphRequestManager().addRequest(infoRequest).start();
        });

    } catch (error) {
        console.error('Facebook login error:', error);
        return {
            success: false,
            error: 'שגיאה בהתחברות לפייסבוק',
        };
    }
};

/**
 * Get mutual friends between two users
 * Note: Both users must have authorized the app with user_friends permission
 */
export const getMutualFriends = async (
    user1AccessToken: string,
    user2FacebookId: string
): Promise<FacebookFriend[]> => {
    return new Promise((resolve) => {
        const mutualRequest = new GraphRequest(
            `/${user2FacebookId}/mutualfriends`,
            {
                accessToken: user1AccessToken,
                parameters: {
                    fields: {
                        string: 'context.fields(mutual_friends)'
                    }
                }
            },
            (error, result: any) => {
                if (error) {
                    console.log('Error fetching mutual friends:', error);
                    resolve([]);
                } else {
                    // Graph API structure for mutual friends is slightly different depending on version
                    // Usually it's context.mutual_friends.data
                    // Or sometimes directly data if using the edge
                    const friends = result?.data || result?.context?.mutual_friends?.data || [];
                    resolve(friends);
                }
            }
        );
        new GraphRequestManager().addRequest(mutualRequest).start();
    });
};

/**
 * Get mutual friends between current user and a sitter
 */
export const getMutualFriendsWithSitter = async (sitterUserId: string): Promise<{
    mutualFriends: FacebookFriend[];
    sitterFacebookConnected: boolean;
}> => {
    // 🔧 DEV MOCK
    if (DEV_MOCK_ENABLED && __DEV__) {
        return {
            mutualFriends: [
                { id: '1', name: 'דנה לוי', picture: { data: { url: 'https://i.pravatar.cc/100?img=5' } } },
                { id: '2', name: 'יוסי כהן', picture: { data: { url: 'https://i.pravatar.cc/100?img=12' } } }
            ],
            sitterFacebookConnected: true,
        };
    }

    try {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) return { mutualFriends: [], sitterFacebookConnected: false };

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
 * Disconnect Facebook
 */
export const disconnectFacebook = async (): Promise<boolean> => {
    try {
        LoginManager.logOut();

        const userId = auth.currentUser?.uid;
        if (userId) {
            await updateDoc(doc(db, 'users', userId), {
                facebookId: null,
                facebookConnected: false,
                facebookAccessToken: null,
                facebookName: null,
                facebookPictureUrl: null,
            });
        }
        return true;
    } catch (error) {
        console.error('Error disconnecting Facebook:', error);
        return false;
    }
};

/**
 * Check connectivity
 */
export const isUserFacebookConnected = async (): Promise<boolean> => {
    try {
        const currentAccessToken = await AccessToken.getCurrentAccessToken();
        if (!currentAccessToken) return false;

        const userId = auth.currentUser?.uid;
        if (!userId) return false;

        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.data();

        return userData?.facebookConnected === true;
    } catch {
        return false;
    }
};
