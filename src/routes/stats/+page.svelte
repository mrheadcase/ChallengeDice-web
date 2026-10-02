<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { base } from '$app/paths';
	import {
		getHighScores,
		getAllCategories,
		getCategoryLabel,
		type ScoreCategory,
		type HighScoreEntry
	} from '$lib/stores/highScores';
	import { getGameHistory, clearGameHistory, type GameHistoryEntry } from '$lib/stores/gameHistory';

	let activeTab = $state<'scores' | 'history'>('scores');
	let activeCategory = $state<ScoreCategory>('solo');

	let scores = $derived(getHighScores(activeCategory));
	let gameHistoryEntries = $state<GameHistoryEntry[]>([]);

	$effect(() => {
		if (activeTab === 'history') {
			gameHistoryEntries = getGameHistory();
		}
	});

	function formatDate(ts: number): string {
		return new Date(ts).toLocaleDateString(undefined, {
			month: 'short', day: 'numeric', year: 'numeric'
		});
	}
</script>

<div class="stats-page">
	<PageHeader title="Stats & History" onback={() => window.history.back()} />

	<!-- Tabs -->
	<div class="tabs">
		<button class="tab" class:active={activeTab === 'scores'} onclick={() => activeTab = 'scores'}>
			High Scores
		</button>
		<button class="tab" class:active={activeTab === 'history'} onclick={() => activeTab = 'history'}>
			Game History
		</button>
	</div>

	{#if activeTab === 'scores'}
		<!-- Category pills -->
		<div class="category-pills">
			{#each getAllCategories() as cat}
				<button
					class="pill"
					class:active={activeCategory === cat}
					onclick={() => activeCategory = cat}
				>{getCategoryLabel(cat)}</button>
			{/each}
		</div>

		<!-- Scores list -->
		<div class="list">
			{#if scores.length === 0}
				<div class="empty">No high scores yet in this category.</div>
			{:else}
				{#each scores as entry, i}
					<div class="score-entry">
						<span class="rank">#{i + 1}</span>
						<div class="score-details">
							<div class="score-main">
								<span class="score-name">{entry.playerName}</span>
								<span class="score-value" class:positive={entry.totalScore > 0} class:negative={entry.totalScore < 0}>
									{entry.totalScore}
								</span>
							</div>
							<div class="score-meta">
								<span>{entry.rounds} rounds</span>
								<span>{entry.won ? 'Won' : entry.eliminatedRound ? `Eliminated R${entry.eliminatedRound}` : 'Lost'}</span>
								<span>{formatDate(entry.date)}</span>
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	{:else}
		<!-- History list -->
		<div class="list">
			{#if gameHistoryEntries.length === 0}
				<div class="empty">No games played yet.</div>
			{:else}
				{#each gameHistoryEntries as game}
					<div class="history-entry">
						<div class="history-header">
							<span class="history-type">{game.gameType.replaceAll('_', ' ')}</span>
							<span class="history-date">{formatDate(game.date)}</span>
						</div>
						<div class="history-meta">
							{game.roundsPlayed} rounds • {game.naturalCompletion ? 'Completed' : 'Elimination'}
						</div>
						<div class="history-players">
							{#each [...game.players].sort((a, b) => b.score - a.score) as player, i}
								<div class="history-player">
									<span class="hp-rank">#{i + 1}</span>
									<span class="player-dot hp-dot" data-player={player.color}></span>
									<span class="hp-name">{player.name}{player.isAI ? ' (AI)' : ''}</span>
									<span class="hp-score" class:positive={player.score > 0} class:negative={player.score < 0}>
										{player.score}
									</span>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			{/if}
		</div>
	{/if}
</div>

<style>
	.stats-page {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.tabs {
		display: flex;
		gap: 0;
		padding: 0 var(--space-md);
	}

	.tab {
		flex: 1;
		padding: 10px;
		font-weight: 600;
		color: var(--text-muted);
		border-bottom: 2px solid transparent;
		transition: all var(--transition-fast);
	}

	.tab.active {
		color: var(--gold-amber);
		border-bottom-color: var(--gold-amber);
	}

	.category-pills {
		display: flex;
		gap: 6px;
		padding: 12px var(--space-md);
		overflow-x: auto;
		scrollbar-width: none;
	}
	.category-pills::-webkit-scrollbar { display: none; }

	.pill {
		padding: 6px 12px;
		border-radius: var(--radius-full);
		font-size: var(--font-size-sm);
		font-weight: 600;
		white-space: nowrap;
		background: var(--card-bg);
		color: var(--text-medium);
		border: 1px solid var(--warm-tan);
	}

	.pill.active {
		background: var(--gold-amber);
		color: var(--text-on-color);
		border-color: var(--gold-amber);
	}

	.list {
		flex: 1;
		overflow-y: auto;
		padding: 0 var(--space-md) var(--space-md);
	}

	.empty {
		text-align: center;
		color: var(--text-muted);
		padding: 48px var(--space-md);
	}

	.score-entry {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		background: var(--card-bg);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-sm);
	}

	.rank { font-weight: 700; color: var(--text-muted); width: 28px; }

	.score-details { flex: 1; }

	.score-main {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.score-name { font-weight: 600; }
	.score-value { font-weight: 700; font-size: var(--font-size-lg); }

	.score-meta {
		display: flex;
		gap: 12px;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		margin-top: var(--space-2xs);
	}

	.history-entry {
		background: var(--card-bg);
		border-radius: var(--radius-md);
		padding: 12px;
		margin-bottom: var(--space-sm);
	}

	.history-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: var(--space-xs);
	}

	.history-type {
		font-weight: 700;
		text-transform: capitalize;
		color: var(--text-dark);
	}

	.history-date { font-size: var(--font-size-xs); color: var(--text-muted); }

	.history-meta {
		font-size: var(--font-size-sm);
		color: var(--text-medium);
		margin-bottom: var(--space-sm);
	}

	.history-players {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.history-player {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: var(--font-size-sm);
	}

	.hp-rank { color: var(--text-muted); width: 20px; }
	.hp-dot { width: 8px; height: 8px; }
	.hp-name { flex: 1; }
	.hp-score { font-weight: 700; }

	.positive { color: var(--score-positive); }
	.negative { color: var(--score-negative); }
</style>
