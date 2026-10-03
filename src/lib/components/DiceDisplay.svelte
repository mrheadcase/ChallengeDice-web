<script lang="ts">
	// Row of 5 dice with roll animation — ported from GameComponents.kt DiceDisplayRow
	import DiceView from './DiceView.svelte';
	import Dice3D from './Dice3D.svelte';
	import type { DiceCombination } from '$lib/game/models';
	import { MediaQuery } from 'svelte/reactivity';

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

	// Real 3D cubes that tumble and land (Dice3D); the flat dice below when motion is reduced
	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');
	let use3d = $derived(!reducedMotion.current);

	// Temporary random values shown during rolling animation
	let rollingValues = $state([1, 1, 1, 1, 1]);
	let settledCount = $state(5);
	let enteringDice = $state(false);
	let enteredCount = $state(5);
	let rollingInterval: ReturnType<typeof setInterval> | null = null;
	let prevRolling = false;

	// Role each die plays in the selected combination; colours come from the .role-* classes
	type DieRole = 'pair1' | 'pair2' | 'fifth';

	// Caption for each group, anchored to the die that lands in the group's first slot
	const GROUP_LABELS: Record<number, { role: DieRole; dice: number }> = {
		0: { role: 'pair1', dice: 2 },
		2: { role: 'pair2', dice: 2 },
		4: { role: 'fifth', dice: 1 },
	};

	// Pairs are labelled with their sum — the scorecard row they mark, as on the combo chips
	function groupText(role: DieRole): string {
		if (role === 'pair1') return String(selectedCombination?.pair1Sum ?? '');
		if (role === 'pair2') return String(selectedCombination?.pair2Sum ?? '');
		return '5th';
	}

	function getDiceHighlights(values: number[], combo: DiceCombination | null | undefined): (DieRole | null)[] {
		if (!combo) return values.map(() => null);

		const roles: (DieRole | null)[] = values.map(() => null);
		const used: boolean[] = values.map(() => false);

		// Match pair 1
		for (const dieValue of [combo.pair1Dice[0], combo.pair1Dice[1]]) {
			for (let i = 0; i < values.length; i++) {
				if (!used[i] && values[i] === dieValue) {
					roles[i] = 'pair1';
					used[i] = true;
					break;
				}
			}
		}
		// Match pair 2
		for (const dieValue of [combo.pair2Dice[0], combo.pair2Dice[1]]) {
			for (let i = 0; i < values.length; i++) {
				if (!used[i] && values[i] === dieValue) {
					roles[i] = 'pair2';
					used[i] = true;
					break;
				}
			}
		}
		// Match 5th die
		for (let i = 0; i < values.length; i++) {
			if (!used[i] && values[i] === combo.fifthDie) {
				roles[i] = 'fifth';
				used[i] = true;
				break;
			}
		}

		return roles;
	}

	// Compute regrouped order: pair1 dice, pair2 dice, fifth die, then any unmatched
	function getRegroupedOrder(highlights: (DieRole | null)[]): number[] {
		const order: number[] = [];
		highlights.forEach((r, i) => { if (r === 'pair1') order.push(i); });
		highlights.forEach((r, i) => { if (r === 'pair2') order.push(i); });
		highlights.forEach((r, i) => { if (r === 'fifth') order.push(i); });
		highlights.forEach((_, i) => { if (!order.includes(i)) order.push(i); });
		return order;
	}

	let diceHighlights = $derived(rolling ? diceValues.map(() => null) : getDiceHighlights(diceValues, selectedCombination));
	let hasCombo = $derived(diceHighlights.some(c => c !== null));

	// Map each original index to its target slot position
	function getTargetSlots(highlights: (DieRole | null)[]): number[] {
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
		{@const role = diceHighlights[i]}
		{@const groupLabel = hasCombo && role ? GROUP_LABELS[targetSlots[i]] : undefined}
		<!-- Entrance stagger and regroup offset are computed per die, so they stay inline -->
		<div
			class="die-wrapper {role ? `role-${role}` : ''}"
			class:settled={use3d || !rolling || i < settledCount}
			class:offscreen={!use3d && enteringDice && i >= enteredCount}
			class:entering={!use3d && enteringDice && i < enteredCount}
			style:animation-delay="{i * 80}ms"
			style:transform="translateX({getTranslateX(i)}px)"
		>
			{#if use3d}
				<Dice3D value={diceValues[i] ?? 1} size={diceSize} {rolling} index={i} />
			{:else}
				<DiceView value={displayValue(i)} size={diceSize} rotationDegrees={rotation(i)} />
			{/if}
			{#if groupLabel}
				<span class="group-label" class:span-2={groupLabel.dice === 2}>{groupText(groupLabel.role)}</span>
			{/if}
		</div>
	{/each}
</div>

<style>
	/* Bottom padding always reserves the caption line so selecting a combo doesn't shift the layout */
	.dice-row {
		display: flex;
		gap: var(--space-sm);
		justify-content: center;
		align-items: center;
		padding-bottom: var(--space-md);
	}

	.die-wrapper {
		position: relative;
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

	/* Die colours for each role in the selected combination — same colours as the combo chips */
	.role-pair1 { --role: var(--combo-pair1); }
	.role-pair2 { --role: var(--combo-pair2); }
	.role-fifth { --role: var(--combo-fifth); }

	.die-wrapper[class*='role-'] {
		--die-edge: var(--role);
		--die-face: color-mix(in srgb, var(--role) 15%, var(--die-white));
	}

	/*
	 * A pill spanning its group: one die, or two dice plus the gap between them. 14px tall
	 * at 2px below the dice, so it fits the caption line the row reserves.
	 */
	.group-label {
		position: absolute;
		top: calc(100% + var(--space-2xs));
		left: 0;
		width: 100%;
		height: 14px;
		display: grid;
		place-items: center;
		border-radius: var(--radius-full);
		background: color-mix(in srgb, var(--role) 18%, transparent);
		color: var(--role);
		font-family: var(--font-numeric);
		font-size: var(--font-size-xs);
		font-weight: 700;
		line-height: 1;
		white-space: nowrap;
	}

	.group-label.span-2 {
		width: calc(200% + var(--space-sm));
	}
</style>
