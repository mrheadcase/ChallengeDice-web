// Sound effects — Web Audio API
// Architecture ready; actual sound files loaded later

let audioContext: AudioContext | null = null;

function getContext(): AudioContext {
	if (!audioContext) {
		audioContext = new AudioContext();
	}
	return audioContext;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
	try {
		const ctx = getContext();
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = type;
		osc.frequency.value = frequency;
		gain.gain.value = 0.1;
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start();
		osc.stop(ctx.currentTime + duration);
	} catch {
		// Audio not available
	}
}

export function playRollSound() {
	// Quick rattle effect
	for (let i = 0; i < 5; i++) {
		setTimeout(() => playTone(200 + Math.random() * 400, 0.05, 'square'), i * 40);
	}
}

export function playSelectSound() {
	playTone(800, 0.1, 'sine');
}

export function playErrorSound() {
	playTone(200, 0.2, 'sawtooth');
}

export function playGameOverSound() {
	playTone(523, 0.15);
	setTimeout(() => playTone(659, 0.15), 150);
	setTimeout(() => playTone(784, 0.3), 300);
}

export function tryVibrate(ms: number = 50) {
	try {
		navigator?.vibrate?.(ms);
	} catch {
		// Vibration not available
	}
}
