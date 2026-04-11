<script lang="ts">
	// SVG dice component — ported from DiceView.kt

	interface Props {
		value: number;
		size?: number;
		backgroundColor?: string;
		dotColor?: string;
		borderColor?: string;
		rotationDegrees?: number;
		highlighted?: boolean;
		highlightColor?: string;
	}

	let {
		value,
		size = 56,
		backgroundColor = '#FFFFFF',
		dotColor = '#000000',
		borderColor = '#555555',
		rotationDegrees = 0,
		highlighted = false,
		highlightColor = 'transparent',
	}: Props = $props();

	const padding = 0.22;
	const dotRadius = 0.07;
	const cornerRadius = 0.15;

	function getDotPositions(v: number): Array<[number, number]> {
		const left = padding;
		const center = 0.5;
		const right = 1 - padding;
		const top = padding;
		const bottom = 1 - padding;

		const safe = Math.max(1, Math.min(6, v));
		switch (safe) {
			case 1: return [[center, center]];
			case 2: return [[left, top], [right, bottom]];
			case 3: return [[left, top], [center, center], [right, bottom]];
			case 4: return [[left, top], [right, top], [left, bottom], [right, bottom]];
			case 5: return [[left, top], [right, top], [center, center], [left, bottom], [right, bottom]];
			case 6: return [[left, top], [right, top], [left, center], [right, center], [left, bottom], [right, bottom]];
			default: return [];
		}
	}

	let dots = $derived(getDotPositions(value));
	let borderWidth = $derived(size * 0.03);
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 100 100"
	style="transform: rotate({rotationDegrees}deg)"
	role="img"
	aria-label="Die showing {value}"
>
	<!-- Background -->
	<rect
		x="1.5" y="1.5" width="97" height="97"
		rx={cornerRadius * 100}
		ry={cornerRadius * 100}
		fill={highlighted ? highlightColor : backgroundColor}
		stroke={borderColor}
		stroke-width={borderWidth / size * 100}
	/>

	<!-- Dots -->
	{#each dots as [cx, cy]}
		<circle
			cx={cx * 100}
			cy={cy * 100}
			r={dotRadius * 100}
			fill={dotColor}
		/>
	{/each}
</svg>

<style>
	svg {
		display: block;
		flex-shrink: 0;
		transition: transform 300ms ease;
	}
</style>
