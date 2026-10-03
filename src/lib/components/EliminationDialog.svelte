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
		<div class="dialog" onclick={(e) => e.stopPropagation()} role="alertdialog" tabindex="-1" aria-label="Player eliminated">
			<div class="icon">X</div>
			<h3>{title}</h3>
			<p>No valid combinations available.</p>
			<button class="btn btn-primary dismiss-btn" onclick={ondismiss}>OK</button>
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
		z-index: 500;
	}

	.dialog {
		background: var(--card-bg);
		border-radius: var(--radius-xl);
		padding: var(--space-lg) var(--space-xl);
		text-align: center;
		max-width: 320px;
		box-shadow: var(--shadow-overlay);
	}

	.icon {
		width: 48px;
		height: 48px;
		border-radius: var(--radius-full);
		background: var(--score-negative);
		color: var(--text-on-color);
		font-weight: 700;
		font-size: var(--font-size-xl);
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 12px;
	}

	h3 {
		color: var(--text-dark);
		margin-bottom: var(--space-sm);
	}

	p {
		color: var(--text-medium);
		font-size: var(--font-size-sm);
		margin-bottom: var(--space-md);
	}

	.dismiss-btn {
		padding: 10px var(--space-xl);
		border-radius: var(--radius-md);
	}
</style>
