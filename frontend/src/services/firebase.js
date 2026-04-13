import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBVVZHxAxG6332dnpv8XqitMWDPGQp0sb4',
  authDomain: 'expense-tracker-7297b.firebaseapp.com',
  projectId: 'expense-tracker-7297b',
  storageBucket: 'expense-tracker-7297b.firebasestorage.app',
  messagingSenderId: '698461205113',
  appId: '1:698461205113:web:1782fc92cd460abae99aa8',
  measurementId: 'G-EJVW5M3S0C'
};

const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];
const hasAllKeys = requiredKeys.every((key) => Boolean(firebaseConfig[key]));

const app = hasAllKeys ? initializeApp(firebaseConfig) : null;
const analytics = app && typeof window !== 'undefined' ? getAnalytics(app) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const storage = app ? getStorage(app) : null;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { analytics, auth, db, googleProvider, storage };
export const isFirebaseConfigured = hasAllKeys;
