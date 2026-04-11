// Firebase configuration — same project as the Android app
import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
	apiKey: 'AIzaSyA1GrYATgiXk11SeLay2tl0oioFTHhpLfs',
	authDomain: 'challengedice.firebaseapp.com',
	databaseURL: 'https://challengedice-default-rtdb.firebaseio.com',
	projectId: 'challengedice',
	storageBucket: 'challengedice.firebasestorage.app',
	messagingSenderId: '134656444152',
	appId: '1:134656444152:web:a026a36ded6239de189d0d',
};

const app = initializeApp(firebaseConfig);

// Enable debug token for local development
if (import.meta.env.DEV) {
	(self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

const appCheck = initializeAppCheck(app, {
	provider: new ReCaptchaV3Provider('6Le4pLEsAAAAAGoYuJW8qref1I3czf9K7Y1L03XN'),
	isTokenAutoRefreshEnabled: true,
});

export const db = getDatabase(app);
export const auth = getAuth(app);
