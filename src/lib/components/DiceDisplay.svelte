<script lang="ts">
	// Row of 5 dice with roll animation — ported from GameComponents.kt DiceDisplayRow
	import DiceView from './DiceView.svelte';
	import type { DiceCombination } from '$lib/game/models';

	interface Props {
		diceValues: number[];
		selectedCombination?: DiceCombination | null;
		rolling?: boolean;
		diceSize?: number;
	}

	let {
		diceValues,
		selectedCombination = null,
		rolling = false,
		diceSize = 56,
	}: Props = $props();

	// Temporary random values shown during rolling animation
	let rollingValues = $state([1, 1, 1, 1, 1]);
	let settledCount = $state(5);
	let rollingInterval: ReturnType<typeof setInterval> | null = null;

	function getHighlightColor(index: number): string | undefined {
		if (!selectedCombination || rolling) return undefined;
		// Map dice indices to combination parts
		// This is a simplified highlight — in the full version, dice are grouped by pair
		return undefined;
	}

	$effect(() => {
		if (rolling) {
			settledCount = 0;
			rollingInterval = setInterval(() => {
				rollingValues = Array.from({ length: 5 }, () => Math.floor(Math.random() * 6) + 1);
			}, 80);

			// Stagger settlement
			for (let i = 0; i < 5; i++) {
				setTimeout(() => {
					settledCount = i + 1;
					if (i === 4 && rollingInterval) {
						clearInterval(rollingInterval);
						rollingInterval = null;
					}
				}, 500 + i * 100);
			}
		}

		return () => {
			if (rollingInterval) {
				clearInterval(rollingInterval);
				rollingInterval = null;
			}
		};
	});

	function displayValue(index: number): number {
		if (!rolling) return diceValues[index] ?? 1;
		if (index < settledCount) return diceValues[index] ?? 1;
		return rollingValues[index];
	}

	function rotation(index: number): number {
		if (!rolling) return 0;
		if (index < settledCount) return 0;
		return Math.sin(Date.now() / 100 + index) * 30;
	}
</script>

<div class="dice-row" class:rolling>
	{#each Array(5) as _, i}
		<div
			class="die-wrapper"
			class:settled={!rolling || i < settledCount}
			style="animation-delay: {i * 80}ms"
		>
			<DiceView
				value={displayValue(i)}
				size={diceSize}
				rotationDegrees={rotation(i)}
				highlightColor={getHighlightColor(i)}
			/>
		</div>
	{/each}
</div>

<style>
	.dice-row {
		display: flex;
		gap: 8px;
		justify-content: center;
		align-items: center;
		padding: 8px;
	}

	.die-wrapper {
		transition: transform 300ms ease, opacity 300ms ease;
	}

	.die-wrapper.settled {
		transform: translateY(0);
		opacity: 1;
	}

	.rolling .die-wrapper:not(.settled) {
		animation: diceShake 150ms ease-in-out infinite;
	}

	@keyframes diceShake {
		0%, 100% { transform: translateY(0) rotate(0deg); }
		25% { transform: translateY(-4px) rotate(-5deg); }
		75% { transform: translateY(4px) rotate(5deg); }
	}
</style>
