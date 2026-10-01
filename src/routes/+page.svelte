<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { localGame } from '$lib/stores/localGame.svelte';

	let hasSaved = $state(false);

	$effect(() => {
		hasSaved = localGame.hasSavedGame();
	});
</script>

<div class="main-menu" style:--splash="url('{base}/splash_screen.webp')">
	<!-- Blurred copy fills any space around the uncropped poster -->
	<div class="backdrop" aria-hidden="true"></div>
	<!-- The poster carries the title, art, and tagline; it is never cropped -->
	<img class="poster" src="{base}/splash_screen.webp" alt="" />

	<div class="menu-content">
		<h1 class="sr-only">Challenge Dice</h1>

		<!-- Desktop only: tops the menu column beside the poster -->
		<img class="dice-icon" src="{base}/dice_icon.png" alt="" />

		<!-- One primary action: Resume when a game is saved, otherwise New Local Game -->
		<nav class="menu-buttons" aria-label="Play">
			{#if hasSaved}
				<button class="menu-btn primary" onclick={() => { localGame.resumeGame(); goto(`${base}/play/game`); }}>
					Resume Game
				</button>
			{/if}
			<button
				class="menu-btn"
				class:primary={!hasSaved}
				class:quiet={hasSaved}
				onclick={() => goto(`${base}/play/setup`)}
			>
				New Local Game
			</button>
			<button class="menu-btn secondary" onclick={() => goto(`${base}/online`)}>
				Online Game
			</button>
		</nav>

		<nav class="nav-links" aria-label="More">
			<button class="nav-link" onclick={() => goto(`${base}/rules`)}>Rules</button>
			<button class="nav-link" onclick={() => goto(`${base}/stats`)}>Stats</button>
			<button class="nav-link" onclick={() => goto(`${base}/settings`)}>Settings</button>
			<button class="nav-link" onclick={() => goto(`${base}/about`)}>About</button>
		</nav>
	</div>
</div>

<style>
	/*
	 * Portrait: the poster spans the screen width (so the title is never clipped) and
	 * the menu fills the space below it. On screens too short for both, the poster
	 * narrows to leave ~220px for the menu and centres over a blurred copy of itself.
	 */
	.main-menu {
		--menu-space: 220px;
		position: relative;
		height: 100%;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		background: #1A0D04;
	}

	.backdrop {
		position: absolute;
		inset: -40px;
		background: var(--splash) center / cover no-repeat;
		filter: blur(28px) brightness(0.35);
	}

	.poster {
		position: relative;
		align-self: center;
		flex-shrink: 0;
		/* Poster is 2:3, so its height is 1.5× its width */
		width: min(100%, calc((100dvh - var(--menu-space)) / 1.5));
		height: auto;
		/* Soften the bottom edge into the menu area */
		mask-image: linear-gradient(to bottom, #000 90%, transparent 100%);
	}

	.menu-content {
		position: relative;
		z-index: 1;
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-md);
		padding: var(--space-md) var(--space-md) max(var(--space-md), env(safe-area-inset-bottom));
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	.dice-icon {
		display: none;
		width: 160px;
		height: auto;
		filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
	}

	.menu-buttons {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		width: 100%;
		max-width: 320px;
	}

	.menu-btn {
		padding: 14px var(--space-lg);
		border-radius: var(--radius-lg);
		font-weight: 700;
		font-size: var(--font-size-lg);
		line-height: var(--line-height-lg);
		transition: background-color var(--transition-fast), border-color var(--transition-fast);
	}

	.menu-btn.primary {
		background: var(--btn-primary-bg);
		color: var(--btn-primary-text);
		box-shadow: 0 2px 12px rgba(196, 122, 16, 0.4);
	}
	.menu-btn.primary:hover { background: #A86400; }

	/* Online play keeps its purple identity, one size below the primary */
	.menu-btn.secondary {
		background: var(--btn-secondary-bg);
		color: var(--btn-secondary-text);
		box-shadow: 0 2px 12px rgba(107, 63, 160, 0.4);
		font-size: var(--font-size-base);
		line-height: var(--line-height-base);
		padding: 12px var(--space-lg);
	}
	.menu-btn.secondary:hover { background: #5A3488; }

	/* New Local Game when Resume is the primary: translucent outline */
	.menu-btn.quiet {
		background: rgba(26, 13, 4, 0.55);
		color: #FAF6F0;
		border: 1px solid rgba(240, 213, 144, 0.45);
		font-size: var(--font-size-base);
		line-height: var(--line-height-base);
		padding: 12px var(--space-lg);
	}
	.menu-btn.quiet:hover {
		background: rgba(26, 13, 4, 0.75);
		border-color: #F0D590;
	}

	.nav-links {
		display: flex;
		justify-content: center;
		gap: var(--space-xs);
		width: 100%;
		max-width: 320px;
	}

	.nav-link {
		flex: 1;
		color: rgba(250, 246, 240, 0.85);
		font-size: var(--font-size-sm);
		font-weight: 600;
		border-radius: var(--radius-md);
	}
	.nav-link:hover {
		color: #F0D590;
		background: rgba(255, 255, 255, 0.08);
	}

	/* Wide screens and landscape: full-height poster with the menu beside it */
	@media (min-aspect-ratio: 1/1) and (min-width: 640px) {
		.main-menu {
			flex-direction: row;
			justify-content: center;
			align-items: center;
			gap: var(--space-xl);
			padding-inline: var(--space-lg);
		}

		.poster {
			width: auto;
			height: 100%;
			mask-image: none;
			box-shadow: 0 0 48px rgba(0, 0, 0, 0.5);
		}

		.menu-content {
			flex: none;
			width: 320px;
			padding: 0;
		}

		.dice-icon {
			display: block;
			margin-bottom: var(--space-sm);
		}
	}

	/* Landscape phones: compact controls to fit the short height */
	@media (orientation: landscape) and (max-height: 500px) {
		.main-menu { gap: var(--space-lg); }
		.menu-content { gap: var(--space-sm); width: 280px; }
		.menu-buttons { gap: var(--space-xs); }
		.menu-btn { padding: 10px var(--space-md); font-size: var(--font-size-base); line-height: var(--line-height-base); }
		.menu-btn.secondary, .menu-btn.quiet { padding: 8px var(--space-md); }
		.nav-link { min-height: 36px; }
		/* No room for the dice icon on short landscape screens */
		.dice-icon { display: none; }
	}
</style>
