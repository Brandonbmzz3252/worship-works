import { Redirect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Alert,
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
import { LoadingView } from '@/components/ui/loading-view';
import { TextField } from '@/components/ui/text-field';
import { useBrand } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { friendlyError } from '@/lib/errors';

export default function SignInScreen() {
  const router = useRouter();
  const { status, signIn, sendResetPasswordEmail } = useAuth();
  const brand = useBrand();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (status === 'loading') {
    return <LoadingView />;
  }

  if (status === 'signedIn') {
    return <Redirect href="/" />;
  }

async function handleSignIn() {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      router.replace('/');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    setError(null);
    if (!email.trim()) {
      setError('Enter your email address first, then tap Forgot password.');
      return;
    }
    setResetting(true);
    try {
      await sendResetPasswordEmail(email);
      Alert.alert(
        'Password reset sent',
        'Check your email inbox for a link to create a new password.'
      );
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setResetting(false);
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
            <Text style={styles.wordmark}>WORSHIP-WORKS</Text>
            <Text style={styles.tagline}>Worship connects us. Stay in tune together.</Text>
          </View>

          <View style={styles.form}>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@church.org"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry
            />
{error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              title="Sign In"
              onPress={handleSignIn}
              loading={loading}
              icon="log-in-outline"
              style={styles.signInBtn}
            />
            <Pressable
              onPress={handleResetPassword}
              style={styles.forgotWrap}
              disabled={resetting}>
              <Text style={[styles.forgot, { color: brand.accent }]}>
                {resetting ? 'Sending reset link…' : 'Forgot password?'}
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push('/sign-up')} style={styles.linkWrap}>
              <Text style={[styles.link, { color: brand.accent }]}>New here? Create an account</Text>
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
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 34,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 22,
    marginBottom: 16,
  },
  wordmark: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#ffffff',
  },
  tagline: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  error: {
    color: '#FFC1B6',
    fontSize: 13,
    lineHeight: 18,
  },
signInBtn: {
    marginTop: 4,
  },
  forgotWrap: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  forgot: {
    fontSize: 14,
    fontWeight: '600',
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
