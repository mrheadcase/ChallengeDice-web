<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
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
	import { playRollingSound, playShakingSound, tryVibrate } from '$lib/utils/sounds';

	let rolling = $state(false);
	let selectedCombo = $state<DiceCombination | null>(null);
	let viewingPlayerIndex = $state(0);
	let eliminatedNames = $state<string[]>([]);
	let pendingGameOver = $state(false);
	let autoRolledRound = $state(-1);
	let showSettings = $state(false);

	// Desktop two-column layout has room for larger dice (excludes short landscape phones)
	const wideLayout = new MediaQuery('(min-width: 1024px) and (min-height: 501px)');
	let diceSize = $derived(wideLayout.current ? 68 : 56);

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

<div class="game-page">
	<div class="top-bar">
		<a href={`${base}/`} class="icon-btn">Menu</a>
		<span class="round-label">Round {gameState.currentRound}</span>
		<div class="top-bar-right">
			<button class="icon-btn" onclick={() => { showSettings = true; }}>Settings</button>
			<a href={`${base}/rules`} class="icon-btn">Rules</a>
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
				<div class="center-block">
					{#if preferences.current.autoRollEnabled}
						<p class="status-text">{currentPlayer?.name} — rolling...</p>
					{:else}
						<p class="status-text">{currentPlayer?.name}'s turn to roll</p>
						<button class="roll-btn" onclick={doRoll} disabled={rolling}>
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
							<button class="score-btn" onclick={scoreIt}>Score It</button>
						{:else}
							<p class="score-hint">Tap a combination to preview it on your scorecard</p>
						{/if}
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
						previewCombination={viewingPlayerIndex === gameState.currentPlayerIndex ? selectedCombo : null}
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
		padding: var(--space-sm) var(--space-md);
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
		font-size: var(--font-size-base);
		line-height: var(--line-height-base);
		color: inherit;
	}

	/* Outer margin + gap between the turn panel and the scorecard */
	.game-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding: var(--space-md);
		overflow: hidden;
	}

	/* Larger gaps between the turn steps: status → dice → combinations → Score It */
	.dice-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
		flex-shrink: 0;
	}

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

	/* Fixed height so swapping the hint for the button doesn't shift the layout */
	.score-bar {
		flex-shrink: 0;
		min-height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.score-hint {
		color: var(--text-medium);
		font-size: var(--font-size-sm);
		line-height: var(--line-height-sm);
		font-weight: 400;
		text-align: center;
	}

	.score-btn {
		background: var(--btn-primary-bg);
		color: var(--btn-primary-text);
		padding: 10px 24px;
		border-radius: var(--radius-md);
		font-weight: 700;
		font-size: var(--font-size-base);
		box-shadow: 0 2px 8px rgba(196, 122, 16, 0.3);
		width: 100%;
		max-width: 320px;
	}
	.score-btn:hover { background: var(--mid-brown); }

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
	@media (min-width: 1024px) {
		.tabs-row,
		.game-content {
			width: 100%;
			max-width: 1120px;
			margin-inline: auto;
		}
		.game-content {
			flex-direction: row;
			gap: var(--space-xl);
			padding: var(--space-lg);
		}
		.dice-section {
			flex: 1 1 0;
			min-width: 0;
			align-self: flex-start;
		}
		.scorecard-section {
			flex: 0 0 auto;
			/* Cells are already at full size here, so size to content instead */
			container-type: normal;
		}
	}

	/* Landscape on phones — switch to side-by-side to fit the short viewport height */
	@media (orientation: landscape) and (max-height: 500px) {
		.top-bar { padding: var(--space-xs) var(--space-md); }
		.round-label { font-size: var(--font-size-sm); }
		.icon-btn { padding: 4px 8px; }

		.game-content {
			flex-direction: row;
			gap: var(--space-sm);
			padding: var(--space-sm);
		}
		.dice-section {
			flex: 1 1 50%;
			gap: var(--space-sm);
			overflow-y: auto;
			min-height: 0;
		}
		.scorecard-section {
			flex: 1 1 50%;
		}

		.status-text { margin-bottom: var(--space-xs); }
		.roll-btn { padding: 8px 24px; font-size: var(--font-size-base); }
		.score-btn { padding: 8px 16px; }
	}
</style>
