<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { localGame } from '$lib/stores/localGame.svelte';
	import GameResults from '$lib/components/GameResults.svelte';

	let gameState = $derived(localGame.gameState);

	// Redirect if no game over gameState
	$effect(() => {
		if (gameState.phase !== 'GAME_OVER' || gameState.players.length === 0) {
			goto(base || '/');
		}
	});
</script>

<GameResults players={gameState.players}>
	{#snippet actions()}
		<!-- One row, so the whole scorecard above stays on screen on a phone -->
		<div class="action-row">
			<button class="btn btn-primary btn-block" onclick={() => { localGame.rematch(); goto(`${base}/play/game`); }}>
				Rematch
			</button>
			<button class="btn btn-outline btn-block" onclick={() => goto(`${base}/play/setup`)}>
				New Game
			</button>
			<button class="btn btn-quiet btn-block" onclick={() => { localGame.resetGame(); goto(base || '/'); }}>
				Main Menu
			</button>
		</div>
	{/snippet}
</GameResults>

<style>
	.action-row {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--space-sm);
		width: 100%;
	}

	.action-row .btn {
		padding-inline: var(--space-sm);
		white-space: nowrap;
	}
</style>
