import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { db, messaging } from './firebase';
import { collection, addDoc, serverTimestamp, where, query, getDocs, doc, setDoc } from 'firebase/firestore';

const VAPID_KEY = 'YOUR_VAPID_KEY_FROM_FIREBASE_SETTINGS'; // IMPORTANT: Replace with your actual key

/**
 * Requests permission to show notifications and saves the device token.
 */
export const requestNotificationPermissionAndSaveToken = async (userId: string | null) => {
    console.log('Requesting notification permission...');

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Notification permission granted.');
            
            const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
            
            if (currentToken) {
                console.log('FCM Token:', currentToken);
                await saveTokenToFirestore(currentToken, userId);
            } else {
                console.log('No registration token available. Request permission to generate one.');
            }
        } else {
            console.log('Unable to get permission to notify.');
        }
    } catch (error) {
        console.error('An error occurred while getting token. ', error);
    }
};

/**
 * Saves the FCM token to Firestore, associating it with a user if logged in.
 */
const saveTokenToFirestore = async (token: string, userId: string | null) => {
    const tokensCollection = collection(db, 'deviceTokens');
    
    // Check if the token already exists to avoid duplicates
    const q = query(tokensCollection, where('token', '==', token));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        console.log('Saving new token to Firestore.');
        await addDoc(tokensCollection, {
            token: token,
            userId: userId, // Can be null for guest users
            createdAt: serverTimestamp(),
        });
    } else {
        // If token exists, ensure the userId is up-to-date (e.g., user logs in)
        const existingDoc = querySnapshot.docs[0];
        if (userId && existingDoc.data().userId !== userId) {
            console.log('Updating token with new user ID.');
            await setDoc(doc(db, 'deviceTokens', existingDoc.id), { userId: userId }, { merge: true });
        } else {
            console.log('Token already exists in Firestore.');
        }
    }
};

/**
 * Sets up a listener for foreground messages.
 */
export const setupForegroundMessageHandler = (showToast: (message: string, type: 'info' | 'success' | 'error') => void) => {
    // FIX: onMessage returns an unsubscribe function that needs to be returned to be used in useEffect cleanup.
    return onMessage(messaging, (payload) => {
        console.log('Message received in foreground. ', payload);
        const title = payload.notification?.title || 'New Notification';
        const body = payload.notification?.body || '';

        // Display a toast notification for foreground messages
        showToast(`${title}: ${body}`, 'info');
    });
};
