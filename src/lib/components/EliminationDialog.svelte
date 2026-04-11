<script lang="ts">
	interface Props {
		playerNames: string[];
		visible?: boolean;
		ondismiss?: () => void;
	}

	let { playerNames, visible = false, ondismiss }: Props = $props();

	let title = $derived(
		playerNames.length === 1
			? `${playerNames[0]} has been eliminated!`
			: `${playerNames.join(' & ')} have been eliminated!`
	);
</script>

{#if visible}
	<div class="overlay" onclick={ondismiss} role="presentation">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="dialog" onclick={(e) => e.stopPropagation()} role="alertdialog" aria-label="Player eliminated">
			<div class="icon">X</div>
			<h3>{title}</h3>
			<p>No valid combinations available.</p>
			<button class="dismiss-btn" onclick={ondismiss}>OK</button>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 500;
	}

	.dialog {
		background: var(--card-bg);
		border-radius: var(--radius-xl);
		padding: 24px 32px;
		text-align: center;
		max-width: 320px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
	}

	.icon {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: var(--score-negative);
		color: white;
		font-weight: 700;
		font-size: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 12px;
	}

	h3 {
		color: var(--text-dark);
		margin-bottom: 8px;
	}

	p {
		color: var(--text-medium);
		font-size: var(--font-size-sm);
		margin-bottom: 16px;
	}

	.dismiss-btn {
		background: var(--gold-amber);
		color: white;
		padding: 10px 32px;
		border-radius: var(--radius-md);
		font-weight: 600;
	}
</style>
