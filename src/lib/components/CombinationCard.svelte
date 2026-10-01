<script lang="ts">
	import type { DiceCombination, Scorecard } from '$lib/game/models';
	import type { ComboSize } from '$lib/stores/preferences.svelte';
	import { applySelection, calculateScore, getInvalidReason } from '$lib/game/logic';
	import DiceView from './DiceView.svelte';

	interface Props {
		combination: DiceCombination;
		scorecard: Scorecard;
		selected?: boolean;
		size?: ComboSize;
		onselect?: (combo: DiceCombination) => void;
		oninvalidselect?: (reason: string) => void;
	}

	let {
		combination,
		scorecard,
		selected = false,
		size = 'large',
		onselect,
		oninvalidselect,
	}: Props = $props();

	// 5th-die face size per card size, roughly matching the chip text height
	const DIE_SIZE: Record<ComboSize, number> = {
		small: 13,
		medium: 15,
		large: 17,
		extra_large: 21,
	};
	// Fixed hex (not a CSS var) because it's passed to an SVG stroke attribute
	const FIFTH_STROKE = '#E65100';

	let invalidReason = $derived(getInvalidReason(combination, scorecard));
	let isValid = $derived(!invalidReason);

	// How much this combination would change the player's total score
	let impact = $derived(
		isValid
			? calculateScore(applySelection(scorecard, combination)).totalScore - calculateScore(scorecard).totalScore
			: 0
	);
	let impactText = $derived(impact > 0 ? `+${impact} pts` : impact < 0 ? `−${Math.abs(impact)} pts` : '0 pts');

	function handleClick() {
		if (isValid) {
			onselect?.(combination);
		} else if (invalidReason) {
			oninvalidselect?.(invalidReason);
		}
	}
</script>

<button
	class="combo-card size-{size}"
	class:selected
	class:invalid={!isValid}
	onclick={handleClick}
	aria-label="Pair {combination.pair1Sum} and {combination.pair2Sum}, fifth die {combination.fifthDie}, {isValid ? impactText : invalidReason}"
>
	<!-- Role chips: pair 1 (blue), pair 2 (green), 5th die (orange) — same colours as the dice highlights -->
	<span class="chips">
		<span class="chip pair1">{combination.pair1Sum}</span>
		<span class="chip pair2">{combination.pair2Sum}</span>
		<span class="chip fifth">
			<DiceView value={combination.fifthDie} size={DIE_SIZE[size]} borderColor={FIFTH_STROKE} />
		</span>
	</span>
	{#if isValid}
		<span class="impact" class:gain={impact > 0} class:loss={impact < 0}>{impactText}</span>
	{:else}
		<span class="reason">{invalidReason}</span>
	{/if}
</button>

<style>
	.combo-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		padding: 6px;
		border: 2px solid var(--warm-tan);
		border-radius: var(--radius-md);
		background: var(--card-bg);
		cursor: pointer;
		transition: all var(--transition-fast);
		width: 100%;
		line-height: var(--line-height-tight);
		font-variant-numeric: tabular-nums;
		--chip-font: var(--font-size-base);
	}

	.combo-card:hover:not(.invalid) {
		border-color: var(--gold-amber);
		box-shadow: 0 2px 8px rgba(196, 122, 16, 0.2);
	}

	.combo-card.selected {
		border-color: var(--gold-amber);
		background: var(--pale-gold);
		box-shadow: 0 2px 12px rgba(196, 122, 16, 0.3);
	}

	/* Unavailable: dashed outline and a visible reason instead of fading the whole card */
	.combo-card.invalid {
		cursor: not-allowed;
		border-style: dashed;
		background: transparent;
	}

	.invalid .chips {
		opacity: 0.45;
	}

	.chips {
		display: flex;
		gap: 3px;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.6em;
		height: 1.5em;
		padding: 0 4px;
		border-radius: var(--radius-sm);
		font-size: var(--chip-font);
		font-weight: 700;
	}

	.chip.pair1 {
		color: var(--combo-pair1);
		background: color-mix(in srgb, var(--combo-pair1) 16%, transparent);
	}

	.chip.pair2 {
		color: var(--combo-pair2);
		background: color-mix(in srgb, var(--combo-pair2) 16%, transparent);
	}

	.chip.fifth {
		min-width: 1.5em;
		padding: 0 3px;
		background: color-mix(in srgb, var(--combo-fifth) 20%, transparent);
	}

	.impact,
	.reason {
		font-size: var(--font-size-2xs);
		font-weight: 600;
		color: var(--text-medium);
		white-space: nowrap;
	}

	.impact.gain { color: var(--score-positive); }
	.impact.loss { color: var(--score-negative); }

	/* Size variants — chip text steps through the type scale (xs / sm / base / lg) */
	.size-small { --chip-font: var(--font-size-xs); padding: 4px; }
	.size-medium { --chip-font: var(--font-size-sm); padding: 5px; }
	.size-extra_large { --chip-font: var(--font-size-lg); padding: 8px; }
	.size-extra_large .impact,
	.size-extra_large .reason { font-size: var(--font-size-xs); }
</style>
