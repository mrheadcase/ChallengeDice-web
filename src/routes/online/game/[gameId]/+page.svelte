<script lang="ts">
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { onlineGame } from '$lib/stores/onlineGame.svelte';
	import GameLayout from '$lib/components/GameLayout.svelte';
	import DiceDisplay from '$lib/components/DiceDisplay.svelte';
	import CombinationGrid from '$lib/components/CombinationGrid.svelte';
	import Scorecard, { type ScorecardPart } from '$lib/components/Scorecard.svelte';
	import PlayerTabs from '$lib/components/PlayerTabs.svelte';
	import SettingsDialog from '$lib/components/SettingsDialog.svelte';
	import type { DiceCombination } from '$lib/game/models';
	import { applySelection, calculateScore } from '$lib/game/logic';
	import * as FM from '$lib/firebase/gameManager';
	import { preferences } from '$lib/stores/preferences.svelte';
	import { playRollingSound, playShakingSound, tryVibrate } from '$lib/utils/sounds';
	import { boardDiceSize } from '$lib/utils/boardLayout';

	let rolling = $state(false);
	// After rolling, until the dice have landed: the combinations stay hidden
	let landing = $state(false);
	let selectedCombo = $state<DiceCombination | null>(null);
	let viewingPlayerIndex = $state(0);
	let autoRolledRound = $state(-1);
	let showSettings = $state(false);

	let diceSize = $derived(boardDiceSize());

	let gameState = $derived(onlineGame.gameState);
	let gameId = $derived(page.params.gameId as string);
	let localIdx = $derived(onlineGame.localPlayerIndex);
	let viewingPlayer = $derived(gameState.players[viewingPlayerIndex]);

	// How much the selected combination changes the local player's total, signed for the button
	let movePoints = $derived.by(() => {
		const sc = gameState.players[localIdx]?.scorecard;
		if (!selectedCombo || !sc) return '';
		const d = calculateScore(applySelection(sc, selectedCombo)).totalScore - calculateScore(sc).totalScore;
		return d > 0 ? `+${d}` : d < 0 ? `−${Math.abs(d)}` : '0';
	});

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
		landing = true;
		selectedCombo = null;
		playRollingSound(900);
		tryVibrate(50);
		setTimeout(async () => {
			await onlineGame.rollDice();
			rolling = false;
			// The dice report landing (onsettled); this only covers a roll that never animated
			setTimeout(() => { landing = false; }, 1500);
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

<GameLayout
	round={gameState.currentRound}
	leading={{ label: 'Leave', onclick: leave }}
	notice={gameState.disconnectedPlayerNames.length > 0
		? `${gameState.disconnectedPlayerNames.join(', ')} disconnected`
		: undefined}
	onsettings={() => { showSettings = true; }}
>
	{#snippet tabs()}
		<PlayerTabs
			players={gameState.players}
			activeIndex={viewingPlayerIndex}
			onselect={(i) => { viewingPlayerIndex = i; }}
		/>
	{/snippet}

	{#snippet turn()}
		{#if gameState.phase === 'ROLLING'}
			{#if onlineGame.isLocalPlayerRoller}
				<div class="prompt">
					<p>Your turn to roll!</p>
					<button class="btn btn-primary btn-lg roll-btn" onclick={handleRoll} disabled={rolling}>
						{rolling ? 'Rolling...' : 'Roll Dice'}
					</button>
				</div>
			{:else}
				<div class="prompt">
					<p>Waiting for {gameState.players[gameState.currentPlayerIndex]?.name ?? 'player'} to roll...</p>
				</div>
			{/if}
		{/if}

		{#if gameState.diceValues.length > 0}
			<DiceDisplay
				diceValues={gameState.diceValues}
				{rolling}
				{diceSize}
				selectedCombination={selectedCombo}
				onsettled={() => { landing = false; }}
			/>
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
						loading={rolling || landing}
					/>
					{#if selectedCombo}
						<button class="btn btn-success btn-block confirm-btn" onclick={handleConfirmSelection}>Confirm <span class="move-points">{movePoints}</span></button>
					{/if}
				</div>
			{:else if onlineGame.localPlayerFinished}
				<div class="prompt">
					<p>Waiting for other players...</p>
					<p class="finished-count">
						{gameState.playersFinishedThisRound.size} / {gameState.players.filter(p => p.isActive).length} done
					</p>
				</div>
			{/if}
		{/if}
	{/snippet}

	{#snippet scorecard(part: ScorecardPart)}
		{#if viewingPlayer}
			<Scorecard
				scorecard={viewingPlayer.scorecard}
				previewCombination={viewingPlayerIndex === localIdx ? selectedCombo : null}
				{part}
			/>
		{/if}
	{/snippet}
</GameLayout>

<SettingsDialog visible={showSettings} onclose={() => { showSettings = false; }} />

<!-- Board layout lives in GameLayout; these style only this page's turn panel content -->
<style>
	.prompt { text-align: center; }
	.prompt p {
		color: var(--text-medium);
		line-height: var(--line-height-base);
		margin-bottom: var(--space-sm);
		font-weight: 600;
	}

	.selecting-info {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
	}
	.selecting-label {
		font-weight: 600;
		color: var(--text-medium);
		font-size: var(--font-size-sm);
		line-height: var(--line-height-sm);
	}

	/* Points the move is worth, on the action button */
	.move-points {
		font-family: var(--font-numeric);
		padding: 1px var(--space-sm);
		border-radius: var(--radius-md);
		background: rgba(0, 0, 0, 0.18);
	}

	.finished-count {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}

	/* Stacked layouts: the combination grid shrinks (and scrolls) to fit the fixed-height turn panel */
	@media (max-width: 1023px) and (min-height: 501px) {
		.selecting-info { flex: 1 1 0; min-height: 0; gap: var(--space-sm); }
	}

	/* Landscape phones: compact controls for the short height */
	@media (orientation: landscape) and (max-height: 500px) {
		.selecting-info { gap: var(--space-sm); }
		.prompt p { margin-bottom: var(--space-xs); }
		.roll-btn { padding: var(--space-sm) var(--space-lg); font-size: var(--font-size-base); }
		.confirm-btn { padding: var(--space-sm) 20px; }
	}
</style>
