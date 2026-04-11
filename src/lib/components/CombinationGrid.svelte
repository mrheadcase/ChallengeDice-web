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

	const SIZE_MAP: Record<ComboSize, string> = {
		small: 'minmax(70px, 1fr)',
		medium: 'minmax(85px, 1fr)',
		large: 'minmax(100px, 1fr)',
		extra_large: 'minmax(130px, 1fr)',
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

	function isSelected(combo: DiceCombination): boolean {
		if (!selectedCombination) return false;
		return combo.pair1Sum === selectedCombination.pair1Sum
			&& combo.pair2Sum === selectedCombination.pair2Sum
			&& combo.fifthDie === selectedCombination.fifthDie;
	}
</script>

<div class="combo-grid" style="grid-template-columns: repeat(auto-fill, {SIZE_MAP[prefs.comboSize]})">
	{#each sortedCombinations as combo}
		<CombinationCard
			combination={combo}
			{scorecard}
			selected={isSelected(combo)}
			size={prefs.comboSize}
			{onselect}
		/>
	{/each}
</div>

<style>
	.combo-grid {
		display: grid;
		gap: 8px;
		padding: 8px;
		overflow-y: auto;
		max-height: 240px;
		width: 100%;
	}

	@media (min-width: 768px) {
		.combo-grid {
			max-height: 300px;
		}
	}
</style>
