import { MediaQuery } from 'svelte/reactivity';

// Breakpoints shared with GameLayout.svelte's media queries
const wideLayout = new MediaQuery('(min-width: 1024px) and (min-height: 501px)');
const shortPhone = new MediaQuery('(max-width: 767px) and (orientation: portrait) and (max-height: 740px)');
const landscapePhone = new MediaQuery('(orientation: landscape) and (max-height: 500px)');

/**
 * Die size for the game board: larger in the desktop two-column layout, smaller on
 * short portrait phones where every pixel goes to the scorecard, and on landscape phones
 * where the turn column is narrow. Grouped dice span 5 × size + 56px (DiceDisplay), which
 * has to fit the turn panel. Reactive when read inside $derived or markup.
 */
export function boardDiceSize(): number {
	if (wideLayout.current) return 68;
	if (landscapePhone.current) return 44;
	if (shortPhone.current) return 48;
	return 56;
}
