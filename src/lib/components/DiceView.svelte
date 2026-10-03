<script lang="ts">
	// SVG dice component — ported from DiceView.kt
	// Colours come from --die-face / --die-edge / --die-pip (app.css), so callers tint a die with a class

	interface Props {
		value: number;
		size?: number;
		rotationDegrees?: number;
	}

	let {
		value,
		size = 56,
		rotationDegrees = 0,
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
</script>

<!-- Rotation is set per frame while rolling, so it stays an inline transform -->
<svg
	width={size}
	height={size}
	viewBox="0 0 100 100"
	style:transform={rotationDegrees ? `rotate(${rotationDegrees}deg)` : undefined}
	role="img"
	aria-label="Die showing {value}"
>
	<rect
		class="face"
		x="1.5" y="1.5" width="97" height="97"
		rx={cornerRadius * 100}
		ry={cornerRadius * 100}
	/>
	{#each dots as [cx, cy]}
		<circle class="pip" cx={cx * 100} cy={cy * 100} r={dotRadius * 100} />
	{/each}
</svg>

<style>
	svg {
		display: block;
		flex-shrink: 0;
		transition: transform 300ms ease;
	}

	/* Edge is 3% of the die's size at any size (viewBox units) */
	.face {
		fill: var(--die-face);
		stroke: var(--die-edge);
		stroke-width: 3;
	}

	.pip {
		fill: var(--die-pip);
	}
</style>
