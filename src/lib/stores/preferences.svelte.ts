// User preferences — persisted in localStorage, reactive via $state

import type { PlayerColor } from '$lib/game/models';

export type ComboSize = 'small' | 'medium' | 'large' | 'extra_large';
export type ComboSortMode = 'pairs_desc' | 'pairs_asc' | 'fifth_asc' | 'fifth_desc';
export type ScorecardTextSize = 'small' | 'medium' | 'large' | 'extra_large';
export type ThemeMode = 'system' | 'light' | 'dark';

export interface UserPreferences {
	playerName: string;
	preferredColor: PlayerColor;
	soundEnabled: boolean;
	hapticEnabled: boolean;
	autoRollEnabled: boolean;
	diceAnimationEnabled: boolean;
	comboSize: ComboSize;
	comboSortMode: ComboSortMode;
	scorecardTextSize: ScorecardTextSize;
	themeMode: ThemeMode;
}

const STORAGE_KEY = 'challengedice_prefs';

const DEFAULTS: UserPreferences = {
	playerName: '',
	preferredColor: 'BLUE',
	soundEnabled: true,
	hapticEnabled: true,
	autoRollEnabled: true,
	diceAnimationEnabled: true,
	comboSize: 'large',
	comboSortMode: 'pairs_desc',
	scorecardTextSize: 'large',
	themeMode: 'system',
};

function loadFromStorage(): UserPreferences {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...DEFAULTS };
		return { ...DEFAULTS, ...JSON.parse(raw) };
	} catch {
		return { ...DEFAULTS };
	}
}

function persistToStorage(prefs: UserPreferences): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
	} catch {
		// ignore
	}
}

class PreferencesStore {
	current = $state<UserPreferences>(loadFromStorage());

	update(changes: Partial<UserPreferences>) {
		this.current = { ...this.current, ...changes };
		persistToStorage(this.current);

		// Apply theme immediately on any change
		if ('themeMode' in changes) {
			this.applyTheme();
		}
	}

	applyTheme() {
		if (typeof document === 'undefined') return;
		const mode = this.current.themeMode;
		let dark = mode === 'dark';
		if (mode === 'system') {
			dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		}
		document.documentElement.classList.toggle('theme-dark', dark);
	}
}

export const preferences = new PreferencesStore();

// Apply theme on initial load
if (typeof document !== 'undefined') {
	preferences.applyTheme();

	// Listen for system theme changes
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		if (preferences.current.themeMode === 'system') {
			preferences.applyTheme();
		}
	});
}

// Legacy helpers for compatibility
export function getPreferences(): UserPreferences {
	return preferences.current;
}

export function savePreferences(prefs: Partial<UserPreferences>): void {
	preferences.update(prefs);
}
