<script lang="ts">
	// Scorecard component — ported from ScorecardView.kt
	import type { Scorecard as ScorecardType, DiceCombination, PlayerColor } from '$lib/game/models';
	import { calculateRowScore, calculateScore } from '$lib/game/logic';
	import {
		LEFT_SCORECARD_CONFIG,
		SCORING_MULTIPLIERS,
		RIGHT_SCORECARD_ROWS,
		RIGHT_SCORECARD_BOXES_PER_ROW,
		PLAYER_COLORS,
		SCORECARD_COLORS,
	} from '$lib/game/constants';
	import { preferences, type ScorecardTextSize } from '$lib/stores/preferences.svelte';

	interface Props {
		scorecard: ScorecardType;
		playerColor?: PlayerColor;
		previewCombination?: DiceCombination | null;
		compact?: boolean;
	}

	let {
		scorecard,
		playerColor = 'BLUE',
		previewCombination = null,
		compact = false,
	}: Props = $props();

	const MAX_PENALTY_DISPLAY = 5;
	const MARKED_COLOR = '#1565C0';
	const PENALTY_MARK_COLOR = '#C62828';

	// Text size configs matching Android ScorecardView.kt
	const TEXT_SIZE_MAP: Record<ScorecardTextSize, {
		boxLabel: string; header: string; rowNumber: string;
		score: string; mark: string; summary: string; summaryLarge: string;
	}> = {
		small:       { boxLabel: '7px',  header: '9px',  rowNumber: '11px', score: '10px', mark: '11px', summary: '11px', summaryLarge: '12px' },
		medium:      { boxLabel: '8px',  header: '10px', rowNumber: '12px', score: '11px', mark: '12px', summary: '12px', summaryLarge: '13px' },
		large:       { boxLabel: '9px',  header: '11px', rowNumber: '13px', score: '12px', mark: '13px', summary: '13px', summaryLarge: '14px' },
		extra_large: { boxLabel: '10px', header: '12px', rowNumber: '14px', score: '13px', mark: '14px', summary: '14px', summaryLarge: '15px' },
	};

	let textSize = $derived(TEXT_SIZE_MAP[preferences.current.scorecardTextSize]);

	let scoreResult = $derived(calculateScore(scorecard));
	let colorScheme = $derived(PLAYER_COLORS[playerColor]);

	function getPreviewLeftAdded(rowNumber: number): number {
		if (!previewCombination) return 0;
		let added = 0;
		if (previewCombination.pair1Sum === rowNumber) added++;
		if (previewCombination.pair2Sum === rowNumber) added++;
		return added;
	}

	function getPreviewColor(rowNumber: number): string | null {
		if (!previewCombination) return null;
		if (previewCombination.pair1Sum === rowNumber) return SCORECARD_COLORS.previewPair1;
		if (previewCombination.pair2Sum === rowNumber) return SCORECARD_COLORS.previewPair2;
		return null;
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

	function isRightRowFull(dieValue: number): boolean {
		return (scorecard.rightMarks[dieValue] ?? 0) >= RIGHT_SCORECARD_BOXES_PER_ROW;
	}
</script>

<div class="scorecard" class:compact
	style:--sc-box-label={textSize.boxLabel}
	style:--sc-header={textSize.header}
	style:--sc-row-number={textSize.rowNumber}
	style:--sc-score={textSize.score}
	style:--sc-mark={textSize.mark}
	style:--sc-summary={textSize.summary}
	style:--sc-summary-lg={textSize.summaryLarge}
>
	<!-- LEFT SCORECARD -->
	<div class="scorecard-section">
		<!-- Header row -->
		<div class="scorecard-row header-row">
			<span class="row-label header-cell">#</span>
			<span class="header-penalty" style:width="{MAX_PENALTY_DISPLAY * (compact ? 22 : 27)}px">-10</span>
			<span class="scoring-line"></span>
			{#each SCORING_MULTIPLIERS as mult}
				<span class="header-mult">{mult}x</span>
			{/each}
			<span class="score-line"></span>
			<span class="header-score">+/-</span>
		</div>

		{#each LEFT_SCORECARD_CONFIG as config}
			{@const marks = scorecard.leftMarks[config.rowNumber] ?? 0}
			{@const score = calculateRowScore(config.rowNumber, marks)}
			{@const nearScoring = rowIsNearScoring(config.rowNumber)}
			{@const emptySlots = MAX_PENALTY_DISPLAY - config.penaltyBoxCount}
			<div class="scorecard-row" class:near-scoring={nearScoring}>
				<span class="row-label" class:near-scoring-label={nearScoring}>{config.rowNumber}</span>
				<!-- Empty spacer slots for alignment -->
				{#each { length: emptySlots } as _}
					<span class="box spacer-box"></span>
				{/each}
				<!-- Penalty boxes -->
				{#each { length: config.penaltyBoxCount } as _, boxIdx}
					{@const filled = isBoxFilled(config.rowNumber, boxIdx)}
					{@const preview = isPreviewBox(config.rowNumber, boxIdx)}
					{@const previewColor = getPreviewColor(config.rowNumber)}
					<span
						class="box penalty-box"
						class:filled
						class:preview
						style:background-color={preview && previewColor
							? previewColor + '26'
							: undefined}
					>
						{#if filled}
							<span class="mark" style:color={PENALTY_MARK_COLOR}>X</span>
						{:else if preview}
							<span class="mark preview-mark" style:color={previewColor}>X</span>
						{/if}
					</span>
				{/each}
				<!-- Scoring line divider -->
				<span class="scoring-line"></span>
				<!-- Scoring boxes -->
				{#each SCORING_MULTIPLIERS as mult, mi}
					{@const boxIdx = config.penaltyBoxCount + mi}
					{@const filled = isBoxFilled(config.rowNumber, boxIdx)}
					{@const preview = isPreviewBox(config.rowNumber, boxIdx)}
					{@const previewColor = getPreviewColor(config.rowNumber)}
					<span
						class="box scoring-box"
						class:filled
						class:preview
						style:background-color={preview && previewColor
							? previewColor + '26'
							: undefined}
						title="{config.baseValue} x {mult} = {config.baseValue * mult}"
					>
						{#if filled}
							<span class="mark" style:color={MARKED_COLOR}>X</span>
						{:else if preview}
							<span class="mark preview-mark" style:color={previewColor}>X</span>
						{:else}
							<span class="multiplier-hint">{config.baseValue * mult}</span>
						{/if}
					</span>
				{/each}
				<!-- Score divider -->
				<span class="score-line"></span>
				<span class="row-score" class:positive={score > 0} class:negative={score < 0}>
					{score !== 0 ? score : ''}
				</span>
			</div>
		{/each}
	</div>

	<!-- RIGHT SCORECARD -->
	<div class="scorecard-section right-section">
		<div class="section-header">
			<span class="row-label header-cell">Die</span>
			{#each { length: RIGHT_SCORECARD_BOXES_PER_ROW } as _, i}
				<span class="header-mult">{i + 1}</span>
			{/each}
		</div>

		{#each RIGHT_SCORECARD_ROWS as dieValue}
			{@const marks = scorecard.rightMarks[dieValue] ?? 0}
			{@const full = isRightRowFull(dieValue)}
			<div class="scorecard-row" class:filled-row={full}>
				<span class="row-label">{dieValue}</span>
				{#each { length: RIGHT_SCORECARD_BOXES_PER_ROW } as _, boxIdx}
					{@const filled = isRightBoxFilled(dieValue, boxIdx)}
					{@const preview = isRightPreviewBox(dieValue, boxIdx)}
					<span
						class="box"
						class:filled
						class:preview
						class:filled-row-box={full && !preview}
						style:background-color={preview
							? SCORECARD_COLORS.previewFifth + '26'
							: undefined}
					>
						{#if filled}
							<span class="mark" style:color={MARKED_COLOR}>X</span>
						{:else if preview}
							<span class="mark preview-mark" style:color={SCORECARD_COLORS.previewFifth}>X</span>
						{/if}
					</span>
				{/each}
			</div>
		{/each}
	</div>

	<!-- SCORE SUMMARY -->
	<div class="score-summary">
		<span class="score-line-text positive">+{scoreResult.positiveTotal}</span>
		<span class="score-line-text negative">{scoreResult.negativeTotal}</span>
		<span class="score-line-text total">= {scoreResult.totalScore}</span>
	</div>
</div>

<style>
	.scorecard {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 8px;
		background: var(--card-bg);
		border-radius: var(--radius-lg);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
		overflow: auto;
		font-size: 13px;
	}

	.scorecard.compact {
		font-size: 11px;
		gap: 6px;
		padding: 4px;
	}

	.scorecard-section {
		display: flex;
		flex-direction: column;
	}

	/* Row layout */
	.scorecard-row {
		display: flex;
		align-items: center;
		height: 27px;
	}

	.compact .scorecard-row {
		height: 22px;
	}

	/* Header row */
	.header-row {
		height: 22px;
		font-size: var(--sc-header);
		font-weight: 700;
		color: var(--sc-text);
	}

	.header-cell {
		background: var(--sc-header-bg);
	}

	.header-penalty {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		background: var(--sc-header-bg);
		border: 0.5px solid var(--sc-border);
		font-weight: 700;
		font-size: var(--sc-header);
		color: var(--sc-text);
		flex-shrink: 0;
	}

	.header-mult {
		width: 27px;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--sc-header-bg);
		border: 0.5px solid var(--sc-border);
		font-weight: 700;
		font-size: var(--sc-header);
		color: var(--sc-text);
		flex-shrink: 0;
	}

	.compact .header-mult {
		width: 22px;
	}

	.header-score {
		width: 42px;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--sc-header-bg);
		border: 0.5px solid var(--sc-border);
		font-weight: 700;
		font-size: var(--sc-header);
		color: var(--sc-text);
		flex-shrink: 0;
	}

	/* Row labels */
	.row-label {
		width: 28px;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		flex-shrink: 0;
		color: var(--sc-text);
		background: var(--sc-header-bg);
		border: 0.5px solid var(--sc-border);
		font-size: var(--sc-row-number);
	}

	.row-label.near-scoring-label {
		border: 1.5px solid #FFA726;
		color: #FFA726;
		background: rgba(255, 167, 38, 0.2);
	}

	/* Scoring and penalty dividers */
	.scoring-line {
		width: 2px;
		height: 100%;
		background: var(--sc-divider);
		flex-shrink: 0;
	}

	.score-line {
		width: 3px;
		height: 100%;
		background: var(--sc-divider);
		flex-shrink: 0;
	}

	/* Near-scoring row highlight */
	.scorecard-row.near-scoring {
		background: rgba(255, 167, 38, 0.1);
	}

	/* Boxes */
	.box {
		width: 27px;
		height: 100%;
		border: 0.5px solid var(--sc-border);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: background-color var(--transition-fast);
	}

	.compact .box {
		width: 22px;
	}

	.box.spacer-box {
		background: var(--sc-header-bg);
		border-color: var(--sc-border);
	}

	.box.penalty-box {
		background: var(--sc-penalty-bg);
	}

	.box.scoring-box {
		background: var(--sc-scoring-bg);
	}

	/* filled boxes keep their zone background, just show colored X text */

	.box.preview {
		border-style: dashed;
		border-width: 1.5px;
	}

	/* Right scorecard boxes */
	.right-section .box {
		background: var(--card-bg);
	}

	.filled-row .row-label {
		color: var(--sc-filled-text);
		text-decoration: line-through;
	}

	.filled-row-box {
		background: var(--sc-filled-bg) !important;
	}

	/* Marks */
	.mark {
		font-weight: 800;
		font-size: var(--sc-mark);
		line-height: 1;
	}

	.preview-mark {
		opacity: 0.7;
	}

	.multiplier-hint {
		font-size: var(--sc-box-label);
		color: var(--sc-hint-color);
		font-weight: 600;
	}

	/* Row score */
	.row-score {
		width: 42px;
		text-align: right;
		font-weight: 700;
		flex-shrink: 0;
		padding-right: 4px;
		font-size: var(--sc-score);
	}

	.row-score.positive { color: var(--score-positive); }
	.row-score.negative { color: var(--score-negative); }

	/* Right section header */
	.section-header {
		display: flex;
		align-items: center;
		height: 22px;
		font-size: var(--sc-header);
		font-weight: 700;
	}

	/* Score summary */
	.score-summary {
		display: flex;
		gap: 16px;
		justify-content: flex-end;
		padding: 4px 8px;
		font-weight: 700;
		font-size: var(--sc-summary);
	}

	.score-line-text.positive { color: var(--score-positive); }
	.score-line-text.negative { color: var(--score-negative); }
	.score-line-text.total {
		color: var(--sc-text);
		font-size: var(--sc-summary-lg);
		font-weight: 800;
	}
</style>
