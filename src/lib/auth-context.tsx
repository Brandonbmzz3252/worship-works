import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

import { auth, db, ADMIN_EMAILS } from './firebase';
import { subscribeUserProfile } from './store';
import { setSessionChurchId, slugifyChurch } from './session';
import { registerForPushNotificationsAsync } from './notifications';
import type { UserProfile, Role, UserGroupMembership } from './types';

type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

interface AuthContextValue {
  status: AuthStatus;
  user: FirebaseUser | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    displayName: string,
    email: string,
    password: string,
    churchName: string,
    churchPassword?: string,
    birthday?: string,
    anniversary?: string
  ) => Promise<void>;
updateProfileName: (name: string) => Promise<void>;
  sendResetPasswordEmail: (email: string) => Promise<void>;
  getChurchAccessCode: (churchId: string) => Promise<string>;
  setChurchAccessCode: (churchId: string, code: string) => Promise<void>;
  switchChurch: (group: UserGroupMembership) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) setProfile(null);
      setStatus(firebaseUser ? 'signedIn' : 'signedOut');
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeUserProfile(user.uid, setProfile);
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    setSessionChurchId(profile?.churchId ?? null);
  }, [profile]);

  useEffect(() => {
    if (!user || !profile?.churchId) return;
    registerForPushNotificationsAsync(user.uid);
  }, [user, profile?.churchId]);

  async function signIn(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }

  async function signUp(
    displayName: string,
    email: string,
    password: string,
    churchName: string,
    churchPassword?: string,
    birthday?: string,
    anniversary?: string
  ): Promise<void> {
    const name = displayName.trim();
    const emailAddress = email.trim();
    const churchId = slugifyChurch(churchName);
    if (!churchId) {
      throw new Error('Enter the name of your church.');
    }
    const cleanChurchCode = (churchPassword || '').trim();
    if (!cleanChurchCode) {
      throw new Error('Enter a church password / access code.');
    }

    const churchRef = doc(db, 'churches', churchId);
    const churchSnap = await getDoc(churchRef);
    const isFounder = !churchSnap.exists();

    if (!isFounder) {
      const data = churchSnap.data() as { accessCode?: string };
      if (data?.accessCode && data.accessCode !== cleanChurchCode) {
        throw new Error('Incorrect church access code. Ask your church admin or worship leader for the password.');
      }
    }

    const credential = await createUserWithEmailAndPassword(auth, emailAddress, password);
    const uid = credential.user.uid;
    await updateProfile(credential.user, { displayName: name });

    if (isFounder) {
      await setDoc(churchRef, {
        name: churchName.trim(),
        accessCode: cleanChurchCode,
        createdBy: uid,
        createdAt: new Date(),
      });
    } else {
      const data = churchSnap.data() as { accessCode?: string };
      if (!data?.accessCode) {
        await updateDoc(churchRef, { accessCode: cleanChurchCode });
      }
    }

    const role: Role =
      isFounder || ADMIN_EMAILS.includes(emailAddress) ? 'admin' : 'member';
const userData: Record<string, unknown> = {
      uid,
      displayName: name,
      email: emailAddress,
      churchId,
      role,
      groups: [{ id: churchId, name: churchName.trim() }],
      birthday,
      anniversary,
      createdAt: new Date(),
    };
    if (birthday === undefined) delete userData.birthday;
    if (anniversary === undefined) delete userData.anniversary;
    await setDoc(doc(db, 'users', uid), userData);
  }

  async function signOut(): Promise<void> {
    await fbSignOut(auth);
  }

async function updateProfileName(name: string): Promise<void> {
    if (!user) throw new Error('Not signed in');
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Name cannot be empty');
    await Promise.all([
      updateProfile(user, { displayName: trimmed }),
      updateDoc(doc(db, 'users', user.uid), { displayName: trimmed }),
    ]);
  }

  async function sendResetPasswordEmail(email: string): Promise<void> {
    const address = email.trim();
    if (!address) throw new Error('Enter your email address first.');
    await sendPasswordResetEmail(auth, address);
  }

  async function getChurchAccessCode(churchId: string): Promise<string> {
    const snap = await getDoc(doc(db, 'churches', churchId));
    return (snap.data() as { accessCode?: string } | undefined)?.accessCode ?? '';
  }

async function setChurchAccessCode(churchId: string, code: string): Promise<void> {
    const trimmed = code.trim();
    if (!trimmed) throw new Error('Enter a church access code.');
    await updateDoc(doc(db, 'churches', churchId), { accessCode: trimmed });
  }

  async function switchChurch(group: UserGroupMembership): Promise<void> {
    if (!user) throw new Error('Not signed in');
    const groups = profile?.groups ?? [];
    const next = groups.some((g) => g.id === group.id) ? groups : [...groups, group];
    setSessionChurchId(group.id);
    setProfile((p) => (p ? { ...p, churchId: group.id, groups: next } : p));
    try {
      await updateDoc(doc(db, 'users', user.uid), { churchId: group.id, groups: next });
    } catch {
      // keep the in-app switch even if persisting the last-active group fails
    }
  }

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        profile,
        isAdmin: profile?.role === 'admin',
signIn,
        signUp,
        updateProfileName,
        sendResetPasswordEmail,
        getChurchAccessCode,
        setChurchAccessCode,
        switchChurch,
        signOut,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
