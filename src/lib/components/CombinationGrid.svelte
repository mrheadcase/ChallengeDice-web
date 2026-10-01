<script lang="ts">
	import type { DiceCombination, Scorecard } from '$lib/game/models';
	import CombinationCard from './CombinationCard.svelte';
	import { preferences, type ComboSize } from '$lib/stores/preferences.svelte';

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

	// Fixed column width per card size — wide enough for two-digit pair sums ("10 + 12")
	const SIZE_MAP: Record<ComboSize, string> = {
		small: '64px',
		medium: '76px',
		large: '88px',
		extra_large: '112px',
	};

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
<div class="combo-grid" style:--combo-col={SIZE_MAP[prefs.comboSize]}>
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
	}

	/* auto-fit collapses unused tracks so the cards centre under the dice */
	.combo-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, var(--combo-col));
		justify-content: center;
		gap: var(--space-sm);
		/* Room for the selected card's shadow inside the scroll area */
		padding: var(--space-xs);
		overflow-y: auto;
		max-height: 140px;
		width: 100%;
	}

	.invalid-toast {
		position: absolute;
		top: -24px;
		left: 50%;
		transform: translateX(-50%);
		text-align: center;
		font-size: var(--font-size-sm);
		font-weight: 600;
		line-height: var(--line-height-sm);
		color: var(--score-negative);
		background: var(--cream);
		padding: 2px 12px;
		border-radius: var(--radius-md);
		z-index: 10;
		white-space: nowrap;
	}

	@media (min-width: 768px) {
		.combo-grid {
			max-height: 300px;
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
