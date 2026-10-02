<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { localGame } from '$lib/stores/localGame.svelte';
	import { AI_BOT_NAMES } from '$lib/game/constants';
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
	<PageHeader title="New Game" flush onback={() => goto(base || '/')} />

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
			<div class="player-card" data-player={player.color}>
				<div class="player-header">
					<span class="player-number">
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
								{@const taken = color !== player.color && usedColors().has(color)}
								<button
									class="color-swatch"
									class:selected={player.color === color}
									class:taken
									data-player={color}
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

	<button class="btn btn-primary btn-lg btn-block start-btn" onclick={startGame}>
		Start Game
	</button>
</div>

<style>
	.setup-page {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		height: 100%;
		padding: var(--space-md);
		overflow-y: auto;
	}

	.player-count {
		display: flex;
		align-items: center;
		gap: 12px;
		font-weight: 600;
	}

	.count-buttons {
		display: flex;
		gap: var(--space-sm);
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
		color: var(--text-on-color);
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
		border: 2px solid var(--player);
		border-radius: var(--radius-lg);
		padding: 12px;
	}

	.player-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-sm);
	}

	.player-number {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-full);
		background: var(--player);
		color: var(--text-on-color);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: var(--font-size-sm);
		flex-shrink: 0;
	}

	.name-input {
		flex: 1;
		padding: var(--space-sm) 12px;
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
		gap: var(--space-sm);
	}

	.option-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
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

	/* Slightly smaller than the global swatch so four fit beside the label */
	.color-swatch {
		width: 32px;
		height: 32px;
		min-width: 32px;
		min-height: 32px;
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

	/* Pinned to the bottom of the page */
	.start-btn {
		padding: var(--space-md);
		margin-top: auto;
	}

	/* Landscape on phones — compact to fit the short viewport */
	@media (orientation: landscape) and (max-height: 500px) {
		.setup-page {
			gap: var(--space-sm);
			padding: var(--space-sm) 12px;
		}

		.player-count { gap: var(--space-sm); font-size: var(--font-size-sm); }
		.count-btn { width: 36px; height: 36px; font-size: var(--font-size-base); }

		.players-list {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: var(--space-sm);
		}

		.player-card { padding: var(--space-sm); }
		.player-header { margin-bottom: var(--space-xs); gap: 6px; }
		.player-number { width: 26px; height: 26px; font-size: var(--font-size-xs); }
		.name-input { padding: 5px var(--space-sm); font-size: var(--font-size-sm); }
		.player-options { gap: var(--space-xs); }
		.option-row { gap: 6px; }
		.option-label { min-width: 44px; font-size: var(--font-size-xs); }
		.color-swatch { width: 24px; height: 24px; min-width: 24px; min-height: 24px; border-width: 2px; }
		.color-picker { gap: var(--space-xs); }
		.ai-toggle { font-size: var(--font-size-xs); }
		.ai-toggle input { width: 14px; height: 14px; }
		.difficulty-select { padding: 3px 6px; font-size: var(--font-size-xs); min-height: 28px; }

		.start-btn { padding: 10px; font-size: var(--font-size-base); margin-top: 0; }
	}
</style>
