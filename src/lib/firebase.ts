import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence, type Auth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

export const firebaseConfig = {
  apiKey: 'AIzaSyDRluLskME1ryAG_6YFjUJBMHF_zfOcz8s',
  authDomain: 'worship-works-2cf4e.firebaseapp.com',
  projectId: 'worship-works-2cf4e',
  storageBucket: 'worship-works-2cf4e.firebasestorage.app',
  messagingSenderId: '705995316044',
  appId: '1:705995316044:web:3d1d61a58e784a77f54de9',
};

export const ADMIN_EMAILS = ['bmzz3252@gmail.com'];

const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth: Auth =
  Platform.OS === 'web'
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });

export const db = initializeFirestore(
  app,
  Platform.OS === 'web' ? {} : { experimentalForceLongPolling: true }
);

export const storage = getStorage(app);