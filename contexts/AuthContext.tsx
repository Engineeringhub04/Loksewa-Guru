import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import { 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    deleteUser,
    updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, addDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import type { AuthUser, AdminNotification } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ isAdminLogin: boolean }>;
  signup: (email: string, pass: string, fullName: string, course: string) => Promise<void>;
  logout: () => Promise<void>;
  adminLogin: () => void;
  updateUserContext: (data: Partial<AuthUser>) => void;
  guestAccessGranted: boolean;
  grantGuestAccess: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [guestAccessGranted, setGuestAccessGranted] = useState(false);
  const tempPhotoUrlRef = useRef<{ url: string; timestamp: number } | null>(null);

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // Clean up any existing Firestore listener when auth state changes
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }
      
      setLoading(true);

      if (firebaseUser) {
        const isUserAdmin = firebaseUser.email?.toLowerCase() === 'admin@gmail.com';
        setIsAdmin(isUserAdmin);

        // Set basic user info from Auth object immediately for a responsive UI.
        setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            fullName: firebaseUser.displayName || undefined,
            photoUrl: firebaseUser.photoURL || undefined,
        });

        if (isUserAdmin) {
            setLoading(false);
            return; // No Firestore doc for admin
        }

        // For regular users, set up a REAL-TIME listener to their Firestore document.
        const userDocRef = doc(db, "users", firebaseUser.uid);
        unsubscribeFirestore = onSnapshot(userDocRef, (userDocSnap) => {
          if (userDocSnap.exists()) {
            const firestoreData = userDocSnap.data();

            let subscriptionStatus: AuthUser['subscriptionStatus'] = firestoreData.subscriptionStatus || 'none';
            const subscriptionExpiry = firestoreData.subscriptionExpiry ? (firestoreData.subscriptionExpiry as Timestamp).toDate() : null;

            if (subscriptionStatus === 'active' && subscriptionExpiry && subscriptionExpiry < new Date()) {
                subscriptionStatus = 'expired';
            }

            // --- START of new photo URL logic ---
            let finalPhotoUrl = firestoreData.photoUrl || firebaseUser.photoURL;
            if (tempPhotoUrlRef.current && (Date.now() - tempPhotoUrlRef.current.timestamp < 10000)) {
                // If the base URL from Firestore matches our temp URL's base, prefer the temp one (with cache buster)
                if (firestoreData.photoUrl && tempPhotoUrlRef.current.url.startsWith(firestoreData.photoUrl)) {
                     finalPhotoUrl = tempPhotoUrlRef.current.url;
                }
            } else if (tempPhotoUrlRef.current) {
                // Clear the ref if it's expired
                tempPhotoUrlRef.current = null;
            }
            // --- END of new photo URL logic ---

            // Update user state by merging data from Auth and Firestore.
            setUser(prevUser => ({
              ...prevUser!, // Keep basic auth info if it exists
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              fullName: firestoreData.fullName || prevUser?.fullName || firebaseUser.displayName,
              photoUrl: finalPhotoUrl,
              course: firestoreData.course,
              gender: firestoreData.gender,
              subscriptionStatus,
              subscriptionExpiry,
              planName: firestoreData.planName,
            }));
          } else {
             console.warn("User document not found in Firestore for UID:", firebaseUser.uid);
             // The user state already has data from the Auth object, so we just stop loading.
          }
          setLoading(false); // Stop loading after the first snapshot is received
        }, (error) => {
          console.error("Error with Firestore snapshot listener:", error);
          setLoading(false); // Stop loading on error too
        });

      } else {
        // No user logged in
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, []);

  const login = async (email: string, pass: string): Promise<{ isAdminLogin: boolean }> => {
    // Authenticate with Firebase for both regular users and admin
    await signInWithEmailAndPassword(auth, email, pass);

    // After successful authentication, check if it's the admin user
    if (email.toLowerCase() === 'admin@gmail.com') {
        adminLogin(); // This sets the local isAdmin state for client-side routing
        return { isAdminLogin: true };
    }

    return { isAdminLogin: false };
  };

  const signup = async (email: string, pass: string, fullName: string, course: string) => {
    if (email.toLowerCase() === 'admin@gmail.com') {
        const error = new Error("This email is reserved for administration.");
        (error as any).code = 'auth/reserved-email';
        throw error;
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const firebaseUser = userCredential.user;

    // Update the Auth user profile with the display name for faster access
    await updateProfile(firebaseUser, { displayName: fullName });

    const userData = {
        uid: firebaseUser.uid,
        fullName,
        email,
        course,
        createdAt: serverTimestamp(),
        photoUrl: null, // Initialize photoUrl as null
    };

    try {
        await setDoc(doc(db, "users", firebaseUser.uid), userData);
        
        // The attempt to create an admin notification from the client-side was failing
        // due to Firestore security rules. A new user does not have permission to write
        // to the `adminNotifications` collection. This should be handled by a backend function.
        // To fix the critical signup error, this client-side write has been removed.
        /*
        const adminNotification: Omit<AdminNotification, 'id' | 'createdAt'> = {
            type: 'newUser',
            title: 'New User Signed Up',
            message: `${fullName} (${email}) signed up for the ${course} course.`,
            read: false,
            link: `/admin/users`,
            relatedId: firebaseUser.uid,
        };
        await addDoc(collection(db, 'adminNotifications'), {...adminNotification, createdAt: serverTimestamp()});
        */

    } catch (error) {
        console.error("CRITICAL: Failed to save user details. Deleting user to prevent inconsistent state.", error);
        await deleteUser(firebaseUser).catch(deleteError => {
            console.error("CRITICAL: Failed to delete user after Firestore failure. Manual cleanup required.", deleteError);
        });
        throw new Error("Failed to create user profile. Please check your network connection and try again.");
    }
    
    setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        fullName,
        course,
        photoUrl: undefined,
        subscriptionStatus: 'none',
        subscriptionExpiry: null,
        planName: undefined,
    });
  };
  
  const adminLogin = () => {
    setIsAdmin(true);
  };

  const logout = async () => {
    if (user || isAdmin) {
      await signOut(auth);
    }
    setIsAdmin(false);
    setUser(null);
    setGuestAccessGranted(true); // Treat logged-out user as a guest
  };

  const updateUserContext = (data: Partial<AuthUser>) => {
    if (data.photoUrl) {
        tempPhotoUrlRef.current = { url: data.photoUrl, timestamp: Date.now() };
    }
    setUser(prevUser => prevUser ? { ...prevUser, ...data } : null);
  };

  const grantGuestAccess = () => {
    setGuestAccessGranted(true);
  };
  
  const value = {
    user,
    isLoggedIn: !!user || isAdmin,
    isAdmin,
    loading,
    login,
    signup,
    logout,
    adminLogin,
    updateUserContext,
    guestAccessGranted,
    grantGuestAccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};