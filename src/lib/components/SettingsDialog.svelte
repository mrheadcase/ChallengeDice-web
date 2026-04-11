<script lang="ts">
	import SettingsPanel from './SettingsPanel.svelte';

	interface Props {
		visible: boolean;
		onclose: () => void;
	}

	let { visible, onclose }: Props = $props();
</script>

{#if visible}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="overlay" onclick={onclose} role="presentation">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="dialog" onclick={(e) => e.stopPropagation()} role="dialog" aria-label="Settings" tabindex="-1">
			<div class="dialog-header">
				<h2>Settings</h2>
				<button class="close-btn" onclick={onclose} aria-label="Close settings">X</button>
			</div>
			<div class="dialog-body">
				<SettingsPanel />
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: var(--overlay-bg);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 16px;
	}

	.dialog {
		background: var(--cream);
		border-radius: var(--radius-xl);
		max-width: 480px;
		width: 100%;
		max-height: 85vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
	}

	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px 8px;
		flex-shrink: 0;
	}

	.dialog-header h2 {
		color: var(--text-dark);
		font-size: var(--font-size-xl);
		margin: 0;
	}

	.close-btn {
		width: 36px;
		height: 36px;
		min-height: 36px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
		font-weight: 700;
		font-size: var(--font-size-base);
		transition: all var(--transition-fast);
	}

	.close-btn:hover {
		background: var(--warm-tan);
		color: var(--text-dark);
	}

	.dialog-body {
		padding: 8px 20px 20px;
		overflow-y: auto;
	}
</style>
