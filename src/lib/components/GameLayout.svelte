<script lang="ts">
	/*
	 * Game screen shell shared by local and online play: the always-dark top bar, the
	 * player tabs, and the board — a turn panel (dice, combinations, actions) beside or
	 * above the scorecard depending on the screen.
	 *
	 * Layout rule: the turn panel has a fixed size per breakpoint and the scorecard takes
	 * everything else, so the sheet's rows grow into spare space instead of leaving empty
	 * bands, and the sheet stays put from turn to turn however many combinations a roll has.
	 */
	import type { Snippet } from 'svelte';
	import { base } from '$app/paths';
	import { preferences } from '$lib/stores/preferences.svelte';
	import { isWideBoard } from '$lib/utils/boardLayout';
	import type { ScorecardPart } from './Scorecard.svelte';

	interface Props {
		round: number;
		/** Left-hand top bar action: "Menu" (a link) or "Leave" (a button) */
		leading: { label: string; href?: string; onclick?: () => void };
		/** Short status shown in the top bar, e.g. who has disconnected */
		notice?: string;
		onsettings: () => void;
		tabs: Snippet;
		turn: Snippet;
		/** Renders the scorecard, or one part of it — desktop shows the summary under the turn panel */
		scorecard: Snippet<[ScorecardPart]>;
	}

	let { round, leading, notice, onsettings, tabs, turn, scorecard }: Props = $props();

	let wide = $derived(isWideBoard());
</script>

<!-- The combination size preference sets the card row height the turn panel is sized from -->
<div class="game-page combo-{preferences.current.comboSize}">
	<div class="top-bar">
		{#if leading.href}
			<a href={leading.href} class="top-bar-btn">{leading.label}</a>
		{:else}
			<button class="top-bar-btn" onclick={leading.onclick}>{leading.label}</button>
		{/if}
		<span class="round-label">Round {round}</span>
		{#if notice}
			<span class="notice">{notice}</span>
		{/if}
		<div class="top-bar-right">
			<button class="top-bar-btn" onclick={onsettings}>Settings</button>
			<a href={`${base}/rules`} class="top-bar-btn">Rules</a>
		</div>
	</div>

	<div class="tabs-row">
		{@render tabs()}
	</div>

	<div class="board">
		<div class="turn-panel">
			{@render turn()}
		</div>

		{#if wide}
			<div class="summary-panel">
				{@render scorecard('summary')}
			</div>
		{/if}

		<div class="scorecard-section">
			{@render scorecard(wide ? 'lanes' : 'full')}
		</div>
	</div>
</div>

<style>
	.game-page {
		/*
		 * Combination card row height per size preference (CombinationGrid pins its rows
		 * to it), and the pieces the stacked turn panel's height is built from
		 */
		--combo-row: 58px;
		/* Two full rows plus the top of a third, which peeks out when there are more to scroll to */
		--combo-rows: 2.45;
		--dice-block: 72px; /* 56px dice + DiceDisplay's caption line */
		--score-bar: 44px;
		--turn-gap: var(--space-sm);

		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	.combo-small { --combo-row: 48px; }
	.combo-medium { --combo-row: 53px; }
	.combo-extra_large { --combo-row: 66px; }

	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--chrome-bg);
		color: var(--chrome-text);
	}

	.top-bar-right {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.top-bar-btn {
		min-height: auto;
		padding: 6px 12px;
		border-radius: var(--radius-md);
		color: var(--chrome-accent);
		font-weight: 600;
		font-size: var(--font-size-sm);
	}
	.top-bar-btn:hover { background: var(--chrome-hover); }

	.round-label {
		font-weight: 700;
		font-size: var(--font-size-base);
		line-height: var(--line-height-base);
	}

	.notice {
		font-size: var(--font-size-xs);
		font-style: italic;
		color: var(--warning);
	}

	/* Stacked by default: turn panel above, scorecard filling the rest */
	.board {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding: var(--space-md);
	}

	.turn-panel {
		display: flex;
		flex-direction: column;
		gap: var(--turn-gap);
		min-height: 0;
		min-width: 0;
	}

	/* Never scrolls: the sheet's lanes shrink to fit whatever height is left (Scorecard.svelte) */
	.scorecard-section {
		flex: 1;
		min-height: 0;
		min-width: 0;
		overflow: hidden;
	}

	/*
	 * Stacked (phones and tablets in portrait): the turn panel is exactly dice + N rows of
	 * combinations (N fractional, for the peek) + the score bar. Anything that doesn't fit
	 * scrolls inside the panel. The score bar stays at the bottom, just above the scorecard.
	 * Not clipped: the combinations shrink to fit, and the tumbling dice (Dice3D) poke past
	 * the panel's edges mid-throw.
	 */
	@media (max-width: 1023px) and (min-height: 501px) {
		.turn-panel {
			flex: 0 0 calc(
				var(--dice-block) + var(--turn-gap) +
				var(--combo-rows) * var(--combo-row) + (var(--combo-rows) - 1) * var(--space-sm) + 2 * var(--space-xs) +
				var(--turn-gap) + var(--score-bar)
			);
		}
	}

	/* Portrait phones: tighter page margins */
	@media (max-width: 767px) and (orientation: portrait) {
		.top-bar { padding: var(--space-xs) var(--space-sm); }
		.board {
			gap: var(--space-sm);
			padding: var(--space-sm) var(--space-md) max(var(--space-sm), env(safe-area-inset-bottom));
		}
	}

	/*
	 * Short portrait phones: smaller dice and one visible row of combinations, plus the
	 * top of the next row so it's clear the rest scroll (CombinationGrid keeps the peek).
	 * The scorecard's lanes shrink to make room.
	 */
	@media (max-width: 767px) and (orientation: portrait) and (max-height: 740px) {
		.game-page {
			--dice-block: 64px;
			--combo-rows: 1.45;
			--score-bar: 40px;
		}
	}

	/*
	 * Shortest portrait phones (e.g. Chrome on iOS, whose top and bottom bars stay
	 * visible): slimmer top bar
	 */
	@media (max-width: 767px) and (orientation: portrait) and (max-height: 680px) {
		.top-bar { padding: var(--space-2xs) var(--space-sm); }
		.top-bar-btn { padding: var(--space-xs) 10px; }
		.round-label { font-size: var(--font-size-sm); line-height: var(--line-height-sm); }
	}

	/* Tablets: the extra width fits more cards per row, so roomier spacing */
	@media (min-width: 768px) and (max-width: 1023px) and (min-height: 501px) {
		.game-page { --turn-gap: 12px; }
		.board { gap: var(--space-md); padding: var(--space-md) var(--space-lg) var(--space-lg); }
	}

	/*
	 * Desktop: a fixed-width turn rail on the left and the scorecard filling the rest of
	 * the width and the full height. The tabs share the board's max width so they line up.
	 */
	@media (min-width: 1024px) and (min-height: 501px) {
		.tabs-row,
		.board {
			width: 100%;
			max-width: 1440px;
			margin-inline: auto;
		}
		/*
		 * Left column: the turn panel takes the height the summary card (totals + 5th die)
		 * leaves, with the score bar pinned to its bottom; right column: the lanes, full height
		 */
		.board {
			display: grid;
			/* 460px fits the grouped 68px dice (5 × 68 + 56) inside the panel padding */
			grid-template-columns: 460px minmax(0, 1fr);
			grid-template-rows: minmax(0, 1fr) auto;
			gap: var(--space-lg);
			padding: var(--space-lg) var(--space-xl);
		}
		.turn-panel {
			grid-column: 1;
			grid-row: 1;
			overflow: hidden auto;
			gap: var(--space-lg);
			padding: var(--space-lg);
			background: var(--card-bg);
			border-radius: var(--radius-lg);
			box-shadow: var(--shadow-card);
		}
		.summary-panel {
			grid-column: 1;
			grid-row: 2;
		}
		.scorecard-section {
			grid-column: 2;
			grid-row: 1 / 3;
		}
		/* Combo cards sit on the page colour so they stay distinct inside the panel card */
		.turn-panel :global(.combo-card:not(.selected):not(.invalid)) {
			background: var(--cream);
		}
	}

	/*
	 * Short desktop-width screens (e.g. iPad in landscape, with Safari's toolbars): tighter
	 * spacing so three rows of combinations fit beside the dice without the panel scrolling.
	 * The summary card's 5th-die meters go to a single row (Scorecard.svelte) for the same reason.
	 */
	@media (min-width: 1024px) and (min-height: 501px) and (max-height: 860px) {
		.board { gap: var(--space-sm); padding: var(--space-sm) var(--space-xl); }
		.turn-panel { gap: var(--space-md); padding: var(--space-md); }
	}

	/*
	 * Landscape phones: side by side — a fixed-width turn column and the scorecard, which
	 * moves its 5th-die meters into a column of their own (Scorecard.svelte)
	 */
	@media (orientation: landscape) and (max-height: 500px) {
		.top-bar { padding: var(--space-xs) var(--space-md); flex-wrap: nowrap; }
		.round-label { font-size: var(--font-size-sm); }
		.top-bar-btn { padding: var(--space-xs) var(--space-sm); }

		.board {
			flex-direction: row;
			gap: var(--space-sm);
			padding: var(--space-sm) max(var(--space-sm), env(safe-area-inset-right)) var(--space-sm) max(var(--space-sm), env(safe-area-inset-left));
		}
		/* Not clipped, as when stacked: the combinations shrink to fit, and the dice tumble past its edges */
		.turn-panel {
			flex: 0 0 300px;
		}
	}
</style>
