<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { localGame } from '$lib/stores/localGame.svelte';
	import DiceDisplay from '$lib/components/DiceDisplay.svelte';
	import CombinationGrid from '$lib/components/CombinationGrid.svelte';
	import Scorecard from '$lib/components/Scorecard.svelte';
	import PlayerTabs from '$lib/components/PlayerTabs.svelte';
	import EliminationDialog from '$lib/components/EliminationDialog.svelte';
	import SettingsDialog from '$lib/components/SettingsDialog.svelte';
	import PinchZoomContainer from '$lib/components/PinchZoomContainer.svelte';
	import type { DiceCombination } from '$lib/game/models';
	import { preferences } from '$lib/stores/preferences.svelte';

	let rolling = $state(false);
	let selectedCombo = $state<DiceCombination | null>(null);
	let viewingPlayerIndex = $state(0);
	let eliminatedNames = $state<string[]>([]);
	let pendingGameOver = $state(false);
	let autoRolledRound = $state(-1);
	let showSettings = $state(false);

	let state = $derived(localGame.gameState);
	let currentPlayer = $derived(state.players[state.currentPlayerIndex]);
	let viewingPlayer = $derived(state.players[viewingPlayerIndex]);

	// Track eliminations — use untrack to avoid read/write cycle on prevActiveIds
	let prevActiveIds: number[] = [];
	$effect(() => {
		const currentIds = state.players.filter(p => p.isActive).map(p => p.id);
		const eliminated = prevActiveIds.filter(id => !currentIds.includes(id));
		if (eliminated.length > 0) {
			const names = eliminated.map(id => state.players.find(p => p.id === id)?.name).filter(Boolean) as string[];
			if (names.length > 0) {
				eliminatedNames = names;
			}
		}
		prevActiveIds = currentIds;
	});

	// Redirect to menu if no game
	$effect(() => {
		if (state.phase === 'SETUP' && state.players.length === 0) {
			goto(`${base}/`);
		}
	});

	// Redirect to game over
	$effect(() => {
		if (state.phase === 'GAME_OVER' && eliminatedNames.length === 0) {
			goto(`${base}/play/gameover`);
		}
		if (state.phase === 'GAME_OVER' && eliminatedNames.length > 0) {
			pendingGameOver = true;
		}
	});

	// Auto-roll — read reactive deps first so $effect always tracks them
	$effect(() => {
		const shouldRoll = state.phase === 'ROLLING' && !rolling && autoRolledRound !== state.currentRound;
		if (shouldRoll && preferences.current.autoRollEnabled) {
			const t = setTimeout(() => {
				autoRolledRound = state.currentRound;
				doRoll();
			}, 800);
			return () => clearTimeout(t);
		}
	});

	// Auto-play AI
	$effect(() => {
		if (state.phase === 'SELECTING' && localGame.isCurrentPlayerAI()) {
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
		if (state.phase === 'SELECTING') {
			viewingPlayerIndex = state.currentPlayerIndex;
		}
	});

	function doRoll() {
		if (state.phase !== 'ROLLING' || rolling) return;
		rolling = true;
		selectedCombo = null;
		setTimeout(() => {
			localGame.rollDice();
			rolling = false;
		}, 900);
	}

	function selectCombo(combo: DiceCombination) {
		if (localGame.isCurrentPlayerAI()) return;
		selectedCombo = combo;
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

<div class="game-page">
	<div class="top-bar">
		<a href={`${base}/`} class="icon-btn">Menu</a>
		<span class="round-label">Round {state.currentRound}</span>
		<div class="top-bar-right">
			<button class="icon-btn" onclick={() => { showSettings = true; }}>Settings</button>
			<a href={`${base}/rules`} class="icon-btn">Rules</a>
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
				<div class="center-block">
					<p class="status-text">{currentPlayer?.name}'s turn to roll</p>
					<button class="roll-btn" onclick={doRoll} disabled={rolling}>
						{rolling ? 'Rolling...' : 'Roll Dice'}
					</button>
				</div>
			{/if}

			{#if state.diceValues.length > 0}
				<div class="center-block">
					<DiceDisplay diceValues={state.diceValues} {rolling} selectedCombination={selectedCombo} />
				</div>
			{/if}

			{#if state.phase === 'SELECTING' && !localGame.isCurrentPlayerAI()}
				<CombinationGrid
					combinations={state.combinations}
					validCombinations={state.validCombinations}
					scorecard={currentPlayer?.scorecard ?? { leftMarks: {}, rightMarks: {} }}
					selectedCombination={selectedCombo}
					onselect={selectCombo}
				/>
				<div class="center-block">
					<button class="score-btn" onclick={scoreIt} disabled={!selectedCombo}>
						{selectedCombo ? 'Score It' : 'Select a combination'}
					</button>
				</div>
			{:else if state.phase === 'SELECTING' && localGame.isCurrentPlayerAI()}
				<div class="center-block">
					<p class="status-text">{currentPlayer?.name} is thinking...</p>
				</div>
			{/if}
		</div>

		<div class="scorecard-section">
			<PinchZoomContainer>
				{#if viewingPlayer}
					<Scorecard
						scorecard={viewingPlayer.scorecard}
						playerColor={viewingPlayer.color}
						previewCombination={viewingPlayerIndex === state.currentPlayerIndex ? selectedCombo : null}
					/>
				{/if}
			</PinchZoomContainer>
		</div>
	</div>

	<EliminationDialog
		playerNames={eliminatedNames}
		visible={eliminatedNames.length > 0}
		ondismiss={dismissElimination}
	/>

	<SettingsDialog visible={showSettings} onclose={() => { showSettings = false; }} />
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
		padding: 8px 16px;
		background: #1A0D04;
		color: #F0E8D8;
	}

	.top-bar-right {
		display: flex;
		gap: 4px;
		align-items: center;
	}

	.icon-btn {
		color: var(--light-gold);
		font-weight: 600;
		font-size: var(--font-size-sm);
		padding: 6px 12px;
		border-radius: var(--radius-md);
		text-decoration: none;
		min-height: auto;
	}
	.icon-btn:hover { background: rgba(255,255,255,0.1); }

	.round-label {
		font-weight: 700;
		color: inherit;
	}

	.game-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.dice-section {
		padding: 8px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		overflow-y: auto;
		flex: 1;
		min-height: 0;
	}

	.center-block {
		text-align: center;
		align-self: center;
	}

	.status-text {
		font-weight: 600;
		color: var(--text-medium);
		font-size: var(--font-size-sm);
		margin-bottom: 8px;
	}

	.roll-btn {
		background: var(--gold-amber);
		color: white;
		padding: 14px 40px;
		border-radius: var(--radius-lg);
		font-weight: 700;
		font-size: var(--font-size-lg);
		box-shadow: 0 4px 12px rgba(196, 122, 16, 0.3);
	}
	.roll-btn:hover:not(:disabled) { background: var(--mid-brown); }
	.roll-btn:disabled { opacity: 0.6; cursor: not-allowed; }

	.score-btn {
		background: var(--btn-primary-bg);
		color: var(--btn-primary-text);
		padding: 10px 24px;
		border-radius: var(--radius-md);
		font-weight: 700;
		font-size: var(--font-size-base);
		box-shadow: 0 2px 8px rgba(196, 122, 16, 0.3);
		margin-top: 4px;
	}
	.score-btn:hover:not(:disabled) { background: var(--mid-brown); }
	.score-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	.scorecard-section {
		flex: 1;
		overflow: auto;
		padding: 8px;
		min-height: 0;
	}

	@media (min-width: 1024px) {
		.game-content {
			flex-direction: row;
		}
		.dice-section {
			flex: 1 1 50%;
		}
		.scorecard-section {
			flex: 1 1 50%;
		}
	}
</style>
