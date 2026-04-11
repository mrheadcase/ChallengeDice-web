<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { localGame } from '$lib/stores/localGame.svelte';
	import { PLAYER_COLORS, AI_BOT_NAMES } from '$lib/game/constants';
	import { sanitizeName } from '$lib/utils/validation';
	import type { PlayerColor, AiDifficulty, PlayerSetup } from '$lib/game/models';
	import { PLAYER_COLOR_DEFAULTS } from '$lib/game/models';
	import { onMount } from 'svelte';

	interface PlayerConfig {
		name: string;
		color: PlayerColor;
		isAI: boolean;
		aiDifficulty: AiDifficulty;
	}

	const SETUP_SAVE_KEY = 'challengedice_setup';

	let playerCount = $state(2);
	let players = $state<PlayerConfig[]>(createDefaultPlayers(2));

	// Restore previous setup from localStorage
	onMount(() => {
		try {
			const saved = localStorage.getItem(SETUP_SAVE_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (parsed.playerCount && parsed.players) {
					playerCount = parsed.playerCount;
					players = parsed.players;
				}
			}
		} catch { /* ignore */ }
	});

	function createDefaultPlayers(count: number): PlayerConfig[] {
		return Array.from({ length: count }, (_, i) => ({
			name: i === 0 ? '' : '',
			color: PLAYER_COLOR_DEFAULTS[i],
			isAI: i > 0,
			aiDifficulty: 'MEDIUM' as AiDifficulty,
		}));
	}

	function updateCount(count: number) {
		playerCount = count;
		const newPlayers = createDefaultPlayers(count);
		// Preserve existing config where possible
		for (let i = 0; i < Math.min(players.length, count); i++) {
			newPlayers[i] = { ...players[i] };
		}
		players = newPlayers;
	}

	function getDefaultName(i: number, config: PlayerConfig): string {
		if (config.isAI) {
			const names = AI_BOT_NAMES[config.aiDifficulty] ?? AI_BOT_NAMES.MEDIUM;
			return names[i % names.length];
		}
		return `Player ${i + 1}`;
	}

	function usedColors(): Set<PlayerColor> {
		return new Set(players.map(p => p.color));
	}

	function availableColors(currentIndex: number): PlayerColor[] {
		const used = usedColors();
		return PLAYER_COLOR_DEFAULTS.filter(c => c === players[currentIndex].color || !used.has(c));
	}

	function startGame() {
		// Save setup for next session
		try {
			localStorage.setItem(SETUP_SAVE_KEY, JSON.stringify({ playerCount, players }));
		} catch { /* ignore */ }

		const setups: PlayerSetup[] = players.map((p, i) => ({
			name: sanitizeName(p.name.trim() || getDefaultName(i, p)),
			color: p.color,
			isAI: p.isAI,
			aiDifficulty: p.aiDifficulty,
		}));
		localGame.setupGame(setups);
		goto(`${base}/play/game`);
	}
</script>

<div class="setup-page">
	<header class="setup-header">
		<button class="back-btn" onclick={() => goto(base || '/')}>← Back</button>
		<h2>New Game</h2>
	</header>

	<div class="player-count">
		<span>Players:</span>
		<div class="count-buttons">
			{#each [1, 2, 3, 4] as count}
				<button
					class="count-btn"
					class:active={playerCount === count}
					onclick={() => updateCount(count)}
				>{count}</button>
			{/each}
		</div>
	</div>

	<div class="players-list">
		{#each players as player, i}
			{@const colors = PLAYER_COLORS[player.color]}
			<div class="player-card" style:border-color={colors.primary}>
				<div class="player-header">
					<span class="player-number" style:background={colors.primary} style:color={colors.onPrimary}>
						P{i + 1}
					</span>
					<input
						type="text"
						class="name-input"
						placeholder={getDefaultName(i, player)}
						bind:value={player.name}
						maxlength="20"
					/>
				</div>

				<div class="player-options">
					<div class="option-row">
						<span class="option-label">Color:</span>
						<div class="color-picker">
							{#each availableColors(i) as color}
								{@const cs = PLAYER_COLORS[color]}
								<button
									class="color-swatch"
									class:selected={player.color === color}
									style:background={cs.primary}
									onclick={() => { player.color = color; }}
									aria-label={color}
								></button>
							{/each}
						</div>
					</div>

					{#if i > 0 || playerCount > 1}
						<div class="option-row">
							<label class="ai-toggle">
								<input type="checkbox" bind:checked={player.isAI} />
								<span>AI Player</span>
							</label>
						</div>
					{/if}

					{#if player.isAI}
						<div class="option-row">
							<span class="option-label">Difficulty:</span>
							<select bind:value={player.aiDifficulty} class="difficulty-select">
								<option value="EASY">Easy</option>
								<option value="MEDIUM">Medium</option>
								<option value="HARD">Hard</option>
								<option value="EXPERT">Expert</option>
							</select>
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<button class="start-btn" onclick={startGame}>
		Start Game
	</button>
</div>

<style>
	.setup-page {
		display: flex;
		flex-direction: column;
		gap: 16px;
		height: 100%;
		padding: 16px;
		overflow-y: auto;
	}

	.setup-header {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.back-btn {
		color: var(--gold-amber);
		font-weight: 600;
		font-size: var(--font-size-base);
		padding: 8px;
	}

	h2 {
		font-size: var(--font-size-xl);
		color: var(--text-dark);
	}

	.player-count {
		display: flex;
		align-items: center;
		gap: 12px;
		font-weight: 600;
	}

	.count-buttons {
		display: flex;
		gap: 8px;
	}

	.count-btn {
		width: 44px;
		height: 44px;
		border-radius: var(--radius-md);
		background: var(--card-bg);
		border: 2px solid var(--warm-tan);
		font-weight: 700;
		font-size: var(--font-size-lg);
		color: var(--text-dark);
	}

	.count-btn.active {
		background: var(--gold-amber);
		color: white;
		border-color: var(--gold-amber);
	}

	.players-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
		flex: 1;
	}

	.player-card {
		background: var(--card-bg);
		border: 2px solid;
		border-radius: var(--radius-lg);
		padding: 12px;
	}

	.player-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}

	.player-number {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: var(--font-size-sm);
		flex-shrink: 0;
	}

	.name-input {
		flex: 1;
		padding: 8px 12px;
		border: 1px solid var(--warm-tan);
		border-radius: var(--radius-md);
		font-size: var(--font-size-base);
		background: var(--cream);
	}

	.name-input:focus {
		outline: 2px solid var(--gold-amber);
		border-color: transparent;
	}

	.player-options {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.option-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.option-label {
		font-size: var(--font-size-sm);
		color: var(--text-medium);
		min-width: 60px;
	}

	.color-picker {
		display: flex;
		gap: 6px;
	}

	.color-swatch {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: 3px solid transparent;
		transition: all var(--transition-fast);
	}

	.color-swatch.selected {
		border-color: var(--text-dark);
		box-shadow: 0 0 0 2px white inset;
	}

	.ai-toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
		font-size: var(--font-size-sm);
	}

	.ai-toggle input {
		width: 18px;
		height: 18px;
		accent-color: var(--gold-amber);
	}

	.difficulty-select {
		padding: 6px 10px;
		border: 1px solid var(--warm-tan);
		border-radius: var(--radius-md);
		background: var(--input-bg);
		color: var(--text-dark);
		font-size: var(--font-size-sm);
		min-height: 36px;
	}

	.start-btn {
		background: var(--gold-amber);
		color: white;
		padding: 16px;
		border-radius: var(--radius-lg);
		font-weight: 700;
		font-size: var(--font-size-lg);
		box-shadow: 0 2px 8px rgba(196, 122, 16, 0.3);
		margin-top: auto;
	}

	.start-btn:hover { background: var(--mid-brown); }
</style>
