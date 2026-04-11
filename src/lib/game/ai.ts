// AI strategy — ported from AiStrategy.kt

import type { DiceCombination, Scorecard, AiDifficulty } from './models';
import {
	RIGHT_SCORECARD_BOXES_PER_ROW,
	RIGHT_SCORECARD_ROWS,
} from './constants';
import * as GameLogic from './logic';

interface StrategyWeights {
	crossingLineMultiplier: number;
	approachingBase: number;
	protectInvestmentMultiplier: number;
	newRowPenalty: number;
	rowValuePreference: number;
	rightFillPenalty: number;
	rightNearFillPenalty: number;
	rightTightPenalty: number;
}

const DEFAULT_WEIGHTS: StrategyWeights = {
	crossingLineMultiplier: 1.5,
	approachingBase: 3.0,
	protectInvestmentMultiplier: 0.8,
	newRowPenalty: -6.0,
	rowValuePreference: 0.2,
	rightFillPenalty: -4.0,
	rightNearFillPenalty: -2.0,
	rightTightPenalty: -5.0,
};

// Expert AI genetically-trained weights
const EXPERT_EARLY: StrategyWeights = {
	crossingLineMultiplier: 1.5865782914406128,
	approachingBase: -1.5173841065830973,
	protectInvestmentMultiplier: 13.229047723435514,
	newRowPenalty: -15.99631807208393,
	rowValuePreference: 7.315818538249263,
	rightFillPenalty: -49.645273154148114,
	rightNearFillPenalty: -32.10760123227902,
	rightTightPenalty: -4.562179092788311,
};

const EXPERT_MID: StrategyWeights = {
	crossingLineMultiplier: -0.6106557924327087,
	approachingBase: -2.6221418704848816,
	protectInvestmentMultiplier: 2.4789266162904857,
	newRowPenalty: -24.844971530468538,
	rowValuePreference: 2.046543763286164,
	rightFillPenalty: -42.73798348012727,
	rightNearFillPenalty: -15.827217622633748,
	rightTightPenalty: -9.142471060013037,
};

const EXPERT_LATE: StrategyWeights = {
	crossingLineMultiplier: 1.1093875549527086,
	approachingBase: -1.2130021299793947,
	protectInvestmentMultiplier: -1.2901427880444742,
	newRowPenalty: -33.24259371965941,
	rowValuePreference: 2.692221060272883,
	rightFillPenalty: -44.01878670019907,
	rightNearFillPenalty: -20.65019986872991,
	rightTightPenalty: 15.604129166167663,
};

function pickRandom<T>(arr: T[]): T {
	const index = Math.floor(Math.random() * arr.length);
	return arr[Math.min(index, arr.length - 1)];
}

function pickNearOptimal(scored: [DiceCombination, number][], threshold: number = 2.0): DiceCombination {
	const best = Math.max(...scored.map(s => s[1]));
	const nearBest = scored.filter(s => s[1] >= best - threshold);
	return pickRandom(nearBest)[0];
}

function evaluateCombination(
	combo: DiceCombination,
	scorecard: Scorecard,
	weights: StrategyWeights,
	currentScore: number
): number {
	const newScorecard = GameLogic.applySelection(scorecard, combo);
	const newScore = GameLogic.calculateScore(newScorecard).totalScore;
	const immediateGain = newScore - currentScore;

	let strategic = 0;

	const affectedRows = combo.pair1Sum === combo.pair2Sum
		? [combo.pair1Sum]
		: [combo.pair1Sum, combo.pair2Sum];

	for (const row of affectedRows) {
		const config = GameLogic.getLeftRowConfig(row);
		const oldMarks = scorecard.leftMarks[row] ?? 0;
		const newMarks = newScorecard.leftMarks[row] ?? 0;
		const distToScoring = config.penaltyBoxCount - newMarks;

		if (oldMarks <= config.penaltyBoxCount && newMarks > config.penaltyBoxCount) {
			strategic += config.baseValue * weights.crossingLineMultiplier;
		}

		if (distToScoring >= 1 && distToScoring <= 2) {
			strategic += config.baseValue * (weights.approachingBase - distToScoring);
		}

		if (oldMarks > 0 && oldMarks <= config.penaltyBoxCount) {
			strategic += config.baseValue * weights.protectInvestmentMultiplier;
		}

		if (oldMarks === 0) {
			strategic += weights.newRowPenalty;
		}

		strategic += config.baseValue * weights.rowValuePreference;
	}

	const fifthDieMarks = newScorecard.rightMarks[combo.fifthDie] ?? 0;
	if (fifthDieMarks >= RIGHT_SCORECARD_BOXES_PER_ROW) {
		strategic += weights.rightFillPenalty;
	} else if (fifthDieMarks === RIGHT_SCORECARD_BOXES_PER_ROW - 1) {
		strategic += weights.rightNearFillPenalty;
	}

	const rightRowsWithRoom = RIGHT_SCORECARD_ROWS.filter(dieValue =>
		(newScorecard.rightMarks[dieValue] ?? 0) < RIGHT_SCORECARD_BOXES_PER_ROW
	).length;
	if (rightRowsWithRoom <= 2) {
		strategic += weights.rightTightPenalty;
	}

	return immediateGain + strategic;
}

function getExpertWeights(scorecard: Scorecard): StrategyWeights {
	const totalRight = RIGHT_SCORECARD_ROWS.reduce(
		(sum, d) => sum + (scorecard.rightMarks[d] ?? 0), 0
	);
	const maxRight = RIGHT_SCORECARD_ROWS.length * RIGHT_SCORECARD_BOXES_PER_ROW;
	const progress = totalRight / maxRight;

	if (progress < 0.33) return EXPERT_EARLY;
	if (progress < 0.67) return EXPERT_MID;
	return EXPERT_LATE;
}

export function selectCombination(
	difficulty: AiDifficulty,
	validCombinations: DiceCombination[],
	scorecard: Scorecard
): DiceCombination {
	if (validCombinations.length === 0) {
		throw new Error('No valid combinations for AI to select from');
	}

	switch (difficulty) {
		case 'EASY':
			return pickRandom(validCombinations);

		case 'MEDIUM': {
			const currentScore = GameLogic.calculateScore(scorecard).totalScore;
			const scored: [DiceCombination, number][] = validCombinations.map(combo => {
				const newScorecard = GameLogic.applySelection(scorecard, combo);
				const gain = GameLogic.calculateScore(newScorecard).totalScore - currentScore;
				return [combo, gain];
			});
			return pickNearOptimal(scored);
		}

		case 'HARD': {
			const currentScore = GameLogic.calculateScore(scorecard).totalScore;
			const scored: [DiceCombination, number][] = validCombinations.map(combo =>
				[combo, evaluateCombination(combo, scorecard, DEFAULT_WEIGHTS, currentScore)]
			);
			return pickNearOptimal(scored);
		}

		case 'EXPERT': {
			const weights = getExpertWeights(scorecard);
			const currentScore = GameLogic.calculateScore(scorecard).totalScore;
			const scored: [DiceCombination, number][] = validCombinations.map(combo =>
				[combo, evaluateCombination(combo, scorecard, weights, currentScore)]
			);
			return pickNearOptimal(scored);
		}
	}
}
