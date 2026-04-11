<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { localGame } from '$lib/stores/localGame.svelte';
	import { calculateScore } from '$lib/game/logic';
	import { PLAYER_COLORS } from '$lib/game/constants';
	import Scorecard from '$lib/components/Scorecard.svelte';
	import PinchZoomContainer from '$lib/components/PinchZoomContainer.svelte';
	import ConfettiOverlay from '$lib/components/ConfettiOverlay.svelte';

	import { onMount } from 'svelte';

	let showConfetti = $state(true);
	let viewingPlayerId = $state(0);

	let state = $derived(localGame.gameState);
	let allScores = $derived(
		state.players.map(p => ({
			player: p,
			score: calculateScore(p.scorecard),
		})).sort((a, b) => b.score.totalScore - a.score.totalScore)
	);
	let winner = $derived(allScores[0]);
	let viewingPlayer = $derived(state.players.find(p => p.id === viewingPlayerId));

	// Redirect if no game over state
	$effect(() => {
		if (state.phase !== 'GAME_OVER' || state.players.length === 0) {
			goto(base || '/');
		}
	});

	onMount(() => {
		const timer = setTimeout(() => { showConfetti = false; }, 4000);
		return () => clearTimeout(timer);
	});
</script>

<div class="gameover-page">
	<ConfettiOverlay active={showConfetti} />

	<header class="gameover-header">
		<h2>Game Over!</h2>
	</header>

	<!-- Winner card -->
	{#if winner}
		{@const colors = PLAYER_COLORS[winner.player.color]}
		<div class="winner-card" style:border-color={colors.primary}>
			<div class="winner-crown">Winner</div>
			<div class="winner-name" style:color={colors.primary}>{winner.player.name}</div>
			<div class="winner-score">{winner.score.totalScore}</div>
			<div class="winner-details">
				<span class="positive">+{winner.score.positiveTotal}</span>
				<span class="negative">{winner.score.negativeTotal}</span>
			</div>
		</div>
	{/if}

	<!-- All player scores -->
	<div class="scores-list">
		{#each allScores as { player, score }, i}
			{@const colors = PLAYER_COLORS[player.color]}
			<button
				class="score-row"
				class:active={viewingPlayerId === player.id}
				onclick={() => { viewingPlayerId = player.id; }}
			>
				<span class="rank">#{i + 1}</span>
				<span class="color-dot" style:background={colors.primary}></span>
				<span class="name">{player.name}</span>
				{#if player.isAI}<span class="ai-tag">AI</span>{/if}
				{#if !player.isActive}<span class="elim-tag">Eliminated</span>{/if}
				<span class="total" class:positive={score.totalScore > 0} class:negative={score.totalScore < 0}>
					{score.totalScore}
				</span>
			</button>
		{/each}
	</div>

	<!-- Scorecard viewer -->
	{#if viewingPlayer}
		<div class="scorecard-viewer">
			<PinchZoomContainer>
				<Scorecard scorecard={viewingPlayer.scorecard} playerColor={viewingPlayer.color} compact />
			</PinchZoomContainer>
		</div>
	{/if}

	<!-- Action buttons -->
	<div class="actions">
		<button class="action-btn primary" onclick={() => { localGame.rematch(); goto(`${base}/play/game`); }}>
			Rematch
		</button>
		<button class="action-btn secondary" onclick={() => goto(`${base}/play/setup`)}>
			New Game
		</button>
		<button class="action-btn tertiary" onclick={() => { localGame.resetGame(); goto(base || '/'); }}>
			Main Menu
		</button>
	</div>
</div>

<style>
	.gameover-page {
		display: flex;
		flex-direction: column;
		gap: 12px;
		height: 100%;
		padding: 16px;
		overflow-y: auto;
		align-items: center;
	}

	.gameover-header h2 {
		font-size: var(--font-size-2xl);
		color: var(--gold-amber);
		text-align: center;
	}

	.winner-card {
		background: var(--card-bg);
		border: 3px solid;
		border-radius: var(--radius-xl);
		padding: 16px 32px;
		text-align: center;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
	}

	.winner-crown {
		font-size: var(--font-size-sm);
		color: var(--gold-amber);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 2px;
	}

	.winner-name {
		font-size: var(--font-size-xl);
		font-weight: 800;
	}

	.winner-score {
		font-size: var(--font-size-2xl);
		font-weight: 800;
		color: var(--text-dark);
	}

	.winner-details {
		display: flex;
		gap: 16px;
		justify-content: center;
		font-weight: 600;
	}

	.scores-list {
		width: 100%;
		max-width: 400px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.score-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		background: var(--card-bg);
		border-radius: var(--radius-md);
		border: 2px solid transparent;
		text-align: left;
	}

	.score-row.active { border-color: var(--gold-amber); }
	.rank { font-weight: 700; color: var(--text-muted); width: 24px; }
	.color-dot { width: 10px; height: 10px; border-radius: 50%; }
	.name { flex: 1; font-weight: 600; }
	.ai-tag {
		font-size: 10px; background: var(--text-muted); color: white;
		padding: 1px 4px; border-radius: 3px;
	}
	.elim-tag {
		font-size: 10px; background: var(--score-negative); color: white;
		padding: 1px 4px; border-radius: 3px;
	}
	.total { font-weight: 700; }

	.positive { color: var(--score-positive); }
	.negative { color: var(--score-negative); }

	.scorecard-viewer {
		width: 100%;
		max-width: 500px;
		overflow: auto;
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
		max-width: 320px;
		padding-top: 8px;
	}

	.action-btn {
		padding: 12px;
		border-radius: var(--radius-lg);
		font-weight: 700;
		font-size: var(--font-size-base);
	}

	.action-btn.primary { background: var(--btn-primary-bg); color: var(--btn-primary-text); }
	.action-btn.secondary { background: var(--card-bg); border: 2px solid var(--gold-amber); color: var(--gold-amber); }
	.action-btn.tertiary { background: var(--card-bg); border: 2px solid var(--warm-tan); color: var(--text-medium); }
</style>
