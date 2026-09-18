export function friendlyError(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Something went wrong. Please try again.';
  const code = (error as { code?: string }).code;

  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email is already registered. Try signing in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'Wrong email or password.';
    case 'auth/wrong-password':
      return 'Wrong password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'No internet connection. Check your connection and try again.';
    case 'storage/unauthorized':
    case 'permission-denied':
      return "You don't have permission to do that.";
    case 'storage/object-not-found':
      return 'The file could not be found.';
    default:
      return (
        (error as { message?: string }).message?.trim() || 'Something went wrong. Please try again.'
      );
  }
}