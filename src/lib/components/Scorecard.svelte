<script lang="ts">
	/*
	 * Scorecard — "progress lanes". Each row is a lane: penalty pips, then six scoring
	 * cells that fill left to right. Point values stay visible but faint; the current
	 * value, the next value, and the selected combination's preview are the only
	 * emphasised cells. Rows grow to fill whatever height the parent gives the sheet.
	 */
	import type { Scorecard as ScorecardType, DiceCombination } from '$lib/game/models';
	import { applySelection, calculateRowScore, calculateScore } from '$lib/game/logic';
	import {
		LEFT_SCORECARD_CONFIG,
		SCORING_MULTIPLIERS,
		RIGHT_SCORECARD_ROWS,
		RIGHT_SCORECARD_BOXES_PER_ROW,
	} from '$lib/game/constants';
	import { preferences } from '$lib/stores/preferences.svelte';
	import DiceView from './DiceView.svelte';

	interface Props {
		scorecard: ScorecardType;
		previewCombination?: DiceCombination | null;
		compact?: boolean;
	}

	let {
		scorecard,
		previewCombination = null,
		compact = false,
	}: Props = $props();

	type Role = 'pair1' | 'pair2';
	type CellState = 'empty' | 'passed' | 'current' | 'next' | 'preview';

	const RIGHT_SCORECARD_TOTAL = RIGHT_SCORECARD_ROWS.length * RIGHT_SCORECARD_BOXES_PER_ROW;

	let scoreResult = $derived(calculateScore(scorecard));
	// Total after the previewed move; null when nothing is selected
	let projectedTotal = $derived(
		previewCombination ? calculateScore(applySelection(scorecard, previewCombination)).totalScore : null
	);

	// True minus sign (−); hyphens read as dashes
	function formatScore(n: number): string {
		return n < 0 ? `−${Math.abs(n)}` : String(n);
	}

	function signClass(n: number): string {
		return n > 0 ? 'positive' : n < 0 ? 'negative' : '';
	}

	let rows = $derived(
		LEFT_SCORECARD_CONFIG.map((config) => {
			const row = config.rowNumber;
			const marks = scorecard.leftMarks[row] ?? 0;
			const pen = config.penaltyBoxCount;
			let added = 0;
			let role: Role | null = null;
			if (previewCombination) {
				if (previewCombination.pair1Sum === row) { added++; role = 'pair1'; }
				if (previewCombination.pair2Sum === row) { added++; role ??= 'pair2'; }
			}
			const after = Math.min(marks + added, config.totalBoxes);

			// Pips fill left to right; once the row has left the penalty zone they're "cleared"
			const pips = Array.from({ length: pen }, (_, i) =>
				i < marks ? (marks > pen ? 'cleared' : 'marked') : i < after ? 'preview' : 'empty'
			);

			const cells = SCORING_MULTIPLIERS.map((mult, k) => {
				const idx = pen + k;
				let state: CellState = 'empty';
				if (idx < marks) state = idx === marks - 1 ? 'current' : 'passed';
				else if (idx < after) state = 'preview';
				else if (idx === marks && marks >= pen) state = 'next';
				return { value: config.baseValue * mult, state };
			});

			const score = calculateRowScore(row, marks);
			return {
				row,
				marks,
				role,
				added: after - marks,
				pips,
				cells,
				score,
				previewScore: calculateRowScore(row, after),
				// One more mark starts scoring
				nearScoring: marks > 0 && marks === pen,
			};
		})
	);

	let fifthMarked = $derived(
		RIGHT_SCORECARD_ROWS.reduce((sum, v) => sum + Math.min(scorecard.rightMarks[v] ?? 0, RIGHT_SCORECARD_BOXES_PER_ROW), 0)
	);
</script>

<div class="scorecard text-{preferences.current.scorecardTextSize}" class:compact>
	<!-- Totals — on the lanes' column grid: penalties over the pips, scored over the cells, total over pts -->
	<div class="lane-grid totals" role="group" aria-label="Score">
		<div class="stat stat-penalties">
			<span class="stat-label">Penalties</span>
			<span class="stat-value" class:negative={scoreResult.negativeTotal < 0}>{formatScore(scoreResult.negativeTotal)}</span>
		</div>
		<div class="totals-right">
			<div class="stat">
				<span class="stat-label">Scored</span>
				<span class="stat-value" class:positive={scoreResult.positiveTotal > 0}>
					{scoreResult.positiveTotal > 0 ? `+${scoreResult.positiveTotal}` : '0'}
				</span>
			</div>
			<div class="stat stat-total">
				<span class="stat-label">Total</span>
				<span class="total-values">
					<span class="stat-value {signClass(scoreResult.totalScore)}">{formatScore(scoreResult.totalScore)}</span>
					{#if projectedTotal !== null}
						<!-- Colour carries the sign here; the hidden text says it for screen readers -->
						<span class="projected {signClass(projectedTotal)}" aria-hidden="true">→ {Math.abs(projectedTotal)}</span>
						<span class="sr-only">after this move: {formatScore(projectedTotal)}</span>
					{/if}
				</span>
			</div>
		</div>
	</div>

	<div class="lanes">
		<div class="lane-grid lane-header" aria-hidden="true">
			<span></span>
			<span class="header-penalty">−10 each</span>
			<span class="cells">
				{#each SCORING_MULTIPLIERS as mult}
					<span>×{mult}</span>
				{/each}
			</span>
			<span class="header-pts">pts</span>
		</div>

		{#each rows as r (r.row)}
			<div
				class="lane-grid lane {r.role ?? ''}"
				class:active={r.added > 0}
				class:near-scoring={r.nearScoring}
				role="group"
				aria-label="Row {r.row}: {r.marks} marked, {r.score ? `${formatScore(r.score)} points` : 'not started'}"
			>
				<span class="row-label">{r.row}</span>
				<span class="pips" aria-hidden="true">
					{#each r.pips as state}
						<span class="pip {state}"></span>
					{/each}
				</span>
				<span class="cells" aria-hidden="true">
					{#each r.cells as cell}
						<span class="cell {cell.state}">{cell.value}</span>
					{/each}
				</span>
				{#if r.added > 0}
					<span class="row-score preview">{formatScore(r.previewScore)}</span>
				{:else}
					<span class="row-score {signClass(r.score)}">{r.score !== 0 ? formatScore(r.score) : ''}</span>
				{/if}
			</div>
		{/each}
	</div>

	<!-- 5th-die meters — filling all of them ends the player's game -->
	<div class="fifth">
		<div class="fifth-header">
			<span class="fifth-title">5th die</span>
			<span class="fifth-progress" aria-hidden="true">
				<span class="fifth-progress-fill" style:width="{(fifthMarked / RIGHT_SCORECARD_TOTAL) * 100}%"></span>
			</span>
			<span class="fifth-count" title="Your game ends when all {RIGHT_SCORECARD_TOTAL} boxes are marked">
				{fifthMarked} / {RIGHT_SCORECARD_TOTAL}
			</span>
		</div>
		<div class="fifth-meters">
			{#each RIGHT_SCORECARD_ROWS as dieValue}
				{@const marks = scorecard.rightMarks[dieValue] ?? 0}
				{@const full = marks >= RIGHT_SCORECARD_BOXES_PER_ROW}
				{@const previewing = previewCombination?.fifthDie === dieValue}
				<div
					class="meter"
					class:full
					class:almost-full={marks === RIGHT_SCORECARD_BOXES_PER_ROW - 1}
					class:previewing
					role="img"
					aria-label="5th die {dieValue}: {marks} of {RIGHT_SCORECARD_BOXES_PER_ROW} marked{full ? ', full' : ''}"
				>
					<DiceView value={dieValue} size={compact ? 14 : 16} />
					<span class="meter-boxes">
						{#each { length: RIGHT_SCORECARD_BOXES_PER_ROW } as _, i}
							<span class="meter-box" class:filled={i < marks} class:preview={previewing && i === marks}></span>
						{/each}
					</span>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	/*
	 * Sizes are custom properties so breakpoints and density only swap values. The lane
	 * columns: row label | penalty pips | six scoring cells (share the leftover width) | pts.
	 */
	.scorecard {
		--sc-k: calc(var(--sc-scale, 1) * var(--sc-density, 1));
		--label-w: 22px;
		--pip: 12px;
		--pip-gap: 3px;
		--pips-w: calc(5 * var(--pip) + 4 * var(--pip-gap));
		--pts-w: 40px;
		--col-gap: var(--space-sm);
		--row-gap: 3px;
		--row-min: 22px;
		--cell-gap: 2px;
		--cell-font: calc(13px * var(--sc-k));
		--label-font: calc(15px * var(--sc-k));
		--value-font: calc(21px * var(--sc-k));
		--header-font: max(10px, calc(11px * var(--sc-k)));

		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		/* Fills the space its parent gives it; the lanes take whatever is left inside */
		min-height: 100%;
		padding: 10px 12px;
		background: var(--card-bg);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		color: var(--sc-text);
		font-family: var(--font-numeric);
	}

	/* Scorecard text size preference */
	.text-small { --sc-scale: 0.85; }
	.text-medium { --sc-scale: 0.92; }
	.text-large { --sc-scale: 1; }
	.text-extra_large { --sc-scale: 1.15; }

	.scorecard.compact {
		--sc-density: 0.85;
		--row-min: 18px;
		--row-gap: 2px;
		--pip: 10px;
		gap: var(--space-xs);
		padding: var(--space-sm);
	}

	.lane-grid {
		display: grid;
		grid-template-columns: var(--label-w) var(--pips-w) minmax(0, 1fr) var(--pts-w);
		column-gap: var(--col-gap);
	}

	/* Totals */
	.totals {
		align-items: end;
		flex: none;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: var(--space-xs) 0;
	}

	.stat-penalties {
		grid-column: 1 / 3;
		align-items: flex-end;
	}

	.totals-right {
		grid-column: 3 / 5;
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 12px;
		padding-left: 2px;
	}

	.stat-label {
		font-family: var(--font-family);
		font-size: var(--header-font);
		font-weight: 600;
		line-height: 1;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		white-space: nowrap;
	}

	/* All three totals share one size and weight; the frame alone sets the total apart */
	.stat-value {
		font-size: var(--value-font);
		font-weight: 600;
		line-height: 1;
		white-space: nowrap;
	}

	.stat-total {
		padding: var(--space-xs) 10px;
		border-radius: 10px;
		box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--sc-total-frame) 55%, transparent);
		background: color-mix(in srgb, var(--sc-total-frame) 9%, transparent);
	}

	.total-values {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.projected {
		font-size: calc(var(--value-font) * 0.62);
		font-weight: 600;
		line-height: 1;
		color: var(--text-muted);
		white-space: nowrap;
	}

	.positive { color: var(--score-positive); }
	.negative { color: var(--score-negative); }

	/* Lanes — 11 rows share the height left over; they never shrink below --row-min */
	.lanes {
		flex: 1;
		min-height: 0;
		display: grid;
		grid-template-rows: auto repeat(11, minmax(var(--row-min), 1fr));
		row-gap: var(--row-gap);
	}

	.lane-header {
		align-items: center;
		height: 16px;
		font-size: var(--header-font);
		font-weight: 600;
		color: var(--text-muted);
	}

	.header-penalty {
		text-align: right;
		white-space: nowrap;
	}

	.lane-header .cells span {
		text-align: center;
	}

	.header-pts {
		text-align: center;
	}

	.lane {
		border-radius: 6px;
	}

	/* Rows this move marks take a tint of their pair's colour */
	.lane.pair1 { --role: var(--combo-pair1); }
	.lane.pair2 { --role: var(--combo-pair2); }
	.lane.active { background: color-mix(in srgb, var(--role) 10%, transparent); }
	.lane.near-scoring { background: color-mix(in srgb, var(--sc-near) 9%, transparent); }

	.row-label {
		display: grid;
		place-items: center;
		font-size: var(--label-font);
		font-weight: 700;
	}

	.near-scoring .row-label { color: var(--sc-near); }

	.pips {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: var(--pip-gap);
	}

	.pip {
		width: var(--pip);
		height: var(--pip);
		border-radius: 3px;
		border: 1.5px solid color-mix(in srgb, var(--sc-penalty) 55%, transparent);
	}

	.pip.marked {
		background: var(--sc-penalty);
		border-color: var(--sc-penalty);
	}

	/* Past the penalty zone: the −10 no longer applies */
	.pip.cleared {
		background: color-mix(in srgb, var(--text-muted) 30%, transparent);
		border-color: transparent;
	}

	/* Rounded on all corners — WebKit drops the sides of dashed borders with square corners */
	.pip.preview {
		border-style: dashed;
		border-color: var(--role);
		background: color-mix(in srgb, var(--role) 28%, transparent);
	}

	.cells {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: var(--cell-gap);
		min-height: 0;
	}

	/* Every cell shows its value faintly so players can see what the row is worth */
	.cell {
		display: grid;
		place-items: center;
		border-radius: var(--radius-sm);
		background: var(--sc-cell);
		font-size: var(--cell-font);
		font-weight: 500;
		line-height: 1;
		color: color-mix(in srgb, var(--text-muted) 42%, transparent);
		overflow: hidden;
	}

	.cell.passed {
		background: var(--sc-cell-passed);
		color: color-mix(in srgb, var(--sc-text) 38%, transparent);
	}

	.cell.current {
		background: var(--sc-current-bg);
		color: var(--sc-current-text);
		font-weight: 700;
	}

	.cell.next {
		box-shadow: inset 0 0 0 1px var(--sc-line);
		color: var(--text-muted);
		font-weight: 600;
	}

	.cell.preview {
		background: color-mix(in srgb, var(--role) 24%, transparent);
		box-shadow: inset 0 0 0 1.5px var(--role);
		color: var(--role);
		font-weight: 700;
	}

	.row-score {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--label-font);
		font-weight: 700;
	}

	.row-score.preview { color: var(--role); }

	/* 5th-die meters — one row of six */
	.fifth {
		flex: none;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.fifth-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.fifth-title {
		font-family: var(--font-family);
		font-size: var(--font-size-xs);
		font-weight: 700;
		white-space: nowrap;
	}

	.fifth-progress {
		flex: 1;
		height: 4px;
		border-radius: 2px;
		background: var(--sc-cell);
		overflow: hidden;
	}

	.fifth-progress-fill {
		display: block;
		height: 100%;
		background: var(--combo-fifth);
		transition: width var(--transition-normal);
	}

	.fifth-count {
		font-size: var(--font-size-sm);
		font-weight: 700;
		color: var(--text-medium);
		white-space: nowrap;
	}

	.fifth-meters {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 6px;
	}

	.meter {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
		padding: 5px;
		border-radius: var(--radius-md);
		background: var(--sc-well);
	}

	/* One more mark fills it */
	.meter.almost-full { box-shadow: inset 0 0 0 1.5px var(--warning); }
	.meter.previewing { box-shadow: inset 0 0 0 1.5px var(--combo-fifth); }
	.meter.full { opacity: 0.5; }

	.meter-boxes {
		display: flex;
		gap: 2px;
		width: 100%;
	}

	.meter-box {
		flex: 1;
		height: 7px;
		border-radius: 2px;
		background: var(--sc-cell);
		box-shadow: inset 0 0 0 1px var(--sc-line);
		transition: background-color var(--transition-fast);
	}

	.meter-box.filled {
		background: var(--combo-fifth);
		box-shadow: none;
	}

	.meter-box.preview {
		background: color-mix(in srgb, var(--combo-fifth) 30%, transparent);
		box-shadow: inset 0 0 0 1.5px var(--combo-fifth);
	}

	/* Short portrait phones: a little tighter so the sheet keeps its row height */
	@media (max-width: 767px) and (orientation: portrait) and (max-height: 740px) {
		.scorecard {
			--row-min: 20px;
			--row-gap: 2px;
			--pip: 10px;
			--label-w: 20px;
			--pts-w: 36px;
			--col-gap: 6px;
			--value-font: calc(18px * var(--sc-k));
			gap: 6px;
			padding: var(--space-sm) 10px;
		}
	}

	/*
	 * Landscape phones: too short for a 5th-die row under the lanes, so the meters become
	 * a column on the right and the lanes get the full height
	 */
	@media (orientation: landscape) and (max-height: 500px) {
		.scorecard:not(.compact) {
			--row-min: 18px;
			--row-gap: 2px;
			--pip: 10px;
			--label-w: 20px;
			--pts-w: 36px;
			--col-gap: 6px;
			--value-font: calc(18px * var(--sc-k));
			display: grid;
			grid-template-columns: minmax(0, 1fr) 124px;
			grid-template-rows: auto minmax(0, 1fr);
			gap: 6px 12px;
			height: 100%;
			padding: var(--space-sm) 10px;
		}
		.scorecard:not(.compact) .fifth { grid-column: 2; grid-row: 1 / 3; }
		.scorecard:not(.compact) .fifth-meters { grid-template-columns: 1fr; gap: var(--space-xs); }
		.scorecard:not(.compact) .meter { flex-direction: row; gap: var(--space-sm); padding: var(--space-xs) 6px; }
	}

	/* Tablets and up: bigger targets and type */
	@media (min-width: 768px) and (min-height: 501px) {
		.scorecard:not(.compact) {
			--label-w: 30px;
			--pip: 16px;
			--pts-w: 56px;
			--col-gap: 14px;
			--row-gap: 4px;
			--row-min: 30px;
			--cell-gap: 3px;
			--cell-font: calc(17px * var(--sc-k));
			--label-font: calc(19px * var(--sc-k));
			--value-font: calc(28px * var(--sc-k));
			gap: 12px;
			padding: 16px 20px;
		}
		.scorecard:not(.compact) .meter-box { height: 10px; }
	}
</style>
