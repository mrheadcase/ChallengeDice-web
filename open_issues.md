# Open Issues — Challenge Dice Web

Issues that may need attention. Review with user before resolving.

## Firebase Configuration

1. ~~**Web App ID placeholder**~~ — DONE: Web app registered in Firebase, `appId` and `apiKey` updated in `config.ts`.

2. ~~**Database URL**~~ — DONE: Verified correct (`https://challengedice-default-rtdb.firebaseio.com`).

3. ~~**App Check**~~ — DONE: Firebase App Check enabled with reCAPTCHA v3. Debug token support for local dev. Enforcement enabled on Realtime Database in Firebase Console.

4. ~~**API key restrictions**~~ — Investigated; HTTP referrer restrictions conflict with App Check token exchange. Removed. App Check + database rules provide sufficient protection.

## Online Multiplayer

3. **Lobby code display** — The lobby page (`online/lobby/[gameId]`) creates a second Firebase listener just to read the game code. This should be refactored to expose the code through the `onlineGame` store instead of making a separate `observeGame` call.

4. ~~**Rematch countdown timer**~~ — FIXED: Online gameover page now shows "Starting in {N}s" while `rematch.countdownStartedAt` is non-null, mirroring Android's `RematchBanner` (30s auto-start, ticking every 500ms).

5. **Lobby ready state** — The lobby page doesn't fully implement per-player ready toggling. The Android version tracks `ready` per player and the host sees which players are ready.

6. **Host transfer in lobby** — When host leaves and another player becomes host, the lobby UI may not update the "Start Game" button visibility without a page refresh.

**Fixed in this session:**
- Host "Start Game" button visibility was broken because `hostUid`/`turnOrder` in the online store were plain class fields, so Svelte 5 didn't track changes. Made them `$state`.
- `isHost` used to return `true` spuriously when both `localUid` and `hostUid` were empty strings, causing a brief flash. Added empty-string guard.
- `localUid` could stay empty if the lobby mounted before Firebase auth had hydrated. Added `onAuthStateChanged` listener to sync it.
- Join via code or open-game browse was silently aborting because the v9 modular `runTransaction` doesn't auto-retry when the handler returns `undefined` on a null cache. Added a cache-warming `get()` before the transaction and changed the null-handler branch to return the current (null) value instead of undefined, which correctly triggers a retry with server data.

## UI/UX

7. **Scorecard pinch-to-zoom** — Not yet implemented. The scorecard scrolls but doesn't support pinch-to-zoom gestures for mobile users. Planned for Phase 2 but deferred.

8. **Simultaneous elimination dialog** — When multiple players are eliminated in the same round (during `rollDice`), only the last eliminated player's name is shown in the dialog. The Android version also has this limitation but a queue approach would be better.

9. ~~**Landscape layout**~~ — FIXED: Added `(orientation: landscape) and (max-height: 500px)` media queries for the main menu (logo left, buttons/nav right via CSS grid), new-game setup (2-column player grid, compact cards), and game pages (side-by-side dice/scorecard, compressed top bar and player tabs, Score It button moved inside the dice column so it no longer steals horizontal space).

10. ~~**Sound effects**~~ — DONE: `sounds.ts` now uses the Android app's actual mp3 files (`rolling_dice.mp3`, `shaking_dice.mp3`) copied to `static/sounds/`. Plays rolling (900ms loop) on roll and shaking (400ms one-shot) on valid combo tap, matching Android's `SoundManager.kt`. No sound on Score It, invalid tap, or game over (also matches Android).

17. ~~**Dark mode styling — hardcoded white backgrounds**~~ — FIXED: Replaced all hardcoded `white` / `#FFFFFF` backgrounds across components and pages with theme-aware CSS variables (`--card-bg`, `--input-bg`, etc.). Affected files: Scorecard, PlayerTabs, EliminationDialog, online lobby/setup/gameover, local setup/gameover, stats page.

18. ~~**Scorecard dark mode colors**~~ — FIXED: Added dedicated scorecard CSS variables (`--sc-header-bg`, `--sc-border`, `--sc-penalty-bg`, `--sc-scoring-bg`, `--sc-filled-bg`, etc.) with dark mode variants in `app.css`. Spacer boxes now use `--sc-header-bg` to match Android's unavailable square shading.

19. ~~**Main menu layout**~~ — FIXED: Replaced tertiary buttons with 2x2 grid of text-style nav links (Settings, Stats, Rules, About) matching Android layout. Removed title text.

20. ~~**Player setup improvements**~~ — FIXED: All colors always visible (taken ones dimmed), circular swatches, responsive 2x2 grid on desktop, unique random AI names, difficulty selector inline with AI checkbox.

21. ~~**Open Games always visible**~~ — FIXED: Open Games section on online setup page now always shows with empty state and refresh button, matching Android's "Find Open Game" pattern.

22. ~~**Dark mode button readability**~~ — FIXED: All `background: var(--gold-amber); color: white` buttons replaced with `var(--btn-primary-bg)` / `var(--btn-primary-text)` which stays readable in both modes. Affected: online setup, lobby, game, gameover, local setup, gameover pages.

23. ~~**Game top bar dark mode**~~ — FIXED: Top bar background and text hardcoded to always-dark scheme (`#1A0D04` bg, `#F0E8D8` text) so it works in both light and dark mode. Fixed on both local and online game pages.

24. ~~**Active player tab dark mode**~~ — FIXED: Active player tab uses `color-mix` to blend player color with dark card background in dark mode instead of full pastel highlight.

25. ~~**Game page mobile layout**~~ — FIXED: Combo selections and scorecard scroll independently on mobile. Removed "choose a combination" text. Reduced Score It button size. Combo cards are now content-responsive with flexible wrapping (like Android). PinchZoomContainer allows scrolling.

26. ~~**Dice combo highlighting and regrouping**~~ — FIXED: When a combo is selected, dice now color-code by pair (blue = pair 1, green = pair 2, orange = 5th die) matching Android. Dice animate to regroup: [pair1, pair1] gap [pair2, pair2] gap [5th], centered. Legend shows below dice.

27. ~~**Dice roll entrance animation**~~ — FIXED: Dice slide in from the left one by one with staggered timing, shake with random values, then settle to final values.

28. ~~**Invalid combo reason on cards**~~ — FIXED: Removed inline reason text from combo cards. Tapping an unavailable combo now shows a brief overlay toast message that disappears after 2 seconds.

## Data Parity

11. **AI randomness** — The AI `pickRandom` and `pickNearOptimal` functions use `Math.random()` rather than crypto-secure randomness. This is fine for gameplay but differs from the Android implementation which uses `kotlin.collections.random()` (also not crypto-secure). Not a parity issue.

12. ~~**Stats page back button**~~ — FIXED: renamed variable to avoid shadowing.

13. ~~**Sound/haptic preference checks**~~ — FIXED: `sounds.ts` functions now check `preferences.soundEnabled` / `preferences.hapticEnabled` internally, so callers don't need to.

14. ~~**Host badge hardcoded to index 0**~~ — FIXED: Lobby now uses `onlineGame.isPlayerHost(i)` which compares against the actual host UID from Firebase, so badge remains correct after host transfer.

15. ~~**Settings page missing**~~ — FIXED: Settings page has theme, auto-roll, sound, haptic, combo size, combo sort, scorecard text size. Dice animation toggle intentionally omitted (animation is always on). Layout mode and dice roll direction not ported (Android-specific).

16. ~~**`gameType.replace('_', ' ')` only replaces first underscore**~~ — FIXED: Changed to `.replaceAll('_', ' ')` on stats page.
