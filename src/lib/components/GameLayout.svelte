<script lang="ts">
	/*
	 * Game screen shell shared by local and online play: the always-dark top bar, the
	 * player tabs, and the board — a turn panel (dice, combinations, actions) beside or
	 * above the scorecard depending on the screen.
	 */
	import type { Snippet } from 'svelte';
	import { base } from '$app/paths';

	interface Props {
		round: number;
		/** Left-hand top bar action: "Menu" (a link) or "Leave" (a button) */
		leading: { label: string; href?: string; onclick?: () => void };
		/** Short status shown in the top bar, e.g. who has disconnected */
		notice?: string;
		onsettings: () => void;
		tabs: Snippet;
		turn: Snippet;
		scorecard: Snippet;
	}

	let { round, leading, notice, onsettings, tabs, turn, scorecard }: Props = $props();
</script>

<div class="game-page">
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

		<div class="scorecard-section">
			{@render scorecard()}
		</div>
	</div>
</div>

<style>
	.game-page {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

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

	/* Outer margin + gap between the turn panel and the scorecard */
	.board {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding: var(--space-md);
		overflow: hidden;
	}

	/* Larger gaps between the turn steps: status → dice → combinations → action */
	.turn-panel {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
		flex-shrink: 0;
	}

	/* Size container so the scorecard's cells can scale to the space it gets */
	.scorecard-section {
		flex: 1;
		overflow: auto;
		min-height: 0;
		container-type: inline-size;
	}

	/*
	 * Desktop: a centred board with the turn panel on the left and the scorecard,
	 * sized to its grid, on the right. The tabs share the same max width so they
	 * line up with the board edge.
	 */
	@media (min-width: 1024px) and (min-height: 501px) {
		.tabs-row,
		.board {
			width: 100%;
			max-width: 1120px;
			margin-inline: auto;
		}
		/*
		 * One grid row sized by the scorecard (capped at the available height), so the
		 * turn panel and the scorecard always render as equal-height cards.
		 */
		.board {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto;
			grid-template-rows: fit-content(100%);
			align-content: start;
			gap: var(--space-xl);
			padding: var(--space-lg);
		}
		.turn-panel {
			min-height: 0;
			overflow-y: auto;
			justify-content: center;
			padding: var(--space-lg);
			background: var(--card-bg);
			border-radius: var(--radius-lg);
			box-shadow: var(--shadow-card);
		}
		/* Combo cards sit on the page colour so they stay distinct inside the panel card */
		.turn-panel :global(.combo-card:not(.selected):not(.invalid)) {
			background: var(--cream);
		}
		/* Cells are already at full size here, so size to content instead */
		.scorecard-section {
			container-type: normal;
		}
	}

	/*
	 * Portrait phones: the turn panel always fills exactly the space above the scorecard,
	 * so the scorecard stays put from turn to turn however many combinations there are.
	 * Content stacks from the top — dice, then the combinations right under them, then the
	 * action bar — with any spare space left at the bottom of the panel; the grid scrolls
	 * when they don't fit. The scorecard is capped so the panel keeps ~200px; on very
	 * short screens it scrolls.
	 */
	@media (max-width: 767px) and (orientation: portrait) {
		.top-bar { padding: var(--space-xs) var(--space-sm); }
		.board {
			gap: var(--space-sm);
			padding: var(--space-sm) var(--space-md) max(var(--space-sm), env(safe-area-inset-bottom));
		}
		.turn-panel {
			flex: 1 1 0;
			min-height: 0;
			gap: var(--space-sm);
		}
		.scorecard-section {
			flex: 0 0 auto;
			max-height: calc(100% - 200px - var(--space-sm));
		}
	}

	/* Short portrait phones: the turn panel can give up a little more for a full scorecard */
	@media (max-width: 767px) and (orientation: portrait) and (max-height: 740px) {
		.scorecard-section {
			max-height: calc(100% - 172px - var(--space-sm));
		}
	}

	/*
	 * Shortest portrait phones (e.g. Chrome on iOS, whose top and bottom bars stay
	 * visible): slimmer top bar, and a little less held back for the turn panel.
	 */
	@media (max-width: 767px) and (orientation: portrait) and (max-height: 680px) {
		.top-bar { padding: var(--space-2xs) var(--space-sm); }
		.top-bar-btn { padding: var(--space-xs) 10px; }
		.round-label { font-size: var(--font-size-sm); line-height: var(--line-height-sm); }
		.scorecard-section {
			max-height: calc(100% - 160px - var(--space-sm));
		}
	}

	/* Landscape on phones — switch to side-by-side to fit the short viewport height */
	@media (orientation: landscape) and (max-height: 500px) {
		.top-bar { padding: var(--space-xs) var(--space-md); flex-wrap: nowrap; }
		.round-label { font-size: var(--font-size-sm); }
		.top-bar-btn { padding: var(--space-xs) var(--space-sm); }

		.board {
			flex-direction: row;
			gap: var(--space-sm);
			padding: var(--space-sm);
		}
		.turn-panel {
			flex: 1 1 50%;
			gap: var(--space-sm);
			overflow-y: auto;
			min-height: 0;
		}
		.scorecard-section {
			flex: 1 1 50%;
		}
	}
</style>
