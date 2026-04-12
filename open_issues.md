# Open Issues — Challenge Dice Web

Issues that may need attention. Review with user before resolving.

## Firebase Configuration

1. ~~**Web App ID placeholder**~~ — DONE: Web app registered in Firebase, `appId` and `apiKey` updated in `config.ts`.

2. ~~**Database URL**~~ — DONE: Verified correct (`https://challengedice-default-rtdb.firebaseio.com`).

3. ~~**App Check**~~ — DONE: Firebase App Check enabled with reCAPTCHA v3. Debug token support for local dev. Enforcement enabled on Realtime Database in Firebase Console.

4. ~~**API key restrictions**~~ — Investigated; HTTP referrer restrictions conflict with App Check token exchange. Removed. App Check + database rules provide sufficient protection.

## Online Multiplayer

3. **Lobby code display** — The lobby page (`online/lobby/[gameId]`) creates a second Firebase listener just to read the game code. This should be refactored to expose the code through the `onlineGame` store instead of making a separate `observeGame` call.

4. **Rematch countdown timer** — The rematch countdown (30-second auto-start) UI is not yet implemented on the web. The `countdownStartedAt` timestamp is read from Firebase but no countdown timer is shown. The Android version has a `RematchBanner` with a visual countdown.

5. **Lobby ready state** — The lobby page doesn't fully implement per-player ready toggling. The Android version tracks `ready` per player and the host sees which players are ready.

6. **Host transfer in lobby** — When host leaves and another player becomes host, the lobby UI may not update the "Start Game" button visibility without a page refresh.

## UI/UX

7. **Scorecard pinch-to-zoom** — Not yet implemented. The scorecard scrolls but doesn't support pinch-to-zoom gestures for mobile users. Planned for Phase 2 but deferred.

8. **Simultaneous elimination dialog** — When multiple players are eliminated in the same round (during `rollDice`), only the last eliminated player's name is shown in the dialog. The Android version also has this limitation but a queue approach would be better.

9. **Landscape layout** — The responsive CSS uses width breakpoints but doesn't have specific handling for landscape phones (narrow height). Consider adding aspect-ratio-based media queries.

10. **Sound effects** — The `sounds.ts` module uses synthesized tones as placeholders. For production, replace with actual audio files (dice rattle, click, game-over fanfare).

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

13. **Sound/haptic preference checks** — `sounds.ts` functions (`playRollSound`, `playSelectSound`, etc.) don't check `preferences.soundEnabled` internally. Callers must check. Same for `tryVibrate` and `hapticEnabled`. Consider adding preference checks inside these functions.

14. **Host badge hardcoded to index 0** — Lobby page (`online/lobby/[gameId]`) shows "Host" badge for `i === 0` (first player in list), not the actual host UID. After host transfer this would be wrong. Should check against `onlineGame.isHost` or compare UIDs.

15. **Settings page missing** — The Android app has a Settings screen (layout mode, auto-roll toggle, haptic toggle, sound toggle, combo size, combo sort mode, dice animation toggle, dice roll direction). The web version has a `/settings` route but limited options. Auto-roll is always on, sounds use Web Audio API placeholders.

16. **`gameType.replace('_', ' ')` only replaces first underscore** — Stats page line 94. Use `.replaceAll('_', ' ')` for future-proofing if game types with multiple underscores are added.
