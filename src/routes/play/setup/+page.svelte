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

	function usedAiNames(): Set<string> {
		return new Set(players.filter(p => p.isAI && p.name).map(p => p.name));
	}

	function pickRandomAiName(difficulty: AiDifficulty): string {
		const names = AI_BOT_NAMES[difficulty] ?? AI_BOT_NAMES.MEDIUM;
		const used = usedAiNames();
		const available = names.filter(n => !used.has(n));
		const pool = available.length > 0 ? available : names;
		return pool[Math.floor(Math.random() * pool.length)];
	}

	function createDefaultPlayers(count: number): PlayerConfig[] {
		const result: PlayerConfig[] = [];
		for (let i = 0; i < count; i++) {
			const isAI = i > 0;
			const difficulty: AiDifficulty = 'MEDIUM';
			result.push({
				name: isAI ? pickAiNameForNewPlayer(difficulty, result) : '',
				color: PLAYER_COLOR_DEFAULTS[i],
				isAI,
				aiDifficulty: difficulty,
			});
		}
		return result;
	}

	function pickAiNameForNewPlayer(difficulty: AiDifficulty, existing: PlayerConfig[]): string {
		const names = AI_BOT_NAMES[difficulty] ?? AI_BOT_NAMES.MEDIUM;
		const used = new Set(existing.filter(p => p.isAI && p.name).map(p => p.name));
		const available = names.filter(n => !used.has(n));
		const pool = available.length > 0 ? available : names;
		return pool[Math.floor(Math.random() * pool.length)];
	}

	function updateCount(count: number) {
		playerCount = count;
		if (count <= players.length) {
			players = players.slice(0, count);
		} else {
			const newPlayers = [...players];
			for (let i = players.length; i < count; i++) {
				const difficulty: AiDifficulty = 'MEDIUM';
				newPlayers.push({
					name: pickAiNameForNewPlayer(difficulty, newPlayers),
					color: PLAYER_COLOR_DEFAULTS[i],
					isAI: true,
					aiDifficulty: difficulty,
				});
			}
			players = newPlayers;
		}
	}

	function onDifficultyChange(index: number, difficulty: AiDifficulty) {
		players[index].aiDifficulty = difficulty;
		players[index].name = pickRandomAiName(difficulty);
	}

	function onAiToggle(index: number, isAI: boolean) {
		players[index].isAI = isAI;
		if (isAI) {
			players[index].name = pickRandomAiName(players[index].aiDifficulty);
		} else {
			players[index].name = '';
		}
	}

	function getPlaceholder(i: number, config: PlayerConfig): string {
		return config.isAI ? '' : `Player ${i + 1}`;
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
			name: sanitizeName(p.name.trim() || `Player ${i + 1}`),
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
						placeholder={getPlaceholder(i, player)}
						bind:value={player.name}
						maxlength="20"
					/>
				</div>

				<div class="player-options">
					<div class="option-row">
						<span class="option-label">Color:</span>
						<div class="color-picker">
							{#each PLAYER_COLOR_DEFAULTS as color}
								{@const cs = PLAYER_COLORS[color]}
								{@const taken = color !== player.color && usedColors().has(color)}
								<button
									class="color-swatch"
									class:selected={player.color === color}
									class:taken
									style:background={cs.primary}
									onclick={() => { if (!taken) player.color = color; }}
									disabled={taken}
									aria-label={color}
								></button>
							{/each}
						</div>
					</div>

					{#if i > 0 || playerCount > 1}
						<div class="option-row">
							<label class="ai-toggle">
								<input type="checkbox" checked={player.isAI} onchange={(e) => onAiToggle(i, e.currentTarget.checked)} />
								<span>AI Player</span>
							</label>
							{#if player.isAI}
								<select value={player.aiDifficulty} onchange={(e) => onDifficultyChange(i, e.currentTarget.value as AiDifficulty)} class="difficulty-select">
									<option value="EASY">Easy</option>
									<option value="MEDIUM">Medium</option>
									<option value="HARD">Hard</option>
									<option value="EXPERT">Expert</option>
								</select>
							{/if}
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
	}

	@media (min-width: 768px) {
		.players-list {
			display: grid;
			grid-template-columns: 1fr 1fr;
		}
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
		min-width: 32px;
		min-height: 32px;
		border-radius: 50%;
		border: 3px solid transparent;
		transition: all var(--transition-fast);
	}

	.color-swatch.selected {
		border-color: var(--text-dark);
		box-shadow: 0 0 0 2px white inset;
	}

	.color-swatch.taken {
		opacity: 0.3;
		cursor: not-allowed;
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
		background: var(--btn-primary-bg);
		color: var(--btn-primary-text);
		padding: 16px;
		border-radius: var(--radius-lg);
		font-weight: 700;
		font-size: var(--font-size-lg);
		box-shadow: 0 2px 8px rgba(196, 122, 16, 0.3);
		margin-top: auto;
	}

	.start-btn:hover { background: #A86400; }

	/* Landscape on phones — compact to fit the short viewport */
	@media (orientation: landscape) and (max-height: 500px) {
		.setup-page {
			gap: 8px;
			padding: 8px 12px;
		}
		.setup-header { gap: 8px; }
		h2 { font-size: var(--font-size-lg); }
		.back-btn { padding: 4px 8px; font-size: var(--font-size-sm); }

		.player-count { gap: 8px; font-size: var(--font-size-sm); }
		.count-btn { width: 36px; height: 36px; font-size: var(--font-size-base); }

		.players-list {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 8px;
		}

		.player-card { padding: 8px; }
		.player-header { margin-bottom: 4px; gap: 6px; }
		.player-number { width: 26px; height: 26px; font-size: var(--font-size-xs); }
		.name-input { padding: 5px 8px; font-size: var(--font-size-sm); }
		.player-options { gap: 4px; }
		.option-row { gap: 6px; }
		.option-label { min-width: 44px; font-size: var(--font-size-xs); }
		.color-swatch { width: 24px; height: 24px; min-width: 24px; min-height: 24px; border-width: 2px; }
		.color-picker { gap: 4px; }
		.ai-toggle { font-size: var(--font-size-xs); }
		.ai-toggle input { width: 14px; height: 14px; }
		.difficulty-select { padding: 3px 6px; font-size: var(--font-size-xs); min-height: 28px; }

		.start-btn { padding: 10px; font-size: var(--font-size-base); margin-top: 0; }
	}
</style>
