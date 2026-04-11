<script lang="ts">
	// Pinch-to-zoom + pan container — matches Android's transformable (0.8x–3x)
	import type { Snippet } from 'svelte';

	interface Props {
		minScale?: number;
		maxScale?: number;
		children: Snippet;
	}

	let {
		minScale = 0.8,
		maxScale = 3,
		children,
	}: Props = $props();

	let container: HTMLDivElement;
	let scale = $state(1);
	let translateX = $state(0);
	let translateY = $state(0);

	// Pinch tracking
	let initialDistance = 0;
	let initialScale = 1;
	let initialMidX = 0;
	let initialMidY = 0;
	let initialTranslateX = 0;
	let initialTranslateY = 0;
	let isPinching = false;

	// Pan tracking (single finger when zoomed)
	let isPanning = false;
	let panStartX = 0;
	let panStartY = 0;
	let panStartTranslateX = 0;
	let panStartTranslateY = 0;

	// Double-tap tracking
	let lastTapTime = 0;

	function getDistance(t1: Touch, t2: Touch): number {
		const dx = t1.clientX - t2.clientX;
		const dy = t1.clientY - t2.clientY;
		return Math.sqrt(dx * dx + dy * dy);
	}

	function clampTranslate() {
		if (!container) return;
		if (scale <= 1) {
			translateX = 0;
			translateY = 0;
			return;
		}
		const rect = container.getBoundingClientRect();
		const maxPanX = (rect.width * (scale - 1)) / 2;
		const maxPanY = (rect.height * (scale - 1)) / 2;
		translateX = Math.max(-maxPanX, Math.min(maxPanX, translateX));
		translateY = Math.max(-maxPanY, Math.min(maxPanY, translateY));
	}

	function handleTouchStart(e: TouchEvent) {
		if (e.touches.length === 2) {
			isPinching = true;
			isPanning = false;
			initialDistance = getDistance(e.touches[0], e.touches[1]);
			initialScale = scale;
			initialMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
			initialMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
			initialTranslateX = translateX;
			initialTranslateY = translateY;
			e.preventDefault();
		} else if (e.touches.length === 1 && scale > 1) {
			isPanning = true;
			panStartX = e.touches[0].clientX;
			panStartY = e.touches[0].clientY;
			panStartTranslateX = translateX;
			panStartTranslateY = translateY;
		}
	}

	function handleTouchMove(e: TouchEvent) {
		if (isPinching && e.touches.length === 2) {
			e.preventDefault();
			const dist = getDistance(e.touches[0], e.touches[1]);
			const newScale = Math.max(minScale, Math.min(maxScale, initialScale * (dist / initialDistance)));

			// Pan follows the midpoint
			const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
			const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

			scale = newScale;
			translateX = initialTranslateX + (midX - initialMidX);
			translateY = initialTranslateY + (midY - initialMidY);
			clampTranslate();
		} else if (isPanning && e.touches.length === 1) {
			e.preventDefault();
			translateX = panStartTranslateX + (e.touches[0].clientX - panStartX);
			translateY = panStartTranslateY + (e.touches[0].clientY - panStartY);
			clampTranslate();
		}
	}

	function handleTouchEnd(e: TouchEvent) {
		if (isPinching && e.touches.length < 2) {
			isPinching = false;
			clampTranslate();
		}
		if (e.touches.length === 0) {
			isPanning = false;

			// Double-tap detection
			const now = Date.now();
			if (now - lastTapTime < 300) {
				// Reset zoom
				scale = 1;
				translateX = 0;
				translateY = 0;
			}
			lastTapTime = now;
		}
	}
</script>

<div
	class="pinch-zoom-container"
	bind:this={container}
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
>
	<div
		class="pinch-zoom-content"
		style="transform: scale({scale}) translate({translateX / scale}px, {translateY / scale}px)"
	>
		{@render children()}
	</div>
</div>

<style>
	.pinch-zoom-container {
		overflow: auto;
		touch-action: pan-x pan-y;
		width: 100%;
		height: 100%;
	}

	.pinch-zoom-content {
		transform-origin: center center;
		will-change: transform;
	}
</style>
