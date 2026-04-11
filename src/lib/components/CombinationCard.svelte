<script lang="ts">
	import type { DiceCombination, Scorecard } from '$lib/game/models';
	import type { ComboSize } from '$lib/stores/preferences.svelte';
	import { getInvalidReason } from '$lib/game/logic';

	interface Props {
		combination: DiceCombination;
		scorecard: Scorecard;
		selected?: boolean;
		size?: ComboSize;
		onselect?: (combo: DiceCombination) => void;
	}

	let {
		combination,
		scorecard,
		selected = false,
		size = 'large',
		onselect,
	}: Props = $props();

	let invalidReason = $derived(getInvalidReason(combination, scorecard));
	let isValid = $derived(!invalidReason);
</script>

<button
	class="combo-card size-{size}"
	class:selected
	class:invalid={!isValid}
	disabled={!isValid}
	onclick={() => onselect?.(combination)}
	aria-label="Pair {combination.pair1Sum} and {combination.pair2Sum}, fifth die {combination.fifthDie}"
>
	<div class="pair-sums">
		<span class="pair1">{combination.pair1Sum}</span>
		<span class="separator">+</span>
		<span class="pair2">{combination.pair2Sum}</span>
	</div>
	<div class="fifth">
		<span class="fifth-label">5th</span>
		<span class="fifth-value">{combination.fifthDie}</span>
	</div>
	{#if invalidReason}
		<div class="reason">{invalidReason}</div>
	{/if}
</button>

<style>
	.combo-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 8px;
		border: 2px solid var(--warm-tan);
		border-radius: var(--radius-md);
		background: var(--card-bg);
		cursor: pointer;
		transition: all var(--transition-fast);
		min-width: fit-content;
	}

	.combo-card:hover:not(:disabled) {
		border-color: var(--gold-amber);
		box-shadow: 0 2px 8px rgba(196, 122, 16, 0.2);
	}

	.combo-card.selected {
		border-color: var(--gold-amber);
		background: var(--pale-gold);
		box-shadow: 0 2px 12px rgba(196, 122, 16, 0.3);
	}

	.combo-card.invalid {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.pair-sums {
		display: flex;
		align-items: center;
		gap: 4px;
		font-weight: 700;
		font-size: var(--font-size-lg);
	}

	.pair1 { color: #1565C0; }
	.pair2 { color: #2E7D32; }
	.separator { color: var(--text-muted); font-weight: 400; }

	.fifth {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: var(--font-size-sm);
	}

	.fifth-label {
		color: var(--text-muted);
		font-size: var(--font-size-xs);
	}

	.fifth-value {
		color: #E65100;
		font-weight: 700;
	}

	.reason {
		font-size: 10px;
		color: var(--score-negative);
		text-align: center;
		line-height: 1.2;
	}

	/* Size variants */
	.combo-card.size-small {
		padding: 4px;
		gap: 1px;
		min-width: 60px;
	}
	.size-small .pair-sums { font-size: var(--font-size-sm); gap: 2px; }
	.size-small .fifth { font-size: var(--font-size-xs); }
	.size-small .fifth-label { font-size: 9px; }
	.size-small .reason { font-size: 8px; }

	.combo-card.size-medium {
		padding: 6px;
		min-width: 70px;
	}
	.size-medium .pair-sums { font-size: var(--font-size-base); }
	.size-medium .fifth { font-size: var(--font-size-xs); }

	/* large is the default — no overrides needed */

	.combo-card.size-extra_large {
		padding: 12px;
		gap: 4px;
		min-width: 110px;
	}
	.size-extra_large .pair-sums { font-size: var(--font-size-xl); gap: 6px; }
	.size-extra_large .fifth { font-size: var(--font-size-base); gap: 6px; }
	.size-extra_large .fifth-label { font-size: var(--font-size-sm); }
</style>
