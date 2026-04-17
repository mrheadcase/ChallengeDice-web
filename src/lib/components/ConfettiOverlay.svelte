<script lang="ts">
	import { CONFETTI_COLORS } from '$lib/game/constants';
	import { onMount } from 'svelte';

	interface Props {
		active?: boolean;
		particleCount?: number;
		duration?: number;
	}

	let { active = false, particleCount = 80, duration = 4000 }: Props = $props();

	let canvas: HTMLCanvasElement = $state(null!);

	interface Particle {
		x: number;
		delay: number;
		speed: number;
		wobbleAmp: number;
		wobbleSpeed: number;
		rotation: number;
		color: string;
		width: number;
		height: number;
		startTime: number;
	}

	onMount(() => {
		if (!active) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const resize = () => {
			canvas.width = canvas.offsetWidth;
			canvas.height = canvas.offsetHeight;
		};
		resize();

		const particles: Particle[] = Array.from({ length: particleCount }, () => ({
			x: Math.random(),
			delay: Math.random() * 0.4,
			speed: 0.5 + Math.random() * 0.8,
			wobbleAmp: 20 + Math.random() * 40,
			wobbleSpeed: 1 + Math.random() * 3,
			rotation: Math.random() * 720 - 360,
			color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
			width: 4 + Math.random() * 6,
			height: 8 + Math.random() * 10,
			startTime: 0,
		}));

		const startTime = performance.now();
		let animId: number;

		function animate(now: number) {
			const elapsed = now - startTime;
			const progress = elapsed / duration;

			if (progress >= 1) {
				ctx!.clearRect(0, 0, canvas.width, canvas.height);
				return;
			}

			ctx!.clearRect(0, 0, canvas.width, canvas.height);

			for (const p of particles) {
				const t = Math.max(0, progress - p.delay) / (1 - p.delay);
				if (t <= 0 || t >= 1) continue;

				const y = t * canvas.height * p.speed;
				const x = p.x * canvas.width + Math.sin(t * p.wobbleSpeed * Math.PI * 2) * p.wobbleAmp;
				const rot = p.rotation * t;

				// Fade out in last 20%
				const alpha = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;

				ctx!.save();
				ctx!.translate(x, y);
				ctx!.rotate((rot * Math.PI) / 180);
				ctx!.globalAlpha = alpha;
				ctx!.fillStyle = p.color;
				ctx!.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
				ctx!.restore();
			}

			animId = requestAnimationFrame(animate);
		}

		animId = requestAnimationFrame(animate);

		return () => cancelAnimationFrame(animId);
	});
</script>

{#if active}
	<canvas bind:this={canvas} class="confetti-overlay"></canvas>
{/if}

<style>
	.confetti-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 1000;
	}
</style>
