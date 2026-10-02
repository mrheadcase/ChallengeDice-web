<script>
	import '@fontsource/barlow-semi-condensed/500.css';
	import '@fontsource/barlow-semi-condensed/600.css';
	import '@fontsource/barlow-semi-condensed/700.css';
	import '../app.css';
	// Import preferences to ensure theme is applied on load
	import '$lib/stores/preferences.svelte';

	let { children } = $props();
</script>

<div class="app-shell">
	{@render children()}
</div>

<style>
	.app-shell {
		width: 100%;
		height: 100dvh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
</style>
