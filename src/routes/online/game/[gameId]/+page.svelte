<script lang="ts">
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { onlineGame } from '$lib/stores/onlineGame.svelte';
	import DiceDisplay from '$lib/components/DiceDisplay.svelte';
	import CombinationGrid from '$lib/components/CombinationGrid.svelte';
	import Scorecard from '$lib/components/Scorecard.svelte';
	import PlayerTabs from '$lib/components/PlayerTabs.svelte';
	import SettingsDialog from '$lib/components/SettingsDialog.svelte';
	import PinchZoomContainer from '$lib/components/PinchZoomContainer.svelte';
	import type { DiceCombination } from '$lib/game/models';
	import * as FM from '$lib/firebase/gameManager';
	import { preferences } from '$lib/stores/preferences.svelte';

	let rolling = $state(false);
	let selectedCombo = $state<DiceCombination | null>(null);
	let viewingPlayerIndex = $state(0);
	let autoRolledRound = $state(-1);
	let showSettings = $state(false);

	let state = $derived(onlineGame.gameState);
	let gameId = $derived($page.params.gameId);
	let localIdx = $derived(onlineGame.localPlayerIndex);
	let viewingPlayer = $derived(state.players[viewingPlayerIndex]);

	// Start observing if not already
	$effect(() => {
		if (gameId && onlineGame.gameId !== gameId) {
			onlineGame.startObserving(gameId);
		}
	});

	// Auto-switch to local player's scorecard when selecting
	$effect(() => {
		if (state.phase === 'SELECTING' && localIdx >= 0) {
			viewingPlayerIndex = localIdx;
		}
	});

	// Navigate on game over
	$effect(() => {
		if (state.phase === 'GAME_OVER') {
			goto(`${base}/online/gameover`);
		}
	});

	// Auto-roll — read reactive deps first so $effect always tracks them
	$effect(() => {
		const shouldRoll = state.phase === 'ROLLING'
			&& onlineGame.isLocalPlayerRoller
			&& !rolling
			&& autoRolledRound !== state.currentRound;
		if (shouldRoll && preferences.current.autoRollEnabled) {
			const t = setTimeout(() => {
				autoRolledRound = state.currentRound;
				handleRoll();
			}, 800);
			return () => clearTimeout(t);
		}
	});

	// beforeunload cleanup
	$effect(() => {
		const handler = () => {
			// Firebase onDisconnect handles cleanup, but this provides immediate feedback
		};
		window.addEventListener('beforeunload', handler);
		return () => window.removeEventListener('beforeunload', handler);
	});

	async function handleRoll() {
		if (!onlineGame.isLocalPlayerRoller || rolling) return;
		rolling = true;
		selectedCombo = null;
		setTimeout(async () => {
			await onlineGame.rollDice();
			rolling = false;
		}, 900);
	}

	function handleSelectCombo(combo: DiceCombination) {
		if (!onlineGame.canLocalPlayerSelect) return;
		selectedCombo = combo;
	}

	async function handleConfirmSelection() {
		if (!selectedCombo) return;
		await onlineGame.selectCombination(selectedCombo);
		selectedCombo = null;
	}

	async function leave() {
		onlineGame.markLeft();
		onlineGame.stopObserving();
		await FM.leaveGame(gameId);
		goto(`${base}/online`);
	}
</script>

<div class="game-page">
	<div class="top-bar">
		<button class="icon-btn" onclick={leave}>Leave</button>
		<span class="round-label">Round {state.currentRound}</span>
		{#if state.disconnectedPlayerNames.length > 0}
			<span class="disconnected-info">
				{state.disconnectedPlayerNames.join(', ')} disconnected
			</span>
		{/if}
		<div class="top-bar-right">
			<button class="icon-btn" onclick={() => { showSettings = true; }}>Settings</button>
			<button class="icon-btn" onclick={() => goto(`${base}/rules`)}>Rules</button>
		</div>
	</div>

	<PlayerTabs
		players={state.players}
		activeIndex={viewingPlayerIndex}
		onselect={(i) => { viewingPlayerIndex = i; }}
	/>

	<div class="game-content">
		<div class="dice-section">
			{#if state.phase === 'ROLLING'}
				{#if onlineGame.isLocalPlayerRoller}
					<div class="roll-prompt">
						<p>Your turn to roll!</p>
						<button class="roll-btn" onclick={handleRoll} disabled={rolling}>
							{rolling ? 'Rolling...' : 'Roll Dice'}
						</button>
					</div>
				{:else}
					<div class="waiting-prompt">
						<p>Waiting for {state.players[state.currentPlayerIndex]?.name ?? 'player'} to roll...</p>
					</div>
				{/if}
			{/if}

			{#if state.diceValues.length > 0}
				<DiceDisplay diceValues={state.diceValues} {rolling} selectedCombination={selectedCombo} />
			{/if}

			{#if state.phase === 'SELECTING'}
				{#if onlineGame.canLocalPlayerSelect}
					<div class="selecting-info">
						<p class="selecting-label">Choose your combination:</p>
						<CombinationGrid
							combinations={state.combinations}
							validCombinations={state.validCombinations}
							scorecard={state.players[localIdx]?.scorecard ?? { leftMarks: {}, rightMarks: {} }}
							selectedCombination={selectedCombo}
							onselect={handleSelectCombo}
						/>
						{#if selectedCombo}
							<button class="confirm-btn" onclick={handleConfirmSelection}>Confirm</button>
						{/if}
					</div>
				{:else if onlineGame.localPlayerFinished}
					<div class="waiting-prompt">
						<p>Waiting for other players...</p>
						<p class="finished-count">
							{state.playersFinishedThisRound.size} / {state.players.filter(p => p.isActive).length} done
						</p>
					</div>
				{/if}
			{/if}
		</div>

		<div class="scorecard-section">
			<PinchZoomContainer>
				{#if viewingPlayer}
					<Scorecard
						scorecard={viewingPlayer.scorecard}
						playerColor={viewingPlayer.color}
						previewCombination={viewingPlayerIndex === localIdx ? selectedCombo : null}
					/>
				{/if}
			</PinchZoomContainer>
		</div>
	</div>

	<SettingsDialog visible={showSettings} onclose={() => { showSettings = false; }} />
</div>

<style>
	.game-page { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

	.top-bar {
		display: flex; align-items: center; justify-content: space-between;
		padding: 8px 16px; background: var(--brown); color: var(--text-light);
		gap: 8px; flex-wrap: wrap;
	}
	.top-bar-right { display: flex; gap: 4px; align-items: center; }
	.icon-btn {
		color: var(--light-gold); font-weight: 600; font-size: var(--font-size-sm);
		padding: 6px 12px; border-radius: var(--radius-md);
	}
	.round-label { font-weight: 700; }
	.disconnected-info {
		font-size: var(--font-size-xs); color: #FFA726; font-style: italic;
	}

	.game-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
	.dice-section {
		padding: 8px; display: flex; flex-direction: column;
		align-items: center; gap: 8px; flex-shrink: 0;
	}

	.roll-prompt, .waiting-prompt { text-align: center; padding: 16px; }
	.roll-prompt p, .waiting-prompt p { color: var(--text-medium); margin-bottom: 12px; font-weight: 600; }

	.roll-btn {
		background: var(--gold-amber); color: white; padding: 14px 40px;
		border-radius: var(--radius-lg); font-weight: 700; font-size: var(--font-size-lg);
	}
	.roll-btn:disabled { opacity: 0.6; cursor: not-allowed; }

	.selecting-info { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 8px; }
	.selecting-label { font-weight: 600; color: var(--text-medium); font-size: var(--font-size-sm); }

	.confirm-btn {
		background: var(--score-positive); color: white; padding: 12px 32px;
		border-radius: var(--radius-lg); font-weight: 700;
	}

	.finished-count { font-size: var(--font-size-sm); color: var(--text-muted); }

	.scorecard-section { flex: 1; overflow: auto; padding: 8px; }

	@media (min-width: 1024px) {
		.game-content { flex-direction: row; }
		.dice-section { flex: 0 0 45%; overflow-y: auto; }
		.scorecard-section { flex: 0 0 55%; }
	}
</style>
