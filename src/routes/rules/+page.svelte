<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
</script>

<div class="rules-page">
	<header class="rules-header">
		<button class="back-btn" onclick={() => history.back()}>← Back</button>
		<h2>How to Play</h2>
	</header>

	<div class="rules-content">
		<section>
			<h3>Overview</h3>
			<p>Challenge Dice is a strategic dice game for 1-4 players. Each round, 5 dice are rolled and all players use the same roll to mark their scorecards. The player with the highest score wins!</p>
		</section>

		<section>
			<h3>Each Round</h3>
			<ol>
				<li><strong>Roll 5 dice</strong> — all players share the same roll</li>
				<li><strong>Choose a combination</strong> — split the 5 dice into:
					<ul>
						<li>Two pairs (4 dice) — their sums are marked on the <strong>left scorecard</strong></li>
						<li>One 5th die — marked on the <strong>right scorecard</strong></li>
					</ul>
				</li>
				<li>Each player independently chooses how to split the dice</li>
			</ol>
		</section>

		<section>
			<h3>Left Scorecard (Rows 2-12)</h3>
			<p>Each row represents a pair sum (2 through 12). Rows have two zones:</p>
			<ul>
				<li><strong>Penalty zone</strong> (red area) — marks here score <strong>-10 points</strong></li>
				<li><strong>Scoring zone</strong> — marks here earn the row's base value multiplied by the position:
					<strong>1x, 2x, 3x, 4x, 7x, 10x</strong></li>
			</ul>
			<p>Rows with extreme sums (2, 3, 11, 12) have fewer penalty boxes but higher base values. Middle rows (6, 7, 8) have more penalty boxes but lower base values.</p>
		</section>

		<section>
			<h3>Right Scorecard (Dice 1-6)</h3>
			<p>Each row represents a die value (1-6) with 4 boxes. When all 6 rows are full (24 total marks), the game ends for that player.</p>
		</section>

		<section>
			<h3>Scoring</h3>
			<ul>
				<li>Rows with <strong>no marks</strong>: 0 points</li>
				<li>Marks only in <strong>penalty zone</strong>: -10 points</li>
				<li>Marks into <strong>scoring zone</strong>: base value × multiplier</li>
			</ul>
			<p>Your total score = sum of all left scorecard row scores.</p>
		</section>

		<section>
			<h3>Game End</h3>
			<p>The game ends when all active players have filled their right scorecard, or when a player cannot place any valid combination. That player is <strong>eliminated</strong>.</p>
		</section>

		<section>
			<h3>Strategy Tips</h3>
			<ul>
				<li>Focus on a few rows rather than spreading marks thin</li>
				<li>High-value rows (2, 12) have fewer penalty boxes — you reach scoring faster</li>
				<li>Watch your right scorecard — filling it ends your game</li>
				<li>The 7x and 10x multiplier positions are where big scores happen</li>
			</ul>
		</section>
	</div>
</div>

<style>
	.rules-page {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow-y: auto;
	}

	.rules-header {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 16px;
		position: sticky;
		top: 0;
		background: var(--cream);
		z-index: 10;
	}

	.back-btn {
		color: var(--gold-amber);
		font-weight: 600;
		padding: 8px;
	}

	h2 { color: var(--text-dark); }

	.rules-content {
		padding: 0 16px 32px;
		max-width: 640px;
		margin: 0 auto;
	}

	section {
		margin-bottom: 24px;
	}

	h3 {
		color: var(--gold-amber);
		margin-bottom: 8px;
		font-size: var(--font-size-lg);
	}

	p, li {
		color: var(--text-medium);
		line-height: 1.6;
		margin-bottom: 8px;
	}

	ul, ol {
		padding-left: 24px;
	}

	strong { color: var(--text-dark); }
</style>
