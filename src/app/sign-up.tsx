import { Redirect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { MonthDayField } from '@/components/ui/month-day-field';
import { useBrand } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { friendlyError } from '@/lib/errors';

export default function SignUpScreen() {
  const router = useRouter();
  const { status, signUp } = useAuth();
  const brand = useBrand();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [churchName, setChurchName] = useState('');
  const [churchPassword, setChurchPassword] = useState('');
  const [birthday, setBirthday] = useState<string | null>(null);
  const [anniversary, setAnniversary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (status === 'signedIn') {
    return <Redirect href="/" />;
  }

  async function handleSignUp() {
    if (!name.trim() || !email.trim() || !password || !churchName.trim()) {
      setError('Please fill in your name, email, password and church.');
      return;
    }
    if (!churchPassword.trim()) {
      setError('Please enter a church password or access code.');
      return;
    }
    if (!birthday) {
      setError('Please choose your birthday — it is only the month and day.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signUp(
        name,
        email,
        password,
        churchName,
        churchPassword,
        birthday ?? undefined,
        anniversary ?? undefined
      );
      router.replace('/');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[brand.gradientStart, brand.gradientEnd]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.fill}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          automaticallyAdjustKeyboardInsets={true}
          keyboardShouldPersistTaps="handled"
          bounces={false}>
          <View style={styles.hero}>
            <Image source={require('../../assets/images/icon.png')} style={styles.logo} />
            <Text style={styles.wordmark}>CREATE ACCOUNT</Text>
            <Text style={styles.tagline}>Join the worship community.</Text>
          </View>

          <View style={styles.form}>
            <TextField
              label="Church name"
              value={churchName}
              onChangeText={setChurchName}
              placeholder="e.g. Gen2Gen"
              autoCapitalize="words"
            />
            <TextField
              label="Church access code / password"
              value={churchPassword}
              onChangeText={setChurchPassword}
              placeholder="e.g. 4589 or passkey"
              secureTextEntry
            />
            <Text style={styles.churchHint}>
              If joining an existing church, enter the code from your leader. If creating a new church, choose a code for your team.
            </Text>
            <TextField
              label="Full name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Sarah Mokoena"
              autoCapitalize="words"
            />
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@church.org"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <MonthDayField label="Birthday *" value={birthday} onChange={setBirthday} />
            <MonthDayField label="Anniversary (optional)" value={anniversary} onChange={setAnniversary} />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              secureTextEntry
            />
            <TextField
              label="Confirm password"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repeat your password"
              secureTextEntry
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              title="Create Account"
              onPress={handleSignUp}
              loading={loading}
              icon="person-add-outline"
              style={styles.signUpBtn}
            />
            <Pressable onPress={() => router.push('/sign-in')} style={styles.linkWrap}>
              <Text style={[styles.link, { color: brand.accent }]}>Already have an account? Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 60,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 20,
    marginBottom: 12,
  },
  wordmark: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#ffffff',
  },
  tagline: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  form: {
    gap: 16,
  },
  churchHint: {
    fontSize: 12.5,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.75)',
    marginTop: -8,
  },
  error: {
    color: '#FFC1B6',
    fontSize: 13,
    lineHeight: 18,
  },
  signUpBtn: {
    marginTop: 4,
  },
  linkWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
  },
});
