// Anonymous Firebase authentication
import { auth } from './config';
import { signInAnonymously } from 'firebase/auth';

export async function ensureAuthenticated(): Promise<string> {
	const user = auth.currentUser;
	if (user) return user.uid;
	const result = await signInAnonymously(auth);
	if (!result.user) throw new Error('Authentication failed');
	return result.user.uid;
}

export function getCurrentUid(): string | null {
	return auth.currentUser?.uid ?? null;
}
