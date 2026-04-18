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
			<div class="title-spacer"></div>
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
		</nav>

		<div class="nav-grid">
			<button class="nav-link" onclick={() => goto(`${base}/settings`)}>Settings</button>
			<button class="nav-link" onclick={() => goto(`${base}/stats`)}>Stats</button>
			<button class="nav-link" onclick={() => goto(`${base}/rules`)}>Rules</button>
			<button class="nav-link" onclick={() => goto(`${base}/about`)}>About</button>
		</div>
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

	.title-spacer {
		height: 3rem;
		line-height: 1.1;
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

	.nav-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px 16px;
		width: 100%;
		max-width: 280px;
	}

	.nav-link {
		color: rgba(255, 255, 255, 0.7);
		font-size: var(--font-size-base);
		font-weight: 600;
		padding: 8px 12px;
		text-align: center;
	}
	.nav-link:hover { color: #F0D590; }

	/* Landscape on phones — put the logo on the left, menu on the right */
	@media (orientation: landscape) and (max-height: 500px) {
		.menu-content {
			display: grid;
			grid-template-columns: auto minmax(240px, 360px);
			grid-template-areas:
				"logo buttons"
				"logo nav";
			gap: 8px 32px;
			padding: 12px 24px;
			align-items: center;
			justify-content: center;
		}
		.logo-section { grid-area: logo; }
		.menu-buttons { grid-area: buttons; align-self: end; max-width: none; gap: 8px; }
		.nav-grid { grid-area: nav; align-self: start; max-width: none; gap: 4px 16px; }
		.title-spacer { display: none; }
		.dice-icon { width: 140px; margin-top: 0; }
		.menu-btn { padding: 10px 20px; font-size: var(--font-size-base); }
		.nav-link { padding: 4px 8px; font-size: var(--font-size-sm); }
	}
</style>
