<script lang="ts">
	// Back button + title row shared by the menu's sub-pages (rules, stats, settings, setup, online…)
	interface Props {
		title: string;
		onback: () => void;
		backLabel?: string;
		/** Stays pinned while the page scrolls under it */
		sticky?: boolean;
		/** No padding of its own, for pages that already pad their content */
		flush?: boolean;
	}

	let { title, onback, backLabel = 'Back', sticky = false, flush = false }: Props = $props();
</script>

<header class="page-header" class:sticky class:flush>
	<button class="btn-text" onclick={onback}>← {backLabel}</button>
	<h2>{title}</h2>
</header>

<style>
	h2 {
		font-size: var(--font-size-xl);
	}

	.sticky {
		position: sticky;
		top: 0;
		z-index: 10;
		background: var(--cream);
	}

	.flush {
		padding: 0;
	}

	/* Landscape phones: tighter row to fit the short viewport */
	@media (orientation: landscape) and (max-height: 500px) {
		.page-header { gap: var(--space-sm); }
		h2 { font-size: var(--font-size-lg); }
		.btn-text { padding: var(--space-xs) var(--space-sm); font-size: var(--font-size-sm); }
	}
</style>
