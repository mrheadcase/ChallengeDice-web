<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
</script>

<div class="subpage">
	<PageHeader title="About" onback={() => history.back()} />

	<div class="subpage-content">
		<div class="app-info">
			<h1 class="app-name">Challenge Dice</h1>
			<p class="version">Web Version 0.1.0</p>
		</div>

		<section>
			<h3>About the Game</h3>
			<p>Challenge Dice is a strategic dice game where players compete to fill their scorecards with the best possible combinations. Play locally with friends and AI opponents, or go online to challenge players across devices.</p>
		</section>

		<section>
			<h3>Cross-Platform Play</h3>
			<p>The web version connects to the same servers as the Android app. Create a game on your phone and have a friend join from their browser — or vice versa!</p>
		</section>

		<section>
			<h3>Privacy</h3>
			<p>Online play uses anonymous authentication — no personal information is collected. Game data is stored temporarily on Firebase servers for the duration of the game.</p>
			<p>Local game data (high scores, preferences) is stored in your browser's local storage and never sent to any server.</p>
		</section>
	</div>
</div>

<style>
	.app-info {
		text-align: center;
		padding: var(--space-lg) 0;
	}

	.app-name {
		font-size: var(--font-size-2xl);
		color: var(--gold-amber);
		font-weight: 800;
	}

	.version {
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	section { margin-bottom: var(--space-lg); }

	h3 {
		color: var(--gold-amber);
		margin-bottom: var(--space-sm);
	}

	p {
		color: var(--text-medium);
		line-height: 1.6;
		margin-bottom: var(--space-sm);
	}
</style>
