<script lang="ts">
	import type { DiceCombination, Scorecard } from '$lib/game/models';
	import { tick } from 'svelte';
	import CombinationCard from './CombinationCard.svelte';
	import { preferences } from '$lib/stores/preferences.svelte';

	interface Props {
		combinations: DiceCombination[];
		validCombinations: DiceCombination[];
		scorecard: Scorecard;
		selectedCombination?: DiceCombination | null;
		onselect?: (combo: DiceCombination) => void;
	}

	let {
		combinations,
		validCombinations,
		scorecard,
		selectedCombination = null,
		onselect,
	}: Props = $props();

	let prefs = $derived(preferences.current);

	function comboKey(c: DiceCombination): string {
		return `${c.pair1Sum}-${c.pair2Sum}-${c.fifthDie}`;
	}

	let sortedCombinations = $derived.by(() => {
		const validSet = new Set(validCombinations.map(comboKey));
		const valid = combinations.filter(c => validSet.has(comboKey(c)));
		const invalid = combinations.filter(c => !validSet.has(comboKey(c)));

		const mode = prefs.comboSortMode;
		if (mode === 'pairs_desc') {
			// Default order from generateCombinations — no re-sort needed
			return [...valid, ...invalid];
		}

		const comparator = (a: DiceCombination, b: DiceCombination): number => {
			switch (mode) {
				case 'pairs_asc':
					return (a.pair1Sum - b.pair1Sum) || (a.pair2Sum - b.pair2Sum) || (a.fifthDie - b.fifthDie);
				case 'fifth_asc':
					return (a.fifthDie - b.fifthDie) || (b.pair1Sum - a.pair1Sum) || (b.pair2Sum - a.pair2Sum);
				case 'fifth_desc':
					return (b.fifthDie - a.fifthDie) || (b.pair1Sum - a.pair1Sum) || (b.pair2Sum - a.pair2Sum);
				default:
					return 0;
			}
		};

		return [...valid.sort(comparator), ...invalid.sort(comparator)];
	});

	let invalidMessage = $state('');
	let invalidTimeout: ReturnType<typeof setTimeout> | null = null;

	function showInvalidMessage(reason: string) {
		invalidMessage = reason;
		if (invalidTimeout) clearTimeout(invalidTimeout);
		invalidTimeout = setTimeout(() => { invalidMessage = ''; }, 2000);
	}

	// Which edges have hidden cards beyond them — drives the scroll fades
	let gridEl = $state<HTMLDivElement>();
	let moreAbove = $state(false);
	let moreBelow = $state(false);

	function updateOverflow() {
		if (!gridEl) return;
		const { scrollTop, scrollHeight, clientHeight } = gridEl;
		// A few px of slack (padding, sub-pixel rounding) isn't a hidden row
		moreAbove = scrollTop > 4;
		moreBelow = scrollTop + clientHeight < scrollHeight - 4;
	}

	$effect(() => {
		if (!gridEl) return;
		const ro = new ResizeObserver(updateOverflow);
		ro.observe(gridEl);
		return () => ro.disconnect();
	});

	// The card count changes every roll without resizing the grid itself
	$effect(() => {
		sortedCombinations;
		updateOverflow();
	});

	/*
	 * Selecting a card can shrink the grid (the Score It button replaces the hint on
	 * phones), so scroll the grid itself, never the page, to keep that card in view.
	 */
	$effect(() => {
		if (!selectedCombination || !gridEl) return;
		const grid = gridEl;
		tick().then(() => {
			const card = grid.querySelector<HTMLElement>('.combo-card.selected');
			if (!card) return;
			const g = grid.getBoundingClientRect();
			const c = card.getBoundingClientRect();
			if (c.top < g.top) grid.scrollTop -= g.top - c.top + 4;
			else if (c.bottom > g.bottom) grid.scrollTop += c.bottom - g.bottom + 4;
			updateOverflow();
		});
	});

	function isSelected(combo: DiceCombination): boolean {
		if (!selectedCombination) return false;
		return combo.pair1Sum === selectedCombination.pair1Sum
			&& combo.pair2Sum === selectedCombination.pair2Sum
			&& combo.fifthDie === selectedCombination.fifthDie;
	}
</script>

<div class="combo-wrapper">
{#if invalidMessage}
	<div class="invalid-toast">{invalidMessage}</div>
{/if}
<div
	class="combo-grid size-{prefs.comboSize}"
	class:more-above={moreAbove}
	class:more-below={moreBelow}
	bind:this={gridEl}
	onscroll={updateOverflow}
>
	{#each sortedCombinations as combo}
		<CombinationCard
			combination={combo}
			{scorecard}
			selected={isSelected(combo)}
			size={prefs.comboSize}
			{onselect}
			oninvalidselect={showInvalidMessage}
		/>
	{/each}
</div>
</div>

<style>
	.combo-wrapper {
		position: relative;
		width: 100%;
	}

	/*
	 * Columns stretch so the grid spans the full board width, lining up with the
	 * scorecard's edges. Rows are pinned to their content height: when the grid is
	 * squeezed (e.g. the Score It button appears), WebKit would otherwise shrink the
	 * rows and push each card's points line onto its border.
	 */
	.combo-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--combo-col), 1fr));
		/* Fixed row height from GameLayout (per card size), so the turn panel can be sized in rows */
		grid-auto-rows: var(--combo-row, max-content);
		gap: var(--space-sm);
		/* Room for the selected card's shadow inside the scroll area, pulled back out so card edges align with the scorecard */
		padding: var(--space-xs);
		margin-inline: calc(-1 * var(--space-xs));
		width: calc(100% + 2 * var(--space-xs));
		overflow-y: auto;
		max-height: 140px;
		--fade-top: 0px;
		--fade-bottom: 0px;
		mask-image: linear-gradient(
			to bottom,
			transparent,
			#000 var(--fade-top),
			#000 calc(100% - var(--fade-bottom)),
			transparent
		);
	}

	/* Minimum column width per card-size preference — fits two two-digit chips plus the 5th-die chip */
	.size-small { --combo-col: 88px; }
	.size-medium { --combo-col: 96px; }
	.size-large { --combo-col: 104px; }
	.size-extra_large { --combo-col: 128px; }

	/* Fade whichever edge has more cards beyond it, so a cut-off row reads as scrollable */
	.combo-grid.more-above { --fade-top: 20px; }
	.combo-grid.more-below { --fade-bottom: 20px; }

	.invalid-toast {
		position: absolute;
		top: calc(-1 * var(--space-lg));
		left: 50%;
		transform: translateX(-50%);
		text-align: center;
		font-size: var(--font-size-sm);
		font-weight: 600;
		line-height: var(--line-height-sm);
		color: var(--score-negative);
		background: var(--cream);
		padding: var(--space-2xs) 12px;
		border-radius: var(--radius-md);
		z-index: 10;
		white-space: nowrap;
	}

	@media (min-width: 768px) {
		.combo-grid {
			max-height: 300px;
		}
	}

	/*
	 * Stacked layouts (phones and tablets in portrait): the turn panel has a fixed height.
	 * The wrapper takes the room between the dice and the action bar, so the action bar
	 * stays in the same place every turn; the grid shrinks to that room and scrolls.
	 */
	@media (max-width: 1023px) and (min-height: 501px) {
		.combo-wrapper {
			flex: 1 1 auto;
			min-height: 0;
			display: flex;
			flex-direction: column;
		}
		.combo-grid {
			flex: 0 1 auto;
			min-height: 0;
			max-height: none;
			align-content: start;
		}
	}

	/* Landscape on phones — cap height so it doesn't swallow the scorecard side */
	@media (orientation: landscape) and (max-height: 500px) {
		.combo-grid {
			max-height: 120px;
			gap: var(--space-xs);
		}
	}
</style>
