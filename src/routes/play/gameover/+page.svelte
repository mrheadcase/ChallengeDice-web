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
		<button class="btn btn-primary btn-block" onclick={() => { localGame.rematch(); goto(`${base}/play/game`); }}>
			Rematch
		</button>
		<button class="btn btn-outline btn-block" onclick={() => goto(`${base}/play/setup`)}>
			New Game
		</button>
		<button class="btn btn-quiet btn-block" onclick={() => { localGame.resetGame(); goto(base || '/'); }}>
			Main Menu
		</button>
	{/snippet}
</GameResults>
