<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';
</script>

<div class="subpage">
	<PageHeader title="Settings" onback={() => history.back()} />

	<div class="subpage-content">
		<SettingsPanel />
	</div>
</div>
