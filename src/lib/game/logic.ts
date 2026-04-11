// Game logic — ported from GameLogic.kt (pure functions)

import type { Scorecard, DiceCombination, ScoreResult, ScorecardRowConfig } from './models';
import { createDiceCombination } from './models';
import {
	SCORING_MULTIPLIERS,
	LEFT_SCORECARD_CONFIG,
	LEFT_SCORECARD_CONFIG_MAP,
	RIGHT_SCORECARD_BOXES_PER_ROW,
	RIGHT_SCORECARD_ROWS,
} from './constants';

export function rollDice(): number[] {
	const array = new Uint32Array(5);
	crypto.getRandomValues(array);
	return Array.from(array, v => (v % 6) + 1);
}

export function generateCombinations(dice: number[]): DiceCombination[] {
	if (dice.length !== 5) throw new Error('Must have exactly 5 dice');
	if (!dice.every(d => d >= 1 && d <= 6)) throw new Error('All dice values must be 1-6');

	const seen = new Set<string>();
	const results: DiceCombination[] = [];

	for (let fifthIdx = 0; fifthIdx < 5; fifthIdx++) {
		const remaining = dice.filter((_, i) => i !== fifthIdx);
		const fifthDie = dice[fifthIdx];

		// 3 unique ways to pair 4 dice: (0,1)+(2,3), (0,2)+(1,3), (0,3)+(1,2)
		const pairings: [number[], number[]][] = [
			[[0, 1], [2, 3]],
			[[0, 2], [1, 3]],
			[[0, 3], [1, 2]],
		];

		for (const [p1Indices, p2Indices] of pairings) {
			const p1: [number, number] = [remaining[p1Indices[0]], remaining[p1Indices[1]]];
			const p2: [number, number] = [remaining[p2Indices[0]], remaining[p2Indices[1]]];
			const sum1 = p1[0] + p1[1];
			const sum2 = p2[0] + p2[1];

			// Normalize: larger sum first to deduplicate
			const key = sum1 >= sum2
				? `${sum1}-${sum2}-${fifthDie}`
				: `${sum2}-${sum1}-${fifthDie}`;

			if (!seen.has(key)) {
				seen.add(key);
				const combo = sum1 >= sum2
					? createDiceCombination(p1, p2, fifthDie)
					: createDiceCombination(p2, p1, fifthDie);
				results.push(combo);
			}
		}
	}

	// Sort: descending pair1Sum, then descending pair2Sum, then ascending fifthDie
	results.sort((a, b) => {
		if (b.pair1Sum !== a.pair1Sum) return b.pair1Sum - a.pair1Sum;
		if (b.pair2Sum !== a.pair2Sum) return b.pair2Sum - a.pair2Sum;
		return a.fifthDie - b.fifthDie;
	});

	return results;
}

export function getLeftRowConfig(rowNumber: number): ScorecardRowConfig {
	const config = LEFT_SCORECARD_CONFIG_MAP[rowNumber];
	if (!config) throw new Error(`Row number must be 2-12, got ${rowNumber}`);
	return config;
}

export function isLeftRowFull(scorecard: Scorecard, rowNumber: number): boolean {
	const config = getLeftRowConfig(rowNumber);
	const marks = scorecard.leftMarks[rowNumber] ?? 0;
	return marks >= config.totalBoxes;
}

export function isRightRowFull(scorecard: Scorecard, dieValue: number): boolean {
	const marks = scorecard.rightMarks[dieValue] ?? 0;
	return marks >= RIGHT_SCORECARD_BOXES_PER_ROW;
}

export function getInvalidReason(combination: DiceCombination, scorecard: Scorecard): string | null {
	const sum1 = combination.pair1Sum;
	const sum2 = combination.pair2Sum;

	if (sum1 === sum2) {
		const config = getLeftRowConfig(sum1);
		const marks = scorecard.leftMarks[sum1] ?? 0;
		if (marks + 2 > config.totalBoxes) return `Row ${sum1} needs 2 spaces`;
	} else {
		if (isLeftRowFull(scorecard, sum1)) return `Row ${sum1} full`;
		if (isLeftRowFull(scorecard, sum2)) return `Row ${sum2} full`;
	}

	if (isRightRowFull(scorecard, combination.fifthDie)) return '5th die row full';

	return null;
}

export function isCombinationValid(combination: DiceCombination, scorecard: Scorecard): boolean {
	const sum1 = combination.pair1Sum;
	const sum2 = combination.pair2Sum;

	if (sum1 === sum2) {
		const config = getLeftRowConfig(sum1);
		const marks = scorecard.leftMarks[sum1] ?? 0;
		if (marks + 2 > config.totalBoxes) return false;
	} else {
		if (isLeftRowFull(scorecard, sum1)) return false;
		if (isLeftRowFull(scorecard, sum2)) return false;
	}

	if (isRightRowFull(scorecard, combination.fifthDie)) return false;

	return true;
}

export function getValidCombinations(
	combinations: DiceCombination[],
	scorecard: Scorecard
): DiceCombination[] {
	return combinations.filter(c => isCombinationValid(c, scorecard));
}

export function applySelection(scorecard: Scorecard, combination: DiceCombination): Scorecard {
	const newLeftMarks = { ...scorecard.leftMarks };
	const newRightMarks = { ...scorecard.rightMarks };

	newLeftMarks[combination.pair1Sum] = (newLeftMarks[combination.pair1Sum] ?? 0) + 1;
	newLeftMarks[combination.pair2Sum] = (newLeftMarks[combination.pair2Sum] ?? 0) + 1;
	newRightMarks[combination.fifthDie] = (newRightMarks[combination.fifthDie] ?? 0) + 1;

	return { leftMarks: newLeftMarks, rightMarks: newRightMarks };
}

export function calculateRowScore(rowNumber: number, markCount: number): number {
	if (markCount === 0) return 0;

	const config = getLeftRowConfig(rowNumber);
	const scoringPosition = markCount - config.penaltyBoxCount;

	if (scoringPosition <= 0) {
		return -10;
	}

	const multiplierIndex = Math.min(scoringPosition - 1, SCORING_MULTIPLIERS.length - 1);
	return config.baseValue * SCORING_MULTIPLIERS[multiplierIndex];
}

export function calculateScore(scorecard: Scorecard): ScoreResult {
	const rowScores: Record<number, number> = {};
	let positiveTotal = 0;
	let negativeTotal = 0;

	for (const config of LEFT_SCORECARD_CONFIG) {
		const marks = scorecard.leftMarks[config.rowNumber] ?? 0;
		const score = calculateRowScore(config.rowNumber, marks);
		if (score !== 0) {
			rowScores[config.rowNumber] = score;
			if (score > 0) positiveTotal += score;
			else negativeTotal += score;
		}
	}

	return {
		rowScores,
		positiveTotal,
		negativeTotal,
		totalScore: positiveTotal + negativeTotal
	};
}

export function isRightSideFull(scorecard: Scorecard): boolean {
	return RIGHT_SCORECARD_ROWS.every(dieValue => isRightRowFull(scorecard, dieValue));
}
