import { describe, it, expect } from 'vitest';
import {
	rollDice,
	generateCombinations,
	getLeftRowConfig,
	isLeftRowFull,
	isRightRowFull,
	isCombinationValid,
	getValidCombinations,
	getInvalidReason,
	applySelection,
	calculateRowScore,
	calculateScore,
	isRightSideFull,
} from './logic';
import type { Scorecard, DiceCombination } from './models';
import { createDiceCombination, createEmptyScorecard } from './models';
import { LEFT_SCORECARD_CONFIG, SCORING_MULTIPLIERS } from './constants';

describe('rollDice', () => {
	it('returns 5 dice', () => {
		const dice = rollDice();
		expect(dice).toHaveLength(5);
	});

	it('all values are 1-6', () => {
		for (let i = 0; i < 100; i++) {
			const dice = rollDice();
			for (const d of dice) {
				expect(d).toBeGreaterThanOrEqual(1);
				expect(d).toBeLessThanOrEqual(6);
			}
		}
	});
});

describe('generateCombinations', () => {
	it('throws on wrong number of dice', () => {
		expect(() => generateCombinations([1, 2, 3])).toThrow();
		expect(() => generateCombinations([1, 2, 3, 4, 5, 6])).toThrow();
	});

	it('throws on invalid dice values', () => {
		expect(() => generateCombinations([0, 1, 2, 3, 4])).toThrow();
		expect(() => generateCombinations([1, 2, 3, 4, 7])).toThrow();
	});

	it('generates combinations for [1,2,3,4,5]', () => {
		const combos = generateCombinations([1, 2, 3, 4, 5]);
		expect(combos.length).toBeGreaterThan(0);
		// Every combo should have pair1Sum >= pair2Sum (normalized)
		for (const c of combos) {
			expect(c.pair1Sum).toBeGreaterThanOrEqual(c.pair2Sum);
		}
	});

	it('generates no duplicates', () => {
		const combos = generateCombinations([1, 2, 3, 4, 5]);
		const keys = combos.map(c => `${c.pair1Sum}-${c.pair2Sum}-${c.fifthDie}`);
		const unique = new Set(keys);
		expect(unique.size).toBe(keys.length);
	});

	it('sorts descending by pair1Sum, pair2Sum, ascending fifthDie', () => {
		const combos = generateCombinations([1, 2, 3, 4, 5]);
		for (let i = 1; i < combos.length; i++) {
			const prev = combos[i - 1];
			const curr = combos[i];
			if (prev.pair1Sum === curr.pair1Sum) {
				if (prev.pair2Sum === curr.pair2Sum) {
					expect(prev.fifthDie).toBeLessThanOrEqual(curr.fifthDie);
				} else {
					expect(prev.pair2Sum).toBeGreaterThanOrEqual(curr.pair2Sum);
				}
			} else {
				expect(prev.pair1Sum).toBeGreaterThan(curr.pair1Sum);
			}
		}
	});

	it('handles all same dice [3,3,3,3,3]', () => {
		const combos = generateCombinations([3, 3, 3, 3, 3]);
		expect(combos.length).toBe(1);
		expect(combos[0].pair1Sum).toBe(6);
		expect(combos[0].pair2Sum).toBe(6);
		expect(combos[0].fifthDie).toBe(3);
	});

	it('handles [1,1,1,1,1]', () => {
		const combos = generateCombinations([1, 1, 1, 1, 1]);
		expect(combos.length).toBe(1);
		expect(combos[0].pair1Sum).toBe(2);
		expect(combos[0].pair2Sum).toBe(2);
		expect(combos[0].fifthDie).toBe(1);
	});

	it('handles [6,6,6,6,6]', () => {
		const combos = generateCombinations([6, 6, 6, 6, 6]);
		expect(combos.length).toBe(1);
		expect(combos[0].pair1Sum).toBe(12);
		expect(combos[0].pair2Sum).toBe(12);
		expect(combos[0].fifthDie).toBe(6);
	});
});

describe('getLeftRowConfig', () => {
	it('returns config for valid rows 2-12', () => {
		for (let r = 2; r <= 12; r++) {
			const config = getLeftRowConfig(r);
			expect(config.rowNumber).toBe(r);
			expect(config.totalBoxes).toBe(config.penaltyBoxCount + SCORING_MULTIPLIERS.length);
		}
	});

	it('throws for invalid rows', () => {
		expect(() => getLeftRowConfig(0)).toThrow();
		expect(() => getLeftRowConfig(1)).toThrow();
		expect(() => getLeftRowConfig(13)).toThrow();
	});
});

describe('isLeftRowFull / isRightRowFull', () => {
	it('empty scorecard is never full', () => {
		const sc = createEmptyScorecard();
		for (let r = 2; r <= 12; r++) expect(isLeftRowFull(sc, r)).toBe(false);
		for (let d = 1; d <= 6; d++) expect(isRightRowFull(sc, d)).toBe(false);
	});

	it('left row full at totalBoxes', () => {
		for (const config of LEFT_SCORECARD_CONFIG) {
			const sc: Scorecard = {
				leftMarks: { [config.rowNumber]: config.totalBoxes },
				rightMarks: {}
			};
			expect(isLeftRowFull(sc, config.rowNumber)).toBe(true);
		}
	});

	it('right row full at 4 marks', () => {
		const sc: Scorecard = { leftMarks: {}, rightMarks: { 3: 4 } };
		expect(isRightRowFull(sc, 3)).toBe(true);
		expect(isRightRowFull(sc, 1)).toBe(false);
	});
});

describe('isCombinationValid', () => {
	it('valid on empty scorecard', () => {
		const sc = createEmptyScorecard();
		const combo = createDiceCombination([1, 2], [3, 4], 5);
		expect(isCombinationValid(combo, sc)).toBe(true);
	});

	it('invalid when left row full', () => {
		const config = getLeftRowConfig(3); // row 3, totalBoxes=9
		const sc: Scorecard = {
			leftMarks: { 3: config.totalBoxes },
			rightMarks: {}
		};
		// combo with pair1Sum=3
		const combo = createDiceCombination([1, 2], [3, 4], 5);
		expect(isCombinationValid(combo, sc)).toBe(false);
	});

	it('invalid when right row full', () => {
		const sc: Scorecard = { leftMarks: {}, rightMarks: { 5: 4 } };
		const combo = createDiceCombination([1, 2], [3, 4], 5);
		expect(isCombinationValid(combo, sc)).toBe(false);
	});

	it('same pair sums need 2 spaces', () => {
		const config = getLeftRowConfig(6); // row 6, totalBoxes=11
		// One space left
		const sc: Scorecard = {
			leftMarks: { 6: config.totalBoxes - 1 },
			rightMarks: {}
		};
		const combo = createDiceCombination([3, 3], [2, 4], 1); // both sums = 6
		expect(isCombinationValid(combo, sc)).toBe(false);

		// Two spaces left
		const sc2: Scorecard = {
			leftMarks: { 6: config.totalBoxes - 2 },
			rightMarks: {}
		};
		expect(isCombinationValid(combo, sc2)).toBe(true);
	});
});

describe('getInvalidReason', () => {
	it('returns null for valid combo', () => {
		const sc = createEmptyScorecard();
		const combo = createDiceCombination([1, 2], [3, 4], 5);
		expect(getInvalidReason(combo, sc)).toBeNull();
	});

	it('returns reason for full row', () => {
		const config = getLeftRowConfig(3);
		const sc: Scorecard = { leftMarks: { 3: config.totalBoxes }, rightMarks: {} };
		const combo = createDiceCombination([1, 2], [3, 4], 5);
		expect(getInvalidReason(combo, sc)).toBe('Row 3 full');
	});

	it('returns reason for full right row', () => {
		const sc: Scorecard = { leftMarks: {}, rightMarks: { 5: 4 } };
		const combo = createDiceCombination([1, 2], [3, 4], 5);
		expect(getInvalidReason(combo, sc)).toBe('5th die row full');
	});
});

describe('applySelection', () => {
	it('increments marks correctly', () => {
		const sc = createEmptyScorecard();
		const combo = createDiceCombination([1, 4], [2, 3], 6);
		// pair1Sum=5, pair2Sum=5, fifthDie=6
		const result = applySelection(sc, combo);
		expect(result.leftMarks[5]).toBe(2); // both pairs sum to 5
		expect(result.rightMarks[6]).toBe(1);
	});

	it('increments different rows', () => {
		const sc = createEmptyScorecard();
		const combo = createDiceCombination([1, 2], [4, 5], 3);
		// pair1Sum=3, pair2Sum=9, fifthDie=3
		const result = applySelection(sc, combo);
		expect(result.leftMarks[3]).toBe(1);
		expect(result.leftMarks[9]).toBe(1);
		expect(result.rightMarks[3]).toBe(1);
	});

	it('accumulates on existing marks', () => {
		const sc: Scorecard = { leftMarks: { 7: 3 }, rightMarks: { 2: 1 } };
		const combo = createDiceCombination([3, 4], [1, 5], 2);
		// pair1Sum=7, pair2Sum=6, fifthDie=2
		const result = applySelection(sc, combo);
		expect(result.leftMarks[7]).toBe(4);
		expect(result.leftMarks[6]).toBe(1);
		expect(result.rightMarks[2]).toBe(2);
	});
});

describe('calculateRowScore', () => {
	it('returns 0 for 0 marks', () => {
		for (let r = 2; r <= 12; r++) {
			expect(calculateRowScore(r, 0)).toBe(0);
		}
	});

	it('returns -10 for marks in penalty zone', () => {
		for (const config of LEFT_SCORECARD_CONFIG) {
			for (let m = 1; m <= config.penaltyBoxCount; m++) {
				expect(calculateRowScore(config.rowNumber, m)).toBe(-10);
			}
		}
	});

	it('returns base * multiplier for scoring zone', () => {
		for (const config of LEFT_SCORECARD_CONFIG) {
			for (let i = 0; i < SCORING_MULTIPLIERS.length; i++) {
				const marks = config.penaltyBoxCount + 1 + i;
				if (marks <= config.totalBoxes) {
					expect(calculateRowScore(config.rowNumber, marks))
						.toBe(config.baseValue * SCORING_MULTIPLIERS[i]);
				}
			}
		}
	});

	// Specific known values for row 7 (penalty=5, base=3)
	it('row 7 specific values', () => {
		expect(calculateRowScore(7, 0)).toBe(0);
		expect(calculateRowScore(7, 1)).toBe(-10);
		expect(calculateRowScore(7, 3)).toBe(-10);
		expect(calculateRowScore(7, 5)).toBe(-10);
		expect(calculateRowScore(7, 6)).toBe(3);   // 3 * 1
		expect(calculateRowScore(7, 7)).toBe(6);   // 3 * 2
		expect(calculateRowScore(7, 8)).toBe(9);   // 3 * 3
		expect(calculateRowScore(7, 9)).toBe(12);  // 3 * 4
		expect(calculateRowScore(7, 10)).toBe(21); // 3 * 7
		expect(calculateRowScore(7, 11)).toBe(30); // 3 * 10
	});

	// Row 2 (penalty=3, base=10)
	it('row 2 specific values', () => {
		expect(calculateRowScore(2, 0)).toBe(0);
		expect(calculateRowScore(2, 1)).toBe(-10);
		expect(calculateRowScore(2, 3)).toBe(-10);
		expect(calculateRowScore(2, 4)).toBe(10);  // 10 * 1
		expect(calculateRowScore(2, 5)).toBe(20);  // 10 * 2
		expect(calculateRowScore(2, 9)).toBe(100); // 10 * 10
	});

	// Row 12 (penalty=3, base=10) — symmetric with row 2
	it('row 12 matches row 2 values', () => {
		for (let m = 0; m <= 9; m++) {
			expect(calculateRowScore(12, m)).toBe(calculateRowScore(2, m));
		}
	});
});

describe('calculateScore', () => {
	it('empty scorecard = 0', () => {
		const result = calculateScore(createEmptyScorecard());
		expect(result.totalScore).toBe(0);
		expect(result.positiveTotal).toBe(0);
		expect(result.negativeTotal).toBe(0);
	});

	it('all penalty = all -10s', () => {
		const leftMarks: Record<number, number> = {};
		for (let r = 2; r <= 12; r++) leftMarks[r] = 1; // 1 mark each = penalty zone
		const sc: Scorecard = { leftMarks, rightMarks: {} };
		const result = calculateScore(sc);
		expect(result.negativeTotal).toBe(-110); // 11 rows * -10
		expect(result.positiveTotal).toBe(0);
		expect(result.totalScore).toBe(-110);
	});

	it('mixed scoring', () => {
		const sc: Scorecard = {
			leftMarks: {
				7: 6,  // penalty=5, base=3, scoringPos=1 -> 3*1 = 3
				2: 1,  // penalty zone -> -10
			},
			rightMarks: {}
		};
		const result = calculateScore(sc);
		expect(result.rowScores[7]).toBe(3);
		expect(result.rowScores[2]).toBe(-10);
		expect(result.positiveTotal).toBe(3);
		expect(result.negativeTotal).toBe(-10);
		expect(result.totalScore).toBe(-7);
	});
});

describe('isRightSideFull', () => {
	it('empty is not full', () => {
		expect(isRightSideFull(createEmptyScorecard())).toBe(false);
	});

	it('all rows at 4 is full', () => {
		const sc: Scorecard = {
			leftMarks: {},
			rightMarks: { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 4 }
		};
		expect(isRightSideFull(sc)).toBe(true);
	});

	it('one row at 3 is not full', () => {
		const sc: Scorecard = {
			leftMarks: {},
			rightMarks: { 1: 4, 2: 4, 3: 3, 4: 4, 5: 4, 6: 4 }
		};
		expect(isRightSideFull(sc)).toBe(false);
	});
});

describe('getValidCombinations', () => {
	it('filters correctly', () => {
		const combos = generateCombinations([1, 2, 3, 4, 5]);
		const sc = createEmptyScorecard();
		const valid = getValidCombinations(combos, sc);
		// On empty scorecard, all combos should be valid
		expect(valid.length).toBe(combos.length);
	});
});
