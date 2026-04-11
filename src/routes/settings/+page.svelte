<script lang="ts">
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';
</script>

<div class="settings-page">
	<header class="settings-header">
		<button class="back-btn" onclick={() => history.back()}>← Back</button>
		<h2>Settings</h2>
	</header>

	<div class="settings-content">
		<SettingsPanel />
	</div>
</div>

<style>
	.settings-page {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow-y: auto;
	}

	.settings-header {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 16px;
	}

	.back-btn { color: var(--gold-amber); font-weight: 600; padding: 8px; }
	h2 { color: var(--text-dark); }

	.settings-content {
		padding: 0 16px 32px;
		max-width: 640px;
		margin: 0 auto;
		width: 100%;
	}
</style>
