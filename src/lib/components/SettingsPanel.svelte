<script lang="ts">
	import { preferences, type ComboSize, type ComboSortMode, type ScorecardTextSize, type ThemeMode } from '$lib/stores/preferences.svelte';

	function togglePref(key: 'autoRollEnabled' | 'soundEnabled' | 'hapticEnabled') {
		preferences.update({ [key]: !preferences.current[key] });
	}

	function setComboSize(size: ComboSize) {
		preferences.update({ comboSize: size });
	}

	function setComboSort(mode: ComboSortMode) {
		preferences.update({ comboSortMode: mode });
	}

	function setScorecardTextSize(size: ScorecardTextSize) {
		preferences.update({ scorecardTextSize: size });
	}

	function setThemeMode(mode: ThemeMode) {
		preferences.update({ themeMode: mode });
	}

	let prefs = $derived(preferences.current);
</script>

<div class="settings-panel">
	<section>
		<h3>Dice</h3>

		<div class="toggle-row">
			<div class="toggle-info">
				<span class="toggle-label">Auto-roll dice</span>
				<span class="toggle-desc">Automatically roll when all players have scored</span>
			</div>
			<button
				class="toggle-switch"
				class:active={prefs.autoRollEnabled}
				onclick={() => togglePref('autoRollEnabled')}
				role="switch"
				aria-checked={prefs.autoRollEnabled}
				aria-label="Auto-roll dice"
			>
				<span class="toggle-thumb"></span>
			</button>
		</div>

	</section>

	<section>
		<h3>Display</h3>

		<div class="setting-group">
			<span class="group-label">Theme</span>
			<span class="group-desc">Choose light, dark, or follow system setting</span>
			<div class="segment-row">
				{#each [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']] as [value, label]}
					<button
						class="segment-btn"
						class:selected={prefs.themeMode === value}
						onclick={() => setThemeMode(value as ThemeMode)}
					>{label}</button>
				{/each}
			</div>
		</div>

		<div class="setting-group">
			<span class="group-label">Combo button size</span>
			<span class="group-desc">Adjust the size of combination cards</span>
			<div class="segment-row">
				{#each [['small', 'S'], ['medium', 'M'], ['large', 'L'], ['extra_large', 'XL']] as [value, label]}
					<button
						class="segment-btn"
						class:selected={prefs.comboSize === value}
						onclick={() => setComboSize(value as ComboSize)}
					>{label}</button>
				{/each}
			</div>
		</div>

		<div class="setting-group">
			<span class="group-label">Combo sort order</span>
			<span class="group-desc">Sort combination cards by pair sums or 5th die</span>
			<div class="segment-row">
				{#each [['pairs_desc', 'Pairs ↓'], ['pairs_asc', 'Pairs ↑'], ['fifth_asc', '5th ↑'], ['fifth_desc', '5th ↓']] as [value, label]}
					<button
						class="segment-btn"
						class:selected={prefs.comboSortMode === value}
						onclick={() => setComboSort(value as ComboSortMode)}
					>{label}</button>
				{/each}
			</div>
		</div>

		<div class="setting-group">
			<span class="group-label">Scorecard text size</span>
			<span class="group-desc">Adjust text size inside scorecard boxes</span>
			<div class="segment-row">
				{#each [['small', 'S'], ['medium', 'M'], ['large', 'L'], ['extra_large', 'XL']] as [value, label]}
					<button
						class="segment-btn"
						class:selected={prefs.scorecardTextSize === value}
						onclick={() => setScorecardTextSize(value as ScorecardTextSize)}
					>{label}</button>
				{/each}
			</div>
		</div>
	</section>

	<section>
		<h3>Audio</h3>

		<div class="toggle-row">
			<div class="toggle-info">
				<span class="toggle-label">Sound effects</span>
				<span class="toggle-desc">Play sounds during dice rolls and selection</span>
			</div>
			<button
				class="toggle-switch"
				class:active={prefs.soundEnabled}
				onclick={() => togglePref('soundEnabled')}
				role="switch"
				aria-checked={prefs.soundEnabled}
				aria-label="Sound effects"
			>
				<span class="toggle-thumb"></span>
			</button>
		</div>

		<div class="toggle-row">
			<div class="toggle-info">
				<span class="toggle-label">Haptic feedback</span>
				<span class="toggle-desc">Vibrate on dice rolls and combo selection</span>
			</div>
			<button
				class="toggle-switch"
				class:active={prefs.hapticEnabled}
				onclick={() => togglePref('hapticEnabled')}
				role="switch"
				aria-checked={prefs.hapticEnabled}
				aria-label="Haptic feedback"
			>
				<span class="toggle-thumb"></span>
			</button>
		</div>
	</section>
</div>

<style>
	.settings-panel {
		width: 100%;
	}

	section { margin-bottom: 24px; }

	h3 {
		color: var(--gold-amber);
		margin-bottom: 12px;
		font-size: var(--font-size-lg);
	}

	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 0;
		border-bottom: 1px solid var(--warm-tan);
		gap: 16px;
	}

	.toggle-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.toggle-label {
		font-weight: 600;
		color: var(--text-dark);
	}

	.toggle-desc {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.toggle-switch {
		position: relative;
		width: 52px;
		height: 28px;
		border-radius: 14px;
		background: var(--warm-tan);
		border: 2px solid var(--warm-tan);
		transition: background var(--transition-fast), border-color var(--transition-fast);
		flex-shrink: 0;
		padding: 0;
		min-height: 28px;
		cursor: pointer;
	}

	.toggle-switch.active {
		background: var(--gold-amber);
		border-color: var(--gold-amber);
	}

	.toggle-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--card-bg);
		transition: transform var(--transition-fast);
		box-shadow: 0 1px 3px rgba(0,0,0,0.2);
	}

	.toggle-switch.active .toggle-thumb {
		transform: translateX(24px);
	}

	.setting-group {
		padding: 12px 0;
		border-bottom: 1px solid var(--warm-tan);
	}

	.group-label {
		display: block;
		font-weight: 600;
		color: var(--text-dark);
		margin-bottom: 2px;
	}

	.group-desc {
		display: block;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		margin-bottom: 10px;
	}

	.segment-row {
		display: flex;
		border-radius: var(--radius-md);
		overflow: hidden;
		border: 2px solid var(--warm-tan);
	}

	.segment-btn {
		flex: 1;
		padding: 8px 4px;
		background: var(--card-bg);
		color: var(--text-medium);
		font-weight: 500;
		font-size: var(--font-size-sm);
		border: none;
		border-right: 1px solid var(--warm-tan);
		transition: all var(--transition-fast);
		min-height: 36px;
		cursor: pointer;
	}

	.segment-btn:last-child {
		border-right: none;
	}

	.segment-btn.selected {
		background: var(--gold-amber);
		color: white;
		font-weight: 700;
	}

	.segment-btn:hover:not(.selected) {
		background: var(--pale-gold);
	}
</style>
