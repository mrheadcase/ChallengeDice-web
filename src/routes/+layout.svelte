<script>
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
