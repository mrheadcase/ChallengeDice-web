<script lang="ts">
	/*
	 * A die as a CSS 3D cube (DiceDisplay uses it unless motion is reduced). While rolling it's
	 * tossed in from the player's side of the board, on a slight curve, and comes down a little
	 * off its spot, tumbling with real faces; once rolling ends it turns onto the face for
	 * `value` and slides into place, a little more spin and a last hop easing it to rest. The value
	 * isn't needed until then: online games only learn it when the roll comes back.
	 *
	 * Animated with requestAnimationFrame writing transforms straight to the elements, so a
	 * frame costs a few style writes and no Svelte updates.
	 */
	import DiceView from './DiceView.svelte';

	interface Props {
		value: number;
		size: number;
		rolling: boolean;
		/** Turn to be thrown in, 0–4 (shuffled each roll), for staggering the throw */
		throwSlot: number;
		/**
		 * Direction the roll comes from, in degrees: 0 is straight up from below the row,
		 * negative from the lower left, positive from the lower right. Shared by the five dice.
		 */
		throwAngle: number;
		/** Turn to land in, 0–4 (shuffled each roll), for staggering the landing */
		landSlot: number;
		/** Called when the die comes to rest after a roll */
		onlanded?: () => void;
	}

	let { value, size, rolling, throwSlot, throwAngle, landSlot, onlanded }: Props = $props();

	// Where each face sits on the cube: a real die, opposite faces adding up to 7
	const FACES: { value: number; transform: string }[] = [
		{ value: 1, transform: 'rotateY(0deg)' },
		{ value: 6, transform: 'rotateY(180deg)' },
		{ value: 3, transform: 'rotateY(90deg)' },
		{ value: 4, transform: 'rotateY(-90deg)' },
		{ value: 2, transform: 'rotateX(90deg)' },
		{ value: 5, transform: 'rotateX(-90deg)' },
	];

	// Cube rotation [x, y] that turns each value's face towards the viewer
	const FACE_UP: Record<number, [number, number]> = {
		1: [0, 0],
		6: [0, 180],
		3: [0, -90],
		4: [0, 90],
		2: [-90, 0],
		5: [90, 0],
	};

	const THROW_MS = 650;
	const SETTLE_MS = 560;
	const STAGGER_MS = 70;
	const THROW_STAGGER_MS = 45;

	let moverEl = $state<HTMLDivElement>();
	let cubeEl = $state<HTMLDivElement>();
	let shadowEl = $state<HTMLDivElement>();

	// Current pose: rotation in degrees, offset from the die's spot and height above the board in px
	const pose = { rx: 0, ry: 0, rz: 0, x: 0, y: 0, h: 0 };
	let frame = 0;

	function render() {
		if (!moverEl || !cubeEl || !shadowEl) return;
		// Seen from above, higher off the board reads as nearer: a little larger (never moved up,
		// which the turn panel would clip), with a softer, smaller shadow. Lift is 0–1 at any die size.
		const lift = Math.min(pose.h / (46 * (size / 68)), 1);
		moverEl.style.transform = `translate3d(${pose.x}px, ${pose.y}px, 0) scale(${1 + lift * 0.14})`;
		cubeEl.style.transform =
			`translateZ(${-size / 2}px) rotateZ(${pose.rz}deg) rotateX(${pose.rx}deg) rotateY(${pose.ry}deg)`;
		shadowEl.style.transform = `translate(${pose.x}px, ${pose.y}px) scale(${1 - lift * 0.35})`;
		shadowEl.style.opacity = String(0.5 - lift * 0.3);
	}

	/*
	 * At rest only the top face can show, so the core is hidden: seen edge-on its planes can
	 * otherwise draw as hairlines across the face
	 */
	function setResting(resting: boolean) {
		cubeEl?.classList.toggle('resting', resting);
	}

	function rest(v: number) {
		cancelAnimationFrame(frame);
		tumbling = false;
		const [rx, ry] = FACE_UP[v] ?? FACE_UP[1];
		Object.assign(pose, { rx, ry, rz: 0, x: 0, y: 0, h: 0 });
		render();
		setResting(true);
	}

	const rand = (min: number, max: number) => min + Math.random() * (max - min);
	const sign = () => (Math.random() < 0.5 ? -1 : 1);
	const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

	// Spin rates in deg/s for the current roll
	let spin = { x: 0, y: 0, z: 0 };
	// Set when the roll ends: when this die's own landing starts, and the value it lands on
	let landing: { at: number; value: number } | null = null;
	let tumbling = false;

	/*
	 * One animation loop for the whole roll: thrown in, rattling until the result is in, then
	 * — at this die's turn in the landing order — straight into its landing. It keeps
	 * tumbling while it waits its turn, so no die ever pauses before it lands.
	 */
	function tumble() {
		cancelAnimationFrame(frame);
		setResting(false);
		landing = null;
		tumbling = true;
		spin = { x: sign() * rand(620, 900), y: sign() * rand(520, 820), z: sign() * rand(90, 260) };
		// Throw distance and bounce height scale with the die, so small phone dice stay in their row
		const k = size / 68;
		// Each die leaves the hand a little differently: its own angle, distance and curve
		const a = ((throwAngle + rand(-14, 14)) * Math.PI) / 180;
		const dist = rand(190, 270) * k;
		const from = { x: Math.sin(a) * dist, y: Math.cos(a) * dist };
		// Sideways bow, perpendicular to the throw, fading out as the die arrives
		const curve = rand(-50, 50) * k;
		const bow = { x: Math.cos(a) * curve, y: -Math.sin(a) * curve };
		// Comes down a little off its spot, then slides home as it settles
		const scatter = { x: rand(-0.32, 0.32) * size, y: rand(-0.22, 0.22) * size };
		const delay = throwSlot * THROW_STAGGER_MS;
		let start = 0;
		let last = 0;

		const step = (now: number) => {
			if (!start) start = last = now;
			if (landing && now >= landing.at) {
				// Spin on to the exact moment the landing starts, then straight into it, drawing
				// its first frame now so the motion never skips or stutters
				const lead = (landing.at - last) / 1000;
				pose.rx += spin.x * lead;
				pose.ry += spin.y * lead;
				pose.rz += spin.z * lead;
				tumbling = false;
				land(landing.value, landing.at, now);
				return;
			}
			const dt = (now - last) / 1000;
			last = now;
			const t = Math.max(0, now - start - delay);
			pose.rx += spin.x * dt;
			pose.ry += spin.y * dt;
			pose.rz += spin.z * dt;
			if (t < THROW_MS) {
				const p = t / THROW_MS;
				const e = easeOut(p);
				const arc = Math.sin(Math.PI * p);
				pose.x = from.x + (scatter.x - from.x) * e + bow.x * arc;
				pose.y = from.y + (scatter.y - from.y) * e + bow.y * arc;
				// Thrown in high, then two shrinking bounces
				pose.h = 46 * k * Math.exp(-3.2 * p) * Math.abs(Math.cos(p * Math.PI * 2.5));
			} else {
				pose.x = scatter.x;
				pose.y = scatter.y;
				// Rattling on the board until the result is in
				pose.h = 3 * k * Math.abs(Math.sin((t - THROW_MS) / 70));
			}
			render();
			frame = requestAnimationFrame(step);
		};
		frame = requestAnimationFrame(step);
	}

	/** The nearest angle ≡ base (mod period) that is at least `min` degrees further along `dir` */
	function ahead(from: number, base: number, dir: number, min: number, period = 360): number {
		const goal = from + dir * min;
		const n = dir > 0 ? Math.ceil((goal - base) / period) : Math.floor((goal - base) / period);
		return base + n * period;
	}

	/*
	 * Where one rotation axis stops. The landing eases each axis on a curve that starts at the
	 * die's own spin rate and comes smoothly to rest (cubic Hermite), so the spin never speeds
	 * up or snags as the landing takes over. The stop is the first angle showing the right
	 * face that's far enough ahead for that curve not to overshoot: at least rate × time / 3.
	 */
	function axisLanding(from: number, base: number, rate: number, min: number, period = 360) {
		const dir = Math.sign(rate) || 1;
		const sweep = Math.abs(rate) * (SETTLE_MS / 1000);
		const to = ahead(from, base, dir, Math.max(min, sweep / 3), period);
		return { from, d: to - from, m0: dir * sweep, to };
	}

	/** Position on an axis's landing curve, u from 0 to 1 */
	function axisAt(a: { from: number; d: number; m0: number }, u: number): number {
		const u2 = u * u;
		const u3 = u2 * u;
		return a.from + (u3 - 2 * u2 + u) * a.m0 + (-2 * u3 + 3 * u2) * a.d;
	}

	/** Lands on `v`, the landing timed from `begin`; given `now`, draws its first frame immediately */
	function land(v: number, begin: number, now?: number) {
		const [bx, by] = FACE_UP[v] ?? FACE_UP[1];
		const from = { ...pose };
		const ax = axisLanding(from.rx, bx, spin.x, 60);
		const ay = axisLanding(from.ry, by, spin.y, 60);
		// Lands square to the board, at a quarter turn
		const az = axisLanding(from.rz, 0, spin.z, 15, 90);

		const step = (now: number) => {
			// Not started yet when landing straight from rest (no roll animation to finish)
			const t = Math.max(0, now - begin);
			const p = Math.min(t / SETTLE_MS, 1);
			pose.rx = axisAt(ax, p);
			pose.ry = axisAt(ay, p);
			pose.rz = axisAt(az, p);
			const e = easeOut(p);
			pose.x = from.x * (1 - e);
			pose.y = from.y * (1 - e);
			// One last small hop, then down
			pose.h = from.h * (1 - e) + (p < 0.55 ? 10 * (size / 68) * Math.sin((p / 0.55) * Math.PI) : 0);
			render();
			if (p < 1) frame = requestAnimationFrame(step);
			else {
				// Keep the angles small so they don't grow roll after roll
				pose.rx = bx;
				pose.ry = by;
				pose.rz = ((az.to % 360) + 360) % 360;
				render();
				setResting(true);
				onlanded?.();
			}
		};
		if (now !== undefined) step(now);
		else frame = requestAnimationFrame(step);
	}

	// The roll is over: land at this die's turn in the (shuffled) landing order
	function settle(v: number) {
		const at = performance.now() + landSlot * STAGGER_MS;
		if (tumbling) landing = { at, value: v };
		else {
			cancelAnimationFrame(frame);
			land(v, at);
		}
	}

	// Rolling drives the animation; the value is only read when the die lands
	let wasRolling = false;
	$effect(() => {
		const r = rolling;
		const v = value;
		if (!cubeEl) return;
		if (r && !wasRolling) tumble();
		else if (!r && wasRolling) settle(v);
		else if (!r) rest(v);
		wasRolling = r;
	});

	$effect(() => () => cancelAnimationFrame(frame));
</script>

<div class="die3d" style:width="{size}px" style:height="{size}px" style:--size="{size}px" role="img" aria-label="Die showing {value}">
	<div class="shadow" bind:this={shadowEl}></div>
	<div class="mover" bind:this={moverEl}>
		<div class="cube" bind:this={cubeEl} aria-hidden="true">
			<!-- Solid core so the rounded corners never show through to the inside -->
			<div class="core"></div>
			<div class="core" style:transform="rotateX(90deg)"></div>
			<div class="core" style:transform="rotateY(90deg)"></div>
			{#each FACES as face (face.value)}
				<div class="face" style:transform="{face.transform} translateZ({size / 2}px)">
					<DiceView value={face.value} {size} />
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.die3d {
		position: relative;
		flex-shrink: 0;
		/* A long perspective keeps the resting die looking flat and square */
		perspective: calc(var(--size) * 6);
	}

	.mover,
	.cube,
	.face,
	.core {
		position: absolute;
		inset: 0;
		transform-style: preserve-3d;
	}

	.mover {
		will-change: transform;
	}

	.face {
		backface-visibility: hidden;
	}

	.cube:global(.resting) .core {
		visibility: hidden;
	}

	.core {
		inset: 4%;
		border-radius: 12%;
		background: var(--die-face);
	}

	.shadow {
		position: absolute;
		left: 8%;
		right: 8%;
		bottom: -6%;
		height: 18%;
		border-radius: 50%;
		background: radial-gradient(closest-side, rgba(0, 0, 0, 0.55), transparent);
		opacity: 0.5;
		pointer-events: none;
	}
</style>
