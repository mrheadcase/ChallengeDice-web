// Sound effects — mirrors Android's SoundManager.kt.
// Two assets: rolling_dice.mp3 (looped while dice roll) and shaking_dice.mp3
// (one-shot on valid combo selection). Each play is clipped to a duration
// that matches the on-screen animation, just like the Android SoundPool
// calls `stop()` after `delay(durationMs)`.

import { base } from '$app/paths';
import { preferences } from '$lib/stores/preferences.svelte';

let rollingAudio: HTMLAudioElement | null = null;
let shakingAudio: HTMLAudioElement | null = null;
let rollingStopTimer: ReturnType<typeof setTimeout> | null = null;
let shakingStopTimer: ReturnType<typeof setTimeout> | null = null;

function getRolling(): HTMLAudioElement | null {
	if (typeof Audio === 'undefined') return null;
	if (!rollingAudio) {
		rollingAudio = new Audio(`${base}/sounds/rolling_dice.mp3`);
		rollingAudio.preload = 'auto';
		rollingAudio.loop = true;
	}
	return rollingAudio;
}

function getShaking(): HTMLAudioElement | null {
	if (typeof Audio === 'undefined') return null;
	if (!shakingAudio) {
		shakingAudio = new Audio(`${base}/sounds/shaking_dice.mp3`);
		shakingAudio.preload = 'auto';
	}
	return shakingAudio;
}

function stopRolling() {
	if (rollingStopTimer) { clearTimeout(rollingStopTimer); rollingStopTimer = null; }
	if (rollingAudio) {
		rollingAudio.pause();
		rollingAudio.currentTime = 0;
	}
}

function stopShaking() {
	if (shakingStopTimer) { clearTimeout(shakingStopTimer); shakingStopTimer = null; }
	if (shakingAudio) {
		shakingAudio.pause();
		shakingAudio.currentTime = 0;
	}
}

export function playRollingSound(durationMs: number = 900) {
	if (!preferences.current.soundEnabled) return;
	const audio = getRolling();
	if (!audio) return;
	stopRolling();
	try {
		audio.currentTime = 0;
		audio.play().catch(() => { /* autoplay blocked or load failed */ });
		rollingStopTimer = setTimeout(stopRolling, durationMs);
	} catch {
		// ignore
	}
}

export function playShakingSound(durationMs: number = 400) {
	if (!preferences.current.soundEnabled) return;
	const audio = getShaking();
	if (!audio) return;
	stopShaking();
	try {
		audio.currentTime = 0;
		audio.play().catch(() => { /* autoplay blocked or load failed */ });
		shakingStopTimer = setTimeout(stopShaking, durationMs);
	} catch {
		// ignore
	}
}

export function tryVibrate(ms: number = 50) {
	if (!preferences.current.hapticEnabled) return;
	try {
		navigator?.vibrate?.(ms);
	} catch {
		// Vibration not available
	}
}
