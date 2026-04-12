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
	let enteringDice = $state(false);
	let enteredCount = $state(5);
	let rollingInterval: ReturnType<typeof setInterval> | null = null;
	let prevRolling = false;

	const PAIR1_COLOR = '#1565C0'; // blue
	const PAIR2_COLOR = '#2E7D32'; // green
	const FIFTH_COLOR = '#E65100'; // orange

	function getDiceHighlights(values: number[], combo: DiceCombination | null | undefined): (string | null)[] {
		if (!combo) return values.map(() => null);

		const colors: (string | null)[] = values.map(() => null);
		const used: boolean[] = values.map(() => false);

		// Match pair 1
		for (const dieValue of [combo.pair1Dice[0], combo.pair1Dice[1]]) {
			for (let i = 0; i < values.length; i++) {
				if (!used[i] && values[i] === dieValue) {
					colors[i] = PAIR1_COLOR;
					used[i] = true;
					break;
				}
			}
		}
		// Match pair 2
		for (const dieValue of [combo.pair2Dice[0], combo.pair2Dice[1]]) {
			for (let i = 0; i < values.length; i++) {
				if (!used[i] && values[i] === dieValue) {
					colors[i] = PAIR2_COLOR;
					used[i] = true;
					break;
				}
			}
		}
		// Match 5th die
		for (let i = 0; i < values.length; i++) {
			if (!used[i] && values[i] === combo.fifthDie) {
				colors[i] = FIFTH_COLOR;
				used[i] = true;
				break;
			}
		}

		return colors;
	}

	// Compute regrouped order: pair1 dice, pair2 dice, fifth die, then any unmatched
	function getRegroupedOrder(highlights: (string | null)[]): number[] {
		const order: number[] = [];
		highlights.forEach((c, i) => { if (c === PAIR1_COLOR) order.push(i); });
		highlights.forEach((c, i) => { if (c === PAIR2_COLOR) order.push(i); });
		highlights.forEach((c, i) => { if (c === FIFTH_COLOR) order.push(i); });
		highlights.forEach((_, i) => { if (!order.includes(i)) order.push(i); });
		return order;
	}

	let diceHighlights = $derived(rolling ? diceValues.map(() => null) : getDiceHighlights(diceValues, selectedCombination));
	let hasCombo = $derived(diceHighlights.some(c => c !== null));

	// Map each original index to its target slot position
	function getTargetSlots(highlights: (string | null)[]): number[] {
		const order = getRegroupedOrder(highlights);
		const slots = Array(5).fill(0);
		order.forEach((origIdx, slot) => { slots[origIdx] = slot; });
		return slots;
	}

	let targetSlots = $derived(hasCombo ? getTargetSlots(diceHighlights) : [0, 1, 2, 3, 4]);

	// Calculate X offset to move die from its natural position to target slot
	// Each die occupies diceSize + gap(8px). Groups have extra 12px gap after slots 1 and 3.
	function getTranslateX(origIdx: number): number {
		if (!hasCombo) return 0;
		const step = diceSize + 8;
		const targetSlot = targetSlots[origIdx];
		// Target position: account for group gaps after slot 1 and slot 3
		let targetX = targetSlot * step;
		if (targetSlot >= 2) targetX += 12;
		if (targetSlot >= 4) targetX += 12;
		// Natural position
		const naturalX = origIdx * step;
		// Shift everything left by half the extra gap width to keep centered
		const totalExtraGap = 24; // 12px after pair1 + 12px after pair2
		return targetX - naturalX - totalExtraGap / 2;
	}

	$effect.pre(() => {
		if (rolling && !prevRolling) {
			// Immediately hide dice offscreen
			settledCount = 0;
			enteringDice = true;
			enteredCount = 0;
		}
		prevRolling = rolling;
	});

	$effect(() => {
		if (rolling && enteringDice && enteredCount === 0) {
			// Start random values
			rollingInterval = setInterval(() => {
				rollingValues = Array.from({ length: 5 }, () => Math.floor(Math.random() * 6) + 1);
			}, 80);

			// Stagger dice sliding in
			for (let i = 0; i < 5; i++) {
				setTimeout(() => {
					enteredCount = i + 1;
				}, 100 + i * 100);
			}

			// After all entered, stop entrance mode and start settling
			setTimeout(() => {
				enteringDice = false;
				for (let i = 0; i < 5; i++) {
					setTimeout(() => {
						settledCount = i + 1;
						if (i === 4 && rollingInterval) {
							clearInterval(rollingInterval);
							rollingInterval = null;
						}
					}, 200 + i * 100);
				}
			}, 100 + 5 * 100 + 50);
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
		if (enteringDice && index >= enteredCount) return rollingValues[index];
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
		{@const highlight = diceHighlights[i]}
		<div
			class="die-wrapper"
			class:settled={!rolling || i < settledCount}
			class:offscreen={enteringDice && i >= enteredCount}
			class:entering={enteringDice && i < enteredCount}
			style="animation-delay: {i * 80}ms; transform: translateX({getTranslateX(i)}px)"
		>
			<DiceView
				value={displayValue(i)}
				size={diceSize}
				rotationDegrees={rotation(i)}
				borderColor={highlight ?? '#555555'}
				backgroundColor={highlight ? `color-mix(in srgb, ${highlight} 15%, #FFFFFF)` : '#FFFFFF'}
			/>
		</div>
	{/each}
</div>
{#if hasCombo}
	<div class="dice-legend">
		<span class="legend-item" style="color: {PAIR1_COLOR}">Pair 1</span>
		<span class="legend-item" style="color: {PAIR2_COLOR}">Pair 2</span>
		<span class="legend-item" style="color: {FIFTH_COLOR}">5th</span>
	</div>
{/if}

<style>
	.dice-row {
		display: flex;
		gap: 8px;
		justify-content: center;
		align-items: center;
		padding: 8px;
	}

	.die-wrapper {
		transition: transform 400ms ease, opacity 300ms ease;
	}

	.die-wrapper.offscreen {
		transform: translateX(-200px) rotate(-90deg) !important;
		opacity: 0;
	}

	.die-wrapper.entering {
		transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease;
		opacity: 1;
	}

	.die-wrapper.settled {
		opacity: 1;
	}

	.rolling .die-wrapper:not(.settled):not(.offscreen):not(.entering) {
		animation: diceShake 150ms ease-in-out infinite;
	}

	@keyframes diceShake {
		0%, 100% { transform: translateY(0) rotate(0deg); }
		25% { transform: translateY(-4px) rotate(-5deg); }
		75% { transform: translateY(4px) rotate(5deg); }
	}

	.dice-legend {
		display: flex;
		justify-content: center;
		gap: 16px;
		font-size: var(--font-size-xs);
		font-weight: 700;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 4px;
	}
</style>
