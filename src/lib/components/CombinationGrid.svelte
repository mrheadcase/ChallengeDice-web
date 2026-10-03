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
	// Height taken off the bottom of the grid so its edge cuts through a card (see peekTrim)
	let trim = $state(0);

	// How much of the cut-off card stays visible when the grid overflows
	const PEEK_MIN = 0.3;
	const PEEK_MAX = 0.6;

	/*
	 * When there are more cards than fit, the grid's bottom edge has to cut through a
	 * card row, so players can see there's more to scroll to. If the edge lands between rows (or
	 * shows only a sliver the fade would hide), shorten the grid until the last visible
	 * row shows 30–60% of its height. Uses only the space the layout already gives the grid,
	 * so nothing around it moves.
	 */
	function peekTrim(grid: HTMLDivElement, available: number): number {
		const card = grid.firstElementChild as HTMLElement | null;
		if (!card || grid.scrollHeight <= available + 1) return 0;
		const style = getComputedStyle(grid);
		const row = card.offsetHeight;
		const period = row + (parseFloat(style.rowGap) || 0);
		// How far into a row (from that row's top) the bottom edge falls
		const rows = available - (parseFloat(style.paddingTop) || 0);
		const into = rows % period;
		if (into >= row * PEEK_MIN && into <= row * PEEK_MAX) return 0;
		const cut = into > row * PEEK_MAX
			// Too much of the row is showing, or the edge sits in the gap: cut this row back
			? into - row * PEEK_MAX
			// Only a sliver of the next row: cut the row above back instead
			: into + period - row * PEEK_MAX;
		// Never into the first row — with room for only one, show it whole
		return rows - cut < row ? 0 : cut;
	}

	function updateOverflow() {
		if (!gridEl) return;
		// The trim is a bottom margin that shrinks the grid 1:1, so add it back to get the room the layout gives it
		const available = gridEl.clientHeight + trim;
		const next = Math.round(peekTrim(gridEl, available));
		if (next !== trim) trim = next;
		const { scrollTop, scrollHeight } = gridEl;
		const visible = available - next;
		// A few px of slack (padding, sub-pixel rounding) isn't a hidden row
		moreAbove = scrollTop > 4;
		moreBelow = scrollTop + visible < scrollHeight - 4;
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
			else if (c.bottom > g.bottom) {
				// Bring the card in along with a peek of the row below it, as far as the card's own top allows
				const gap = parseFloat(getComputedStyle(grid).rowGap) || 0;
				const withPeek = c.bottom + gap + c.height * PEEK_MIN * 1.5 - g.bottom;
				grid.scrollTop += Math.min(withPeek, c.top - g.top - 4);
			}
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
	style:margin-bottom="{trim}px"
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
	/*
	 * Every game layout gives the turn panel a fixed height: the wrapper takes all the room
	 * between the dice and the action bar, so the bar stays in the same place every turn,
	 * and the grid shrinks to it and scrolls
	 */
	.combo-wrapper {
		position: relative;
		width: 100%;
		flex: 1 1 auto;
		min-height: 0;
		display: flex;
		flex-direction: column;
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
		flex: 0 1 auto;
		min-height: 0;
		align-content: start;
		overflow-y: auto;
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

	/*
	 * Fade whichever edge has more cards beyond it, so a cut-off row reads as scrollable.
	 * Short enough that the peeking row (30–60% of a card) still shows its chips.
	 */
	.combo-grid.more-above { --fade-top: 16px; }
	.combo-grid.more-below { --fade-bottom: 16px; }

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

	/* Landscape on phones: tighter gaps for the narrow turn column */
	@media (orientation: landscape) and (max-height: 500px) {
		.combo-grid { gap: var(--space-xs); }
	}
</style>
