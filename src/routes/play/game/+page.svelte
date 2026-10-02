<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { localGame } from '$lib/stores/localGame.svelte';
	import GameLayout from '$lib/components/GameLayout.svelte';
	import DiceDisplay from '$lib/components/DiceDisplay.svelte';
	import CombinationGrid from '$lib/components/CombinationGrid.svelte';
	import Scorecard from '$lib/components/Scorecard.svelte';
	import PlayerTabs from '$lib/components/PlayerTabs.svelte';
	import EliminationDialog from '$lib/components/EliminationDialog.svelte';
	import SettingsDialog from '$lib/components/SettingsDialog.svelte';
	import type { DiceCombination } from '$lib/game/models';
	import { preferences } from '$lib/stores/preferences.svelte';
	import { playRollingSound, playShakingSound, tryVibrate } from '$lib/utils/sounds';
	import { boardDiceSize } from '$lib/utils/boardLayout';

	let rolling = $state(false);
	let selectedCombo = $state<DiceCombination | null>(null);
	let viewingPlayerIndex = $state(0);
	let eliminatedNames = $state<string[]>([]);
	let pendingGameOver = $state(false);
	let autoRolledRound = $state(-1);
	let showSettings = $state(false);

	let diceSize = $derived(boardDiceSize());

	let gameState = $derived(localGame.gameState);
	let currentPlayer = $derived(gameState.players[gameState.currentPlayerIndex]);
	let viewingPlayer = $derived(gameState.players[viewingPlayerIndex]);

	// Track eliminations — use untrack to avoid read/write cycle on prevActiveIds
	let prevActiveIds: number[] = [];
	$effect(() => {
		const currentIds = gameState.players.filter(p => p.isActive).map(p => p.id);
		const eliminated = prevActiveIds.filter(id => !currentIds.includes(id));
		if (eliminated.length > 0) {
			const names = eliminated.map(id => gameState.players.find(p => p.id === id)?.name).filter(Boolean) as string[];
			if (names.length > 0) {
				eliminatedNames = names;
			}
		}
		prevActiveIds = currentIds;
	});

	// Redirect to menu if no game
	$effect(() => {
		if (gameState.phase === 'SETUP' && gameState.players.length === 0) {
			goto(`${base}/`);
		}
	});

	// Redirect to game over
	$effect(() => {
		if (gameState.phase === 'GAME_OVER' && eliminatedNames.length === 0) {
			goto(`${base}/play/gameover`);
		}
		if (gameState.phase === 'GAME_OVER' && eliminatedNames.length > 0) {
			pendingGameOver = true;
		}
	});

	// Auto-roll — read reactive deps first so $effect always tracks them
	$effect(() => {
		const shouldRoll = gameState.phase === 'ROLLING' && !rolling && autoRolledRound !== gameState.currentRound;
		if (shouldRoll && preferences.current.autoRollEnabled) {
			const t = setTimeout(() => {
				autoRolledRound = gameState.currentRound;
				doRoll();
			}, 800);
			return () => clearTimeout(t);
		}
	});

	// Auto-play AI
	$effect(() => {
		if (gameState.phase === 'SELECTING' && localGame.isCurrentPlayerAI()) {
			const t1 = setTimeout(() => {
				const combo = localGame.getAiSelection();
				if (combo) selectedCombo = combo;
			}, 800);
			const t2 = setTimeout(() => {
				if (localGame.isCurrentPlayerAI()) {
					const combo = localGame.getAiSelection();
					if (combo) {
						localGame.selectCombination(combo);
						selectedCombo = null;
					}
				}
			}, 1400);
			return () => { clearTimeout(t1); clearTimeout(t2); };
		}
	});

	// Snap viewing to current player on new selection phase
	$effect(() => {
		if (gameState.phase === 'SELECTING') {
			viewingPlayerIndex = gameState.currentPlayerIndex;
		}
	});

	function doRoll() {
		if (gameState.phase !== 'ROLLING' || rolling) return;
		rolling = true;
		selectedCombo = null;
		playRollingSound(900);
		tryVibrate(50);
		// Roll immediately to get new dice values
		localGame.rollDice();
		// Keep rolling gameState for animation duration
		setTimeout(() => {
			rolling = false;
		}, 1200);
	}

	function selectCombo(combo: DiceCombination) {
		if (localGame.isCurrentPlayerAI()) return;
		selectedCombo = combo;
		playShakingSound(400);
		tryVibrate(15);
	}

	function scoreIt() {
		if (!selectedCombo) return;
		localGame.selectCombination(selectedCombo);
		selectedCombo = null;
	}

	function dismissElimination() {
		eliminatedNames = [];
		if (pendingGameOver) {
			pendingGameOver = false;
			goto(`${base}/play/gameover`);
		}
	}
</script>

<GameLayout
	round={gameState.currentRound}
	leading={{ label: 'Menu', href: `${base}/` }}
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
			<div class="center-block">
				{#if preferences.current.autoRollEnabled}
					<p class="status-text">{currentPlayer?.name} — rolling...</p>
				{:else}
					<p class="status-text">{currentPlayer?.name}'s turn to roll</p>
					<button class="btn btn-primary btn-lg roll-btn" onclick={doRoll} disabled={rolling}>
						{rolling ? 'Rolling...' : 'Roll Dice'}
					</button>
				{/if}
			</div>
		{/if}

		{#if gameState.diceValues.length > 0}
			<div class="center-block">
				<DiceDisplay diceValues={gameState.diceValues} {rolling} {diceSize} selectedCombination={selectedCombo} />
			</div>
		{/if}

		{#if gameState.phase === 'SELECTING'}
			<CombinationGrid
				combinations={gameState.combinations}
				validCombinations={gameState.validCombinations}
				scorecard={currentPlayer?.scorecard ?? { leftMarks: {}, rightMarks: {} }}
				selectedCombination={selectedCombo}
				onselect={localGame.isCurrentPlayerAI() ? undefined : selectCombo}
			/>
			{#if !localGame.isCurrentPlayerAI()}
				<div class="score-bar">
					{#if selectedCombo}
						<button class="btn btn-primary btn-block score-btn" onclick={scoreIt}>Score It</button>
					{:else}
						<p class="score-hint">Tap a combination to preview it on your scorecard</p>
					{/if}
				</div>
			{/if}
		{/if}
	{/snippet}

	{#snippet scorecard()}
		{#if viewingPlayer}
			<Scorecard
				scorecard={viewingPlayer.scorecard}
				previewCombination={viewingPlayerIndex === gameState.currentPlayerIndex ? selectedCombo : null}
			/>
		{/if}
	{/snippet}
</GameLayout>

<EliminationDialog
	playerNames={eliminatedNames}
	visible={eliminatedNames.length > 0}
	ondismiss={dismissElimination}
/>

<SettingsDialog visible={showSettings} onclose={() => { showSettings = false; }} />

<!-- Board layout lives in GameLayout; these style only this page's turn panel content -->
<style>
	.center-block {
		text-align: center;
		align-self: center;
	}

	.status-text {
		font-weight: 600;
		color: var(--text-medium);
		font-size: var(--font-size-sm);
		line-height: var(--line-height-sm);
		margin-bottom: var(--space-sm);
	}

	/* Fixed height (GameLayout's --score-bar) so swapping the hint for the button doesn't shift the layout */
	.score-bar {
		flex-shrink: 0;
		min-height: var(--score-bar, 44px);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.score-hint {
		color: var(--text-medium);
		font-size: var(--font-size-sm);
		line-height: var(--line-height-sm);
		text-align: center;
	}

	.score-btn {
		padding: 10px var(--space-lg);
		border-radius: var(--radius-md);
	}

	/* Portrait phones: smaller hint text */
	@media (max-width: 767px) and (orientation: portrait) {
		.score-hint {
			font-size: var(--font-size-xs);
			line-height: var(--line-height-xs);
		}
	}

	/* Landscape phones: compact controls for the short height */
	@media (orientation: landscape) and (max-height: 500px) {
		.status-text { margin-bottom: var(--space-xs); }
		.roll-btn { padding: var(--space-sm) var(--space-lg); font-size: var(--font-size-base); }
		.score-btn { padding: var(--space-sm) var(--space-md); }
	}
</style>
