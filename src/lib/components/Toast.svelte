<script lang="ts">
	interface ToastMessage {
		id: number;
		text: string;
		type: 'info' | 'error' | 'success';
	}

	let messages = $state<ToastMessage[]>([]);
	let nextId = 0;

	export function show(text: string, type: 'info' | 'error' | 'success' = 'info', durationMs = 3000) {
		const id = nextId++;
		messages = [...messages, { id, text, type }];
		setTimeout(() => {
			messages = messages.filter(m => m.id !== id);
		}, durationMs);
	}
</script>

<div class="toast-container">
	{#each messages as msg (msg.id)}
		<div class="toast toast-{msg.type}">
			{msg.text}
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		top: 16px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 2000;
		display: flex;
		flex-direction: column;
		gap: 8px;
		pointer-events: none;
	}

	.toast {
		padding: 10px 20px;
		border-radius: var(--radius-md);
		font-weight: 500;
		font-size: var(--font-size-sm);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
		animation: slideIn 300ms ease;
	}

	.toast-info { background: var(--brown); color: var(--text-light); }
	.toast-error { background: var(--score-negative); color: white; }
	.toast-success { background: var(--score-positive); color: white; }

	@keyframes slideIn {
		from { opacity: 0; transform: translateY(-10px); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>
