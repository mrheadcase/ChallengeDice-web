<script lang="ts">
	// Scorecard component — ported from ScorecardView.kt
	import type { Scorecard as ScorecardType, DiceCombination } from '$lib/game/models';
	import { calculateRowScore, calculateScore } from '$lib/game/logic';
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

	// Columns in the penalty zone (the widest row's count); --penalty-cols in the styles matches it
	const MAX_PENALTY_DISPLAY = 5;

	let scoreResult = $derived(calculateScore(scorecard));

	function getPreviewLeftAdded(rowNumber: number): number {
		if (!previewCombination) return 0;
		let added = 0;
		if (previewCombination.pair1Sum === rowNumber) added++;
		if (previewCombination.pair2Sum === rowNumber) added++;
		return added;
	}

	// Which pair's colour a previewed mark in this row takes (the .preview-pair1/2 classes)
	function getPreviewPair(rowNumber: number): 'pair1' | 'pair2' | null {
		if (!previewCombination) return null;
		if (previewCombination.pair1Sum === rowNumber) return 'pair1';
		if (previewCombination.pair2Sum === rowNumber) return 'pair2';
		return null;
	}

	// True minus sign (−) to match the sheet's labels; hyphens read as dashes
	function formatScore(n: number): string {
		return n < 0 ? `−${Math.abs(n)}` : String(n);
	}

	function isBoxFilled(rowNumber: number, boxIndex: number): boolean {
		const marks = scorecard.leftMarks[rowNumber] ?? 0;
		return boxIndex < marks;
	}

	function isRightBoxFilled(dieValue: number, boxIndex: number): boolean {
		const marks = scorecard.rightMarks[dieValue] ?? 0;
		return boxIndex < marks;
	}

	function isPreviewBox(rowNumber: number, boxIndex: number): boolean {
		if (!previewCombination) return false;
		const marks = scorecard.leftMarks[rowNumber] ?? 0;
		const added = getPreviewLeftAdded(rowNumber);
		return boxIndex >= marks && boxIndex < marks + added;
	}

	function isRightPreviewBox(dieValue: number, boxIndex: number): boolean {
		if (!previewCombination || previewCombination.fifthDie !== dieValue) return false;
		const marks = scorecard.rightMarks[dieValue] ?? 0;
		return boxIndex === marks;
	}

	function rowIsNearScoring(rowNumber: number): boolean {
		const config = LEFT_SCORECARD_CONFIG.find(c => c.rowNumber === rowNumber);
		if (!config) return false;
		const marks = scorecard.leftMarks[rowNumber] ?? 0;
		return marks > 0 && marks === config.penaltyBoxCount;
	}

	const RIGHT_SCORECARD_TOTAL = RIGHT_SCORECARD_ROWS.length * RIGHT_SCORECARD_BOXES_PER_ROW;

	let rightMarkTotal = $derived(
		RIGHT_SCORECARD_ROWS.reduce((sum, v) => sum + Math.min(scorecard.rightMarks[v] ?? 0, RIGHT_SCORECARD_BOXES_PER_ROW), 0)
	);

	function isRightRowFull(dieValue: number): boolean {
		return (scorecard.rightMarks[dieValue] ?? 0) >= RIGHT_SCORECARD_BOXES_PER_ROW;
	}
</script>

<div class="scorecard text-{preferences.current.scorecardTextSize}" class:compact>
	<!-- LEFT SCORECARD -->
	<div class="scorecard-section">
		<!-- Header row — quiet zone labels, centred over their columns -->
		<div class="scorecard-row header-row">
			<span class="row-label"></span>
			<span class="header-penalty">Penalty −10</span>
			<span class="zone-gap"></span>
			{#each SCORING_MULTIPLIERS as mult}
				<span class="header-mult">{mult}×</span>
			{/each}
			<span class="zone-gap"></span>
			<span class="header-score">+/−</span>
		</div>

		{#each LEFT_SCORECARD_CONFIG as config}
			{@const marks = scorecard.leftMarks[config.rowNumber] ?? 0}
			{@const score = calculateRowScore(config.rowNumber, marks)}
			{@const nearScoring = rowIsNearScoring(config.rowNumber)}
			{@const emptySlots = MAX_PENALTY_DISPLAY - config.penaltyBoxCount}
			{@const previewPair = getPreviewPair(config.rowNumber)}
			<!-- Latest mark in the scoring zone — the multiplier this row is currently scoring at -->
			{@const currentIdx = marks > config.penaltyBoxCount ? marks - 1 : -1}
			<div class="scorecard-row" class:near-scoring={nearScoring}>
				<span class="row-label">{config.rowNumber}</span>
				<!-- Empty slots keep columns aligned; left blank so the penalty zone reads as a staircase -->
				{#each { length: emptySlots } as _}
					<span class="box spacer-box"></span>
				{/each}
				<!-- Penalty boxes -->
				{#each { length: config.penaltyBoxCount } as _, boxIdx}
					{@const filled = isBoxFilled(config.rowNumber, boxIdx)}
					{@const preview = isPreviewBox(config.rowNumber, boxIdx)}
					<span
						class="box penalty-box"
						class:zone-start={boxIdx === 0}
						class:zone-end={boxIdx === config.penaltyBoxCount - 1}
						class:filled
						class:preview
						class:preview-pair1={preview && previewPair === 'pair1'}
						class:preview-pair2={preview && previewPair === 'pair2'}
					>
						{#if filled}
							<span class="mark penalty-mark">X</span>
						{:else if preview}
							<span class="mark preview-mark">X</span>
						{/if}
					</span>
				{/each}
				<span class="zone-gap"></span>
				<!-- Scoring boxes -->
				{#each SCORING_MULTIPLIERS as mult, mi}
					{@const boxIdx = config.penaltyBoxCount + mi}
					{@const filled = isBoxFilled(config.rowNumber, boxIdx)}
					{@const preview = isPreviewBox(config.rowNumber, boxIdx)}
					<span
						class="box scoring-box"
						class:zone-start={mi === 0}
						class:zone-end={mi === SCORING_MULTIPLIERS.length - 1}
						class:current={boxIdx === currentIdx}
						class:filled
						class:preview
						class:preview-pair1={preview && previewPair === 'pair1'}
						class:preview-pair2={preview && previewPair === 'pair2'}
						title="{config.baseValue} × {mult} = {config.baseValue * mult}"
					>
						{#if filled && boxIdx === currentIdx}
							<!-- The latest mark shows the value the row is scoring, rather than an X -->
							<span class="current-value">{config.baseValue * mult}</span>
						{:else if filled}
							<span class="mark scored-mark">X</span>
						{:else if preview}
							<span class="mark preview-mark">X</span>
						{:else}
							<span class="multiplier-hint">{config.baseValue * mult}</span>
						{/if}
					</span>
				{/each}
				<span class="zone-gap"></span>
				<span class="row-score" class:positive={score > 0} class:negative={score < 0}>
					{score !== 0 ? formatScore(score) : ''}
				</span>
			</div>
		{/each}

		<!-- Totals footer — each total sits under the zone it sums: penalties, scored, then total under +/− -->
		<div class="summary-row" role="group" aria-label="Score">
			<span class="row-label"></span>
			<div class="stat stat-penalty">
				<span class="stat-label">Penalties</span>
				<span class="stat-value" class:negative={scoreResult.negativeTotal < 0}>
					{formatScore(scoreResult.negativeTotal)}
				</span>
			</div>
			<span class="zone-gap"></span>
			<div class="stat stat-scored">
				<span class="stat-label">Scored</span>
				<span class="stat-value" class:positive={scoreResult.positiveTotal > 0}>
					{scoreResult.positiveTotal > 0 ? `+${scoreResult.positiveTotal}` : '0'}
				</span>
			</div>
			<span class="zone-gap"></span>
			<div class="stat stat-total">
				<span class="stat-label">Total</span>
				<span
					class="stat-value"
					class:positive={scoreResult.totalScore > 0}
					class:negative={scoreResult.totalScore < 0}
				>
					{formatScore(scoreResult.totalScore)}
				</span>
			</div>
		</div>
	</div>

	<!-- RIGHT SCORECARD — 5th-die meters in their own tinted panel. Filling all of them ends the player's game. -->
	<div class="fifth-panel">
		<div class="fifth-section">
			<div class="fifth-header">
				<span class="fifth-title">5th die</span>
				<span class="fifth-count" title="Your game ends when all {RIGHT_SCORECARD_TOTAL} boxes are marked">
					{rightMarkTotal} / {RIGHT_SCORECARD_TOTAL}
				</span>
			</div>
			<div class="fifth-progress" aria-hidden="true">
				<div class="fifth-progress-fill" style:width="{(rightMarkTotal / RIGHT_SCORECARD_TOTAL) * 100}%"></div>
			</div>
	
			<div class="fifth-meters">
				{#each RIGHT_SCORECARD_ROWS as dieValue}
					{@const marks = scorecard.rightMarks[dieValue] ?? 0}
					{@const full = isRightRowFull(dieValue)}
					{@const almostFull = marks === RIGHT_SCORECARD_BOXES_PER_ROW - 1}
					<div
						class="fifth-meter"
						class:full
						class:almost-full={almostFull}
						role="img"
						aria-label="5th die {dieValue}: {marks} of {RIGHT_SCORECARD_BOXES_PER_ROW} marked{full ? ', full' : ''}"
					>
						<span class="fifth-die">
							<DiceView value={dieValue} size={compact ? 16 : 20} />
						</span>
						<span class="fifth-boxes">
							{#each { length: RIGHT_SCORECARD_BOXES_PER_ROW } as _, boxIdx}
								<span
									class="fifth-box"
									class:filled={isRightBoxFilled(dieValue, boxIdx)}
									class:preview={isRightPreviewBox(dieValue, boxIdx)}
								></span>
							{/each}
						</span>
					</div>
				{/each}
			</div>
		</div>
	</div>

</div>

<style>
	/*
	 * Cell width shrinks with the available width so the full sheet (label + 11 boxes +
	 * zone gaps + score column) fits a phone screen. 98px = 16px padding + 24px label
	 * + 12px zone gaps + 40px score column + 6px scrollbar. cqi falls back to viewport
	 * width when no ancestor is a size container.
	 */
	.scorecard {
		--cell: clamp(20px, calc((100cqi - 98px) / 11), 28px);
		/* Hairline grid and pale zone tints derived from the mark colours, so both themes follow */
		--sc-grid-line: color-mix(in srgb, var(--sc-border) 40%, transparent);
		--sc-penalty-tint: color-mix(in srgb, var(--sc-mark-penalty) 12%, var(--card-bg));
		--sc-scoring-tint: color-mix(in srgb, var(--sc-mark-scored) 12%, var(--card-bg));
		--sc-zone-radius: var(--radius-sm);
		/* Zone widths in cells — match MAX_PENALTY_DISPLAY and SCORING_MULTIPLIERS.length */
		--penalty-cols: 5;
		--scoring-cols: 6;

		/*
		 * Text roles — sizes from the type scale (px, since they're bound to fixed
		 * cells) times the preference multiplier and density. Header labels and
		 * in-box point values are also capped so "100" and "10x" (~1.85em wide in
		 * proportional digits) fit narrow phone cells, and never drop below 10px.
		 */
		--sc-k: calc(var(--sc-scale, 1) * var(--sc-density, 1));
		--sc-header: max(10px, min(calc(11px * var(--sc-k)), calc((var(--cell) - 2px) * 0.54)));
		--sc-box-label: var(--sc-header);
		--sc-body: calc(14px * var(--sc-k));

		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
		padding: var(--space-sm);
		background: var(--card-bg);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		overflow: auto;
		font-size: var(--sc-body);
		/* Equal-width digits keep the score column and totals aligned */
		font-variant-numeric: tabular-nums;
	}

	/* Scorecard text size preference */
	.text-small { --sc-scale: 0.85; }
	.text-medium { --sc-scale: 0.92; }
	.text-large { --sc-scale: 1; }
	.text-extra_large { --sc-scale: 1.15; }

	.scorecard.compact {
		--cell: 22px;
		--sc-density: 0.85;
		gap: var(--space-sm);
		padding: var(--space-xs);
	}

	/*
	 * Size to the grid so row highlights stop at the score column, and centre it so it
	 * sits over the 5th-die panel when the card is wider than the grid (e.g. tablets)
	 */
	.scorecard-section {
		display: flex;
		flex-direction: column;
		width: fit-content;
		align-self: center;
	}

	/* Row layout */
	.scorecard-row {
		display: flex;
		align-items: center;
		height: 28px;
	}

	.compact .scorecard-row {
		height: 22px;
	}

	/* Header row — plain labels, no fills */
	.header-row {
		height: 24px;
		font-size: var(--sc-header);
		font-weight: 600;
		color: var(--text-medium);
	}

	.header-penalty {
		width: calc(var(--cell) * var(--penalty-cols));
		display: flex;
		align-items: center;
		justify-content: center;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.header-mult {
		font-variant-numeric: proportional-nums;
		width: var(--cell);
		display: flex;
		justify-content: center;
		flex-shrink: 0;
	}

	.header-score {
		width: 40px;
		text-align: right;
		padding-right: var(--space-xs);
		flex-shrink: 0;
	}

	/* Row labels */
	.row-label {
		width: 24px;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		flex-shrink: 0;
		color: var(--sc-text);
		font-size: var(--sc-body);
	}

	/* Space, not rules, separates penalty zone / scoring zone / score column */
	.zone-gap {
		width: 6px;
		flex-shrink: 0;
	}

	/* Almost scoring: amber band across the row, same cue as the 5th-die meters */
	.scorecard-row.near-scoring {
		background: var(--warning-tint);
		border-radius: var(--sc-zone-radius);
	}

	.near-scoring .row-label {
		color: var(--sc-near-text);
	}

	/* Boxes — positioned so the preview outline can overlay them */
	.box {
		position: relative;
		width: var(--cell);
		height: 100%;
		border: 0.5px solid var(--sc-grid-line);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: background-color var(--transition-fast);
	}

	.box.spacer-box {
		border-color: transparent;
	}

	.box.penalty-box {
		background: var(--sc-penalty-tint);
	}

	.box.scoring-box {
		background: var(--sc-scoring-tint);
	}

	/* Each zone reads as one rounded strip per row */
	.box.zone-start {
		border-top-left-radius: var(--sc-zone-radius);
		border-bottom-left-radius: var(--sc-zone-radius);
	}

	.box.zone-end {
		border-top-right-radius: var(--sc-zone-radius);
		border-bottom-right-radius: var(--sc-zone-radius);
	}

	/* Current scoring level: the latest mark in the scoring zone, showing its value */
	.scoring-box.current {
		box-shadow: inset 0 0 0 1.5px var(--sc-mark-scored);
	}

	.current-value {
		font-variant-numeric: proportional-nums;
		font-size: var(--sc-box-label);
		font-weight: 700;
		color: var(--sc-mark-scored);
		line-height: 1;
	}

	/* Preview of the selected combination's marks, tinted in its pair's colour */
	.box.preview-pair1 { --preview-color: var(--combo-pair1); }
	.box.preview-pair2 { --preview-color: var(--combo-pair2); }

	.box.preview.preview-pair1,
	.box.preview.preview-pair2 {
		background-color: color-mix(in srgb, var(--preview-color) 15%, transparent);
	}

	/*
	 * Dashed preview outline drawn as an overlay above the cell, so neighbouring cells'
	 * tinted backgrounds can't paint over its sides. It always has the same small radius on
	 * all four corners: Safari skips the vertical sides of a dashed border whose corners
	 * are square, so inheriting a zone cell's one-sided rounding lost the right edge.
	 */
	.box.preview::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 1;
		border: 1.5px dashed var(--preview-color, currentColor);
		border-radius: var(--sc-zone-radius);
		pointer-events: none;
	}

	/* Marks */
	.mark {
		font-weight: 700;
		font-size: var(--sc-body);
		line-height: 1;
	}

	.penalty-mark { color: var(--sc-mark-penalty); }
	.scored-mark { color: var(--sc-mark-scored); }

	.preview-mark {
		color: var(--preview-color);
		opacity: 0.7;
	}

	/* Proportional digits — "100" is ~8% narrower, and in-cell values don't need column alignment */
	.multiplier-hint {
		font-variant-numeric: proportional-nums;
		font-size: var(--sc-box-label);
		color: color-mix(in srgb, var(--sc-hint-color) 70%, transparent);
		font-weight: 600;
	}

	/* Row score */
	.row-score {
		width: 40px;
		text-align: right;
		font-weight: 700;
		flex-shrink: 0;
		padding-right: var(--space-xs);
		font-size: var(--sc-body);
	}

	.row-score.positive { color: var(--score-positive); }
	.row-score.negative { color: var(--score-negative); }

	/*
	 * 5th-die meters — a progress tracker rather than a scoring grid, so marks are
	 * solid fills in the 5th-die colour instead of X's.
	 */
	/* Full-width tinted panel (page tone) sets the section apart without adding more lines */
	.fifth-panel {
		display: flex;
		justify-content: center;
		/* Narrow side padding so the centred meters still fit 375px phones */
		padding: var(--space-md) var(--space-sm);
		background: var(--cream);
		border-radius: var(--radius-md);
	}

	.compact .fifth-panel {
		padding: var(--space-sm);
	}

	/* Sized to the meters and centred, so header, progress bar, and meters share one width */
	.fifth-section {
		align-self: center;
		width: fit-content;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.fifth-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		color: var(--sc-text);
	}

	.fifth-title {
		font-weight: 600;
		font-size: var(--sc-body);
	}

	.fifth-count {
		font-weight: 600;
		font-size: var(--sc-header);
		color: var(--text-medium);
	}

	.fifth-progress {
		height: 4px;
		border-radius: var(--space-2xs);
		background: var(--sc-filled-bg);
		overflow: hidden;
	}

	.fifth-progress-fill {
		height: 100%;
		background: var(--combo-fifth);
		transition: width var(--transition-normal);
	}

	/* Fills down each column: 1–3 on the left, 4–6 on the right */
	.fifth-meters {
		display: grid;
		grid-template-columns: repeat(2, auto);
		grid-template-rows: repeat(3, auto);
		grid-auto-flow: column;
		gap: var(--space-sm) var(--space-xl);
		padding-top: var(--space-xs);
	}

	.fifth-meter {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-2xs);
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
	}

	/* Same amber "almost there" cue as near-scoring rows on the left grid */
	.fifth-meter.almost-full {
		border-color: var(--warning);
		background: color-mix(in srgb, var(--warning) 10%, transparent);
	}

	.fifth-meter.full .fifth-die {
		opacity: 0.4;
	}

	.fifth-boxes {
		display: flex;
		gap: 3px;
	}

	/* Shrinks with the sheet's cells so the meters still fit narrow phones */
	.fifth-box {
		width: min(24px, var(--cell));
		height: 14px;
		border-radius: var(--radius-xs);
		border: 1px solid var(--sc-border);
		background: var(--card-bg);
		transition: background-color var(--transition-fast);
	}

	.compact .fifth-box {
		width: 20px;
		height: 12px;
	}

	.fifth-box.filled {
		background: var(--combo-fifth);
		border-color: var(--combo-fifth);
	}

	.fifth-meter.full .fifth-box.filled {
		opacity: 0.5;
	}

	.fifth-box.preview {
		border: 1.5px dashed var(--combo-fifth);
		background: color-mix(in srgb, var(--combo-fifth) 25%, transparent);
	}

	/*
	 * Totals footer — shares the grid's column widths. A rule over each zone reads like
	 * the total line on a paper score sheet; all three values are the same size.
	 */
	.summary-row {
		display: flex;
		align-items: stretch;
		margin-top: var(--space-sm);
	}

	.summary-row .row-label {
		height: auto;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2xs);
		padding-top: var(--space-sm);
		border-top: 1.5px solid var(--sc-border);
		flex-shrink: 0;
	}

	.stat-penalty { width: calc(var(--cell) * var(--penalty-cols)); }
	.stat-scored { width: calc(var(--cell) * var(--scoring-cols)); }

	/* Total lines up with the +/− column: same width, right-aligned like the row scores */
	.stat-total {
		width: 40px;
		align-items: flex-end;
		padding-right: var(--space-xs);
	}

	.stat-label {
		font-size: var(--sc-header);
		font-weight: 600;
		color: var(--text-medium);
		line-height: 1.2;
		white-space: nowrap;
	}

	/* Same size as the row scores; proportional digits so "−110" fits the 40px +/− column */
	.stat-value {
		font-variant-numeric: proportional-nums;
		font-size: var(--sc-body);
		font-weight: 700;
		color: var(--sc-text);
		line-height: 1.2;
		white-space: nowrap;
	}

	.stat-value.positive { color: var(--score-positive); }
	.stat-value.negative { color: var(--score-negative); }

	/*
	 * Portrait phones: tighter rows and spacing so the whole sheet, totals, and 5th-die
	 * panel fit on screen without scrolling. Cells are ~22px wide here, so rows go square.
	 */
	@media (max-width: 767px) and (orientation: portrait) {
		.scorecard { gap: var(--space-sm); }
		.scorecard-row { height: 22px; }
		.header-row { height: 20px; }
		.summary-row { margin-top: var(--space-xs); }
		.stat { padding-top: var(--space-xs); gap: 0; }
		.fifth-panel { padding: var(--space-sm); }

		/*
		 * Shorter panel: title, progress bar, and count share one line, and the meters
		 * run 3 across (1–3 over 4–6) so they take two rows instead of three. The panel's
		 * full width is shared out, so the boxes stretch to fill it.
		 */
		.fifth-section {
			width: 100%;
			display: grid;
			grid-template-columns: auto 1fr auto;
			align-items: center;
			gap: var(--space-xs) var(--space-sm);
		}
		.fifth-header { display: contents; }
		.fifth-title { grid-area: 1 / 1; }
		.fifth-progress { grid-area: 1 / 2; }
		.fifth-count { grid-area: 1 / 3; }
		.fifth-meters {
			grid-column: 1 / -1;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			grid-template-rows: none;
			grid-auto-flow: row;
			gap: var(--space-xs) var(--space-sm);
			padding-top: 0;
		}
		.fifth-meter { gap: var(--space-xs); }
		.fifth-die :global(svg) { width: 16px; height: 16px; }
		.fifth-boxes { flex: 1; min-width: 0; gap: var(--space-2xs); }
		.fifth-box { flex: 1; width: auto; max-width: 24px; height: 12px; }
	}

	/* Short portrait phones (e.g. Safari with its toolbars showing): slightly tighter still */
	@media (max-width: 767px) and (orientation: portrait) and (max-height: 740px) {
		.scorecard { gap: var(--space-xs); }
		.scorecard-row { height: 20px; }
		.header-row { height: 18px; }
		.fifth-panel { padding: 6px var(--space-sm); }
		.fifth-meter { padding: 1px var(--space-2xs); }
	}
</style>
