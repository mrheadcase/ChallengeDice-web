<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { localGame } from '$lib/stores/localGame.svelte';

	let hasSaved = $state(false);

	$effect(() => {
		hasSaved = localGame.hasSavedGame();
	});
</script>

<div class="main-menu">
	<div class="bg-image" style="background-image: url('{base}/splash_screen.webp')"></div>
	<div class="bg-overlay"></div>

	<div class="menu-content">
		<div class="logo-section">
			<h1 class="title">Challenge<br/>Dice</h1>
			<img
				src="{base}/dice_icon.png"
				alt="Five colored dice"
				class="dice-icon"
			/>
		</div>

		<nav class="menu-buttons">
			{#if hasSaved}
				<button class="menu-btn primary" onclick={() => { localGame.resumeGame(); goto(`${base}/play/game`); }}>
					Resume Game
				</button>
			{/if}
			<button class="menu-btn primary" onclick={() => goto(`${base}/play/setup`)}>
				New Local Game
			</button>
			<button class="menu-btn secondary" onclick={() => goto(`${base}/online`)}>
				Online Game
			</button>
			<button class="menu-btn tertiary" onclick={() => goto(`${base}/rules`)}>
				Rules
			</button>
			<button class="menu-btn tertiary" onclick={() => goto(`${base}/stats`)}>
				Stats & History
			</button>
			<button class="menu-btn tertiary" onclick={() => goto(`${base}/settings`)}>
				Settings
			</button>
		</nav>

		<footer class="menu-footer">
			<button class="about-link" onclick={() => goto(`${base}/about`)}>About</button>
		</footer>
	</div>
</div>

<style>
	.main-menu {
		position: relative;
		height: 100%;
		overflow: hidden;
	}

	.bg-image {
		position: absolute;
		inset: 0;
		background-size: cover;
		background-position: center top;
		background-repeat: no-repeat;
	}

	.bg-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			180deg,
			rgba(0, 0, 0, 0.45) 0%,
			rgba(0, 0, 0, 0.6) 40%,
			rgba(0, 0, 0, 0.75) 100%
		);
	}

	.menu-content {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 28px;
		height: 100%;
		padding: 24px;
	}

	.logo-section {
		text-align: center;
	}

	.title {
		font-size: 3rem;
		font-weight: 800;
		color: #F0D590;
		line-height: 1.1;
		text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5), 0 0 20px rgba(196, 122, 16, 0.3);
	}

	.dice-icon {
		width: 180px;
		height: auto;
		margin-top: 12px;
		filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
	}

	.menu-buttons {
		display: flex;
		flex-direction: column;
		gap: 12px;
		width: 100%;
		max-width: 320px;
	}

	.menu-btn {
		padding: 14px 24px;
		border-radius: var(--radius-lg);
		font-weight: 700;
		font-size: var(--font-size-lg);
		transition: all var(--transition-fast);
	}

	.menu-btn.primary {
		background: var(--btn-primary-bg);
		color: var(--btn-primary-text);
		box-shadow: 0 2px 12px rgba(196, 122, 16, 0.4);
	}
	.menu-btn.primary:hover { background: var(--btn-primary-hover); }

	.menu-btn.secondary {
		background: var(--btn-secondary-bg);
		color: var(--btn-secondary-text);
		box-shadow: 0 2px 12px rgba(107, 63, 160, 0.4);
	}
	.menu-btn.secondary:hover { opacity: 0.9; }

	.menu-btn.tertiary {
		background: rgba(255, 255, 255, 0.12);
		color: #F0E8D8;
		border: 2px solid rgba(255, 255, 255, 0.25);
		backdrop-filter: blur(4px);
	}
	.menu-btn.tertiary:hover {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(240, 213, 144, 0.5);
	}

	.menu-footer {
		color: rgba(255, 255, 255, 0.6);
		font-size: var(--font-size-sm);
	}

	.about-link {
		color: rgba(255, 255, 255, 0.6);
		font-size: var(--font-size-sm);
		padding: 8px 16px;
	}
	.about-link:hover { color: #F0D590; }
</style>
