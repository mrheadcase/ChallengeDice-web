<script lang="ts">
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { MediaQuery } from 'svelte/reactivity';
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
	import { playRollingSound, playShakingSound, tryVibrate } from '$lib/utils/sounds';

	let rolling = $state(false);
	let selectedCombo = $state<DiceCombination | null>(null);
	let viewingPlayerIndex = $state(0);
	let autoRolledRound = $state(-1);
	let showSettings = $state(false);

	// Desktop two-column layout has room for larger dice (excludes short landscape phones)
	const wideLayout = new MediaQuery('(min-width: 1024px) and (min-height: 501px)');
	let diceSize = $derived(wideLayout.current ? 68 : 56);

	let gameState = $derived(onlineGame.gameState);
	let gameId = $derived(page.params.gameId as string);
	let localIdx = $derived(onlineGame.localPlayerIndex);
	let viewingPlayer = $derived(gameState.players[viewingPlayerIndex]);

	// Start observing if not already
	$effect(() => {
		if (gameId && onlineGame.gameId !== gameId) {
			onlineGame.startObserving(gameId);
		}
	});

	// Auto-switch to local player's scorecard when selecting
	$effect(() => {
		if (gameState.phase === 'SELECTING' && localIdx >= 0) {
			viewingPlayerIndex = localIdx;
		}
	});

	// Navigate on game over
	$effect(() => {
		if (gameState.phase === 'GAME_OVER') {
			goto(`${base}/online/gameover`);
		}
	});

	// Auto-roll — read reactive deps first so $effect always tracks them
	$effect(() => {
		const shouldRoll = gameState.phase === 'ROLLING'
			&& onlineGame.isLocalPlayerRoller
			&& !rolling
			&& autoRolledRound !== gameState.currentRound;
		if (shouldRoll && preferences.current.autoRollEnabled) {
			const t = setTimeout(() => {
				autoRolledRound = gameState.currentRound;
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
		playRollingSound(900);
		tryVibrate(50);
		setTimeout(async () => {
			await onlineGame.rollDice();
			rolling = false;
		}, 900);
	}

	function handleSelectCombo(combo: DiceCombination) {
		if (!onlineGame.canLocalPlayerSelect) return;
		selectedCombo = combo;
		playShakingSound(400);
		tryVibrate(15);
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
		<span class="round-label">Round {gameState.currentRound}</span>
		{#if gameState.disconnectedPlayerNames.length > 0}
			<span class="disconnected-info">
				{gameState.disconnectedPlayerNames.join(', ')} disconnected
			</span>
		{/if}
		<div class="top-bar-right">
			<button class="icon-btn" onclick={() => { showSettings = true; }}>Settings</button>
			<button class="icon-btn" onclick={() => goto(`${base}/rules`)}>Rules</button>
		</div>
	</div>

	<div class="tabs-row">
		<PlayerTabs
			players={gameState.players}
			activeIndex={viewingPlayerIndex}
			onselect={(i) => { viewingPlayerIndex = i; }}
		/>
	</div>

	<div class="game-content">
		<div class="dice-section">
			{#if gameState.phase === 'ROLLING'}
				{#if onlineGame.isLocalPlayerRoller}
					<div class="roll-prompt">
						<p>Your turn to roll!</p>
						<button class="roll-btn" onclick={handleRoll} disabled={rolling}>
							{rolling ? 'Rolling...' : 'Roll Dice'}
						</button>
					</div>
				{:else}
					<div class="waiting-prompt">
						<p>Waiting for {gameState.players[gameState.currentPlayerIndex]?.name ?? 'player'} to roll...</p>
					</div>
				{/if}
			{/if}

			{#if gameState.diceValues.length > 0}
				<DiceDisplay diceValues={gameState.diceValues} {rolling} {diceSize} selectedCombination={selectedCombo} />
			{/if}

			{#if gameState.phase === 'SELECTING'}
				{#if onlineGame.canLocalPlayerSelect}
					<div class="selecting-info">
						<p class="selecting-label">Choose your combination:</p>
						<CombinationGrid
							combinations={gameState.combinations}
							validCombinations={gameState.validCombinations}
							scorecard={gameState.players[localIdx]?.scorecard ?? { leftMarks: {}, rightMarks: {} }}
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
							{gameState.playersFinishedThisRound.size} / {gameState.players.filter(p => p.isActive).length} done
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
		padding: var(--space-sm) var(--space-md); background: #1A0D04; color: #F0E8D8;
		gap: 8px; flex-wrap: wrap;
	}
	.top-bar-right { display: flex; gap: 4px; align-items: center; }
	.icon-btn {
		color: var(--light-gold); font-weight: 600; font-size: var(--font-size-sm);
		padding: 6px 12px; border-radius: var(--radius-md);
	}
	.round-label { font-weight: 700; font-size: var(--font-size-base); line-height: var(--line-height-base); color: inherit; }
	.disconnected-info {
		font-size: var(--font-size-xs); color: #FFA726; font-style: italic;
	}

	/* Outer margin + gap between the turn panel and the scorecard */
	.game-content {
		flex: 1; display: flex; flex-direction: column; overflow: hidden;
		gap: var(--space-md); padding: var(--space-md);
	}
	.dice-section {
		display: flex; flex-direction: column;
		align-items: center; gap: var(--space-lg); flex-shrink: 0;
	}

	.roll-prompt, .waiting-prompt { text-align: center; }
	.roll-prompt p, .waiting-prompt p { color: var(--text-medium); line-height: var(--line-height-base); margin-bottom: var(--space-sm); font-weight: 600; }

	.roll-btn {
		background: var(--btn-primary-bg); color: var(--btn-primary-text); padding: 14px 40px;
		border-radius: var(--radius-lg); font-weight: 700; font-size: var(--font-size-lg);
	}
	.roll-btn:disabled { opacity: 0.6; cursor: not-allowed; }

	.selecting-info { width: 100%; display: flex; flex-direction: column; align-items: center; gap: var(--space-md); }
	.selecting-label { font-weight: 600; color: var(--text-medium); font-size: var(--font-size-sm); line-height: var(--line-height-sm); }

	.confirm-btn {
		background: var(--score-positive); color: white; padding: 12px 32px;
		border-radius: var(--radius-lg); font-weight: 700;
	}

	.finished-count { font-size: var(--font-size-sm); color: var(--text-muted); font-variant-numeric: tabular-nums; }

	/* Size container so the scorecard's cells can scale to the space it gets */
	.scorecard-section { flex: 1; overflow: auto; min-height: 0; container-type: inline-size; }

	/* Desktop: centred board, turn panel left, scorecard sized to its grid on the right */
	@media (min-width: 1024px) {
		.tabs-row, .game-content { width: 100%; max-width: 1120px; margin-inline: auto; }
		.game-content { flex-direction: row; gap: var(--space-xl); padding: var(--space-lg); }
		.dice-section { flex: 1 1 0; min-width: 0; align-self: flex-start; }
		/* Cells are already at full size here, so size to content instead */
		.scorecard-section { flex: 0 0 auto; container-type: normal; }
	}

	/* Landscape on phones — switch to side-by-side to fit the short viewport height */
	@media (orientation: landscape) and (max-height: 500px) {
		.top-bar { padding: var(--space-xs) var(--space-md); flex-wrap: nowrap; }
		.round-label { font-size: var(--font-size-sm); }
		.icon-btn { padding: 4px 8px; }

		.game-content { flex-direction: row; gap: var(--space-sm); padding: var(--space-sm); }
		.dice-section {
			flex: 1 1 50%;
			gap: var(--space-sm);
			overflow-y: auto;
			min-height: 0;
		}
		.scorecard-section { flex: 1 1 50%; }
		.selecting-info { gap: var(--space-sm); }
		.roll-prompt p, .waiting-prompt p { margin-bottom: var(--space-xs); }
		.roll-btn { padding: 8px 24px; font-size: var(--font-size-base); }
		.confirm-btn { padding: 8px 20px; }
	}
</style>
