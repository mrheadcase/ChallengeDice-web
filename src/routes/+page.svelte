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
				<button class="btn btn-primary btn-lg menu-btn" onclick={() => { localGame.resumeGame(); goto(`${base}/play/game`); }}>
					Resume Game
				</button>
			{/if}
			<button
				class="btn menu-btn"
				class:btn-primary={!hasSaved}
				class:btn-lg={!hasSaved}
				class:quiet={hasSaved}
				onclick={() => goto(`${base}/play/setup`)}
			>
				New Local Game
			</button>
			<button class="btn btn-secondary menu-btn compact" onclick={() => goto(`${base}/online`)}>
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
	 * the menu fills the space below it. On screens too short for both, the menu keeps
	 * its natural height (with or without Resume) and the poster shrinks into the rest,
	 * centred over a blurred copy of itself.
	 */
	.main-menu {
		position: relative;
		height: 100%;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		background: var(--chrome-bg);
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
		/*
		 * Always spans the full width. When the screen is too short for the whole poster
		 * plus the menu, its box gets shorter and cover crops it: mostly the tiled floor
		 * below the tagline (~bottom 15% of the art), with a little of the sky above the title.
		 */
		width: 100%;
		aspect-ratio: 2 / 3;
		height: auto;
		min-height: 0;
		flex: 0 1 auto;
		object-fit: cover;
		object-position: 50% 30%;
		/* Soften the bottom edge into the menu area, short enough to leave the tagline alone */
		mask-image: linear-gradient(to bottom, #000 calc(100% - 16px), transparent 100%);
	}

	.menu-content {
		position: relative;
		z-index: 1;
		flex: 1 0 auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md) max(var(--space-sm), env(safe-area-inset-bottom));
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

	/* Shared .btn styles; the menu only tightens padding and gives the primary a stronger glow */
	.menu-btn {
		padding: 12px var(--space-lg);
	}

	.menu-btn.btn-primary {
		box-shadow: var(--shadow-primary-strong);
	}

	/* One size below the primary: Online Game, and New Local Game when Resume is shown */
	.menu-btn.compact,
	.menu-btn.quiet {
		padding: 10px var(--space-lg);
	}

	/* New Local Game when Resume is the primary: translucent outline over the dark backdrop */
	.menu-btn.quiet {
		background: color-mix(in srgb, var(--chrome-bg) 55%, transparent);
		color: var(--chrome-text);
		border: 1px solid color-mix(in srgb, var(--chrome-accent) 45%, transparent);
	}
	.menu-btn.quiet:hover {
		background: color-mix(in srgb, var(--chrome-bg) 75%, transparent);
		border-color: var(--chrome-accent);
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
		color: color-mix(in srgb, var(--chrome-text) 85%, transparent);
		font-size: var(--font-size-sm);
		font-weight: 600;
		border-radius: var(--radius-md);
	}
	.nav-link:hover {
		color: var(--chrome-accent);
		background: var(--chrome-hover);
	}

	/*
	 * Tablets in portrait: the poster is wide enough that cover would crop well into the
	 * title, so it scales down whole instead, with the blurred backdrop filling the sides
	 */
	@media (min-width: 600px) and (max-aspect-ratio: 1/1) {
		.poster { object-fit: contain; }
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
		.menu-btn.compact, .menu-btn.quiet { padding: var(--space-sm) var(--space-md); }
		.nav-link { min-height: 36px; }
		/* No room for the dice icon on short landscape screens */
		.dice-icon { display: none; }
	}
</style>
