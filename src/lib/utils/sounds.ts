// Sound effects — mirrors Android's SoundManager.kt.
// Two assets: rolling_dice.mp3 (looped while dice roll) and shaking_dice.mp3
// (one-shot on valid combo selection). Each play is clipped to a duration
// that matches the on-screen animation, just like the Android SoundPool
// calls `stop()` after `delay(durationMs)`.
//
// Uses the Web Audio API rather than <audio> elements: each file is decoded
// into memory once, and every play is a cheap buffer source. Restarting an
// <audio> element (pause, rewind, play) is slow on iOS Safari and delayed
// taps that came in quick succession.

import { base } from '$app/paths';
import { preferences } from '$lib/stores/preferences.svelte';

type SoundName = 'rolling' | 'shaking';

const FILES: Record<SoundName, string> = {
	rolling: 'rolling_dice.mp3',
	shaking: 'shaking_dice.mp3',
};

// Short fade at the clip point so cutting a sound off doesn't click
const FADE_OUT_S = 0.03;

let context: AudioContext | null = null;
const buffers: Partial<Record<SoundName, AudioBuffer>> = {};
const loading: Partial<Record<SoundName, Promise<void>>> = {};
const playing: Partial<Record<SoundName, AudioBufferSourceNode>> = {};

function getContext(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	if (!context) {
		const Ctor = window.AudioContext
			?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
		if (!Ctor) return null;
		context = new Ctor();
	}
	// Browsers start the context suspended until a user gesture; resuming inside one unlocks it
	if (context.state === 'suspended') void context.resume();
	return context;
}

function load(name: SoundName): Promise<void> {
	const ctx = getContext();
	if (!ctx) return Promise.resolve();
	loading[name] ??= fetch(`${base}/sounds/${FILES[name]}`)
		.then(res => res.arrayBuffer())
		.then(data => ctx.decodeAudioData(data))
		.then(buffer => { buffers[name] = buffer; })
		.catch(() => { delete loading[name]; /* retry on the next play */ });
	return loading[name];
}

/*
 * Decode both sounds as soon as a game screen loads, so they're ready for the first roll
 * or combo tap. Decoding works before any user gesture; playback doesn't, so the context
 * is also unlocked on the first touch or click anywhere.
 */
if (typeof window !== 'undefined') {
	void load('rolling');
	void load('shaking');
	window.addEventListener('pointerdown', () => { getContext(); }, { once: true, capture: true });
}

function stop(name: SoundName) {
	const source = playing[name];
	if (!source) return;
	try { source.stop(); } catch { /* already stopped */ }
	delete playing[name];
}

function play(name: SoundName, durationMs: number, loop: boolean) {
	if (!preferences.current.soundEnabled) return;
	const ctx = getContext();
	const buffer = buffers[name];
	if (!ctx || !buffer) {
		// Not decoded yet (e.g. the very first tap) — skip this play rather than wait
		void load(name);
		return;
	}

	stop(name);

	const source = ctx.createBufferSource();
	source.buffer = buffer;
	source.loop = loop;

	const gain = ctx.createGain();
	source.connect(gain).connect(ctx.destination);

	const start = ctx.currentTime;
	const end = start + durationMs / 1000;
	gain.gain.setValueAtTime(1, Math.max(start, end - FADE_OUT_S));
	gain.gain.linearRampToValueAtTime(0, end);

	source.start(start);
	source.stop(end);
	source.onended = () => {
		if (playing[name] === source) delete playing[name];
	};
	playing[name] = source;
}

export function playRollingSound(durationMs: number = 900) {
	play('rolling', durationMs, true);
}

export function playShakingSound(durationMs: number = 400) {
	play('shaking', durationMs, false);
}

export function tryVibrate(ms: number = 50) {
	if (!preferences.current.hapticEnabled) return;
	try {
		navigator?.vibrate?.(ms);
	} catch {
		// Vibration not available
	}
}
