# Challenge Dice — Web Version

A web port of the Challenge Dice Android game, built with SvelteKit + TypeScript. Connects to the same Firebase Realtime Database as the Android app for cross-platform online multiplayer. Hosted on GitHub Pages.

## Current Status

**Phase: Active Development — Local play mostly functional, online play implemented and partially tested.**

The core game logic (scoring, combinations, AI) has been ported and verified with 38 unit tests. The local game UI is playable but has known UI bugs being worked on. Online multiplayer is connected to Firebase with App Check enabled; game creation and lobby are tested, full gameplay needs further testing.

### What Works
- Game logic: all scoring, combination generation, validation — 38 passing unit tests, verified identical to Android
- AI opponents: Easy, Medium, Hard, Expert with genetically-trained Expert weights
- Local game store with save/resume to localStorage
- Player setup with persistence (remembers names, colors, AI settings between sessions)
- Main menu, player setup, rules page, about page
- Settings page: theme (light/dark/system), auto-roll, sound, haptic, combo size, combo sort order, scorecard text size
- Sound effects using the Android app's own `rolling_dice.mp3` (looped during roll) and `shaking_dice.mp3` (one-shot on valid combo tap), gated by `soundEnabled`. Matches Android's two-sound scheme; no sounds on Score It, invalid tap, or game over.
- Haptic feedback (`navigator.vibrate`) on roll (50ms) and valid combo tap (15ms), gated by `hapticEnabled`
- Stats page with high scores (7 categories) and game history
- Scorecard rendering with penalty/scoring zones and multiplier hints
- SVG dice with roll animation (always on)
- Combination card grid
- Confetti overlay on game over
- Elimination dialog with batching and animation deferral
- GitHub Actions deploy workflow
- Mobile-responsive CSS (3 breakpoints)

### Known Bugs (Active)
- **Combo card selection may not update the Score It button** — The `selectedCombo` state may not be triggering reactivity correctly in Svelte 5. The button shows "Select a combination" (disabled) but clicking a combo card doesn't change it to "Score It". Needs debugging with browser devtools.
- **Menu/Rules navigation from game page** — Links were using incorrect Svelte href syntax (`"{base}/"` instead of `` {`${base}/`} ``). Fixed in latest commit but needs verification.
- **Auto-roll timing** — Uses a round-tracking guard to prevent re-triggering, but hasn't been fully verified in multi-round play.

### Not Yet Implemented
- **Scorecard pinch-to-zoom** — Scorecard scrolls but doesn't support pinch-to-zoom on mobile.
- **Score tooltips** — Click/tap on scorecard rows to see score explanation.
- Android-only settings intentionally not ported: dice animation toggle (web always animates), dice roll direction, layout mode.

### Online Multiplayer (Implemented, Partially Tested)
All Firebase operations are ported from the Android `FirebaseGameManager.kt`:
- Create/join/leave/dismiss games
- Lobby with player list, host controls, game code sharing
- Real-time game state sync via Firebase listeners
- Simultaneous scoring (all players score independently, host advances rounds)
- Disconnect detection and self-healing reconnect
- Rematch system (request/accept/decline)
- Firebase App Check with reCAPTCHA v3 (attestation for web client)

Game creation and lobby tested successfully. Full gameplay flow needs further testing.

#### Online-Specific Known Issues
- Rematch countdown timer UI not implemented (data is read, timer not shown)
- Lobby ready state simplified (no per-player ready toggle)
- Host badge hardcoded to player index 0, not actual host UID
- Lobby code read via separate listener (should use onlineGame store)

## Tech Stack

| Concern | Choice |
|---------|--------|
| Framework | SvelteKit 2 + Svelte 5 (runes) |
| Language | TypeScript (strict) |
| Build | Vite 6 |
| Firebase | Firebase JS SDK v10+ (modular) |
| Testing | Vitest |
| Deployment | GitHub Actions → GitHub Pages via `adapter-static` |
| Dice | SVG |
| Confetti | Canvas + requestAnimationFrame |

## Project Structure

```
src/
├── lib/
│   ├── game/
│   │   ├── models.ts          # Data types (Scorecard, Player, GameState, etc.)
│   │   ├── logic.ts           # Game logic (pure functions, ported from GameLogic.kt)
│   │   ├── logic.test.ts      # 38 parity tests
│   │   ├── constants.ts       # Row configs, multipliers, colors, theme
│   │   └── ai.ts              # AI strategies (Easy/Medium/Hard/Expert)
│   ├── firebase/
│   │   ├── config.ts          # Firebase app init + App Check
│   │   ├── auth.ts            # Anonymous auth
│   │   ├── gameManager.ts     # All Firebase CRUD operations
│   │   └── types.ts           # Online data types
│   ├── stores/
│   │   ├── localGame.svelte.ts   # Local game state (ported from GameViewModel.kt)
│   │   ├── onlineGame.svelte.ts  # Online game state (ported from OnlineGameViewModel.kt)
│   │   ├── highScores.ts         # localStorage high scores
│   │   ├── gameHistory.ts        # localStorage game history
│   │   └── preferences.ts        # User preferences
│   ├── components/
│   │   ├── DiceView.svelte          # Single SVG die
│   │   ├── DiceDisplay.svelte       # Row of 5 dice with animation
│   │   ├── Scorecard.svelte         # Full scorecard (left + right + summary)
│   │   ├── CombinationGrid.svelte   # Grid of selectable combo cards
│   │   ├── CombinationCard.svelte   # Single combo card
│   │   ├── PlayerTabs.svelte        # Player tab bar with scores
│   │   ├── ConfettiOverlay.svelte   # Canvas confetti on game over
│   │   ├── EliminationDialog.svelte # Player eliminated modal
│   │   └── Toast.svelte             # Error/info notifications
│   └── utils/
│       ├── validation.ts     # Name sanitization
│       ├── sounds.ts         # Web Audio API (placeholder tones)
│       └── clipboard.ts      # Copy to clipboard
├── routes/
│   ├── +layout.svelte        # Root layout (theme, app shell)
│   ├── +layout.ts            # SSR disabled, prerender enabled
│   ├── +page.svelte          # Main Menu
│   ├── play/
│   │   ├── setup/+page.svelte    # Player setup (1-4 players + AI)
│   │   ├── game/+page.svelte     # Local game screen
│   │   └── gameover/+page.svelte # Local game over
│   ├── online/
│   │   ├── +page.svelte              # Online setup (create/join/browse)
│   │   ├── lobby/[gameId]/+page.svelte  # Lobby waiting room
│   │   ├── game/[gameId]/+page.svelte   # Online game
│   │   └── gameover/+page.svelte        # Online game over
│   ├── rules/+page.svelte    # How to play
│   ├── stats/+page.svelte    # High scores + game history
│   └── about/+page.svelte    # About page
├── app.html
└── app.css                    # Global styles, CSS custom properties
```

## Development

```bash
# Install dependencies
npm install

# Start dev server (hot reload)
npm run dev
# → http://localhost:5173/ChallengeDice-web/

# Run tests
npm test

# Production build
npm run build

# Preview production build
npm run preview
# → http://localhost:4173/ChallengeDice-web/
```

## Firebase Setup

The web app is registered in the Firebase `challengedice` project. Firebase config (apiKey, projectId, etc.) is safe to commit — security is enforced by database rules and App Check, not by hiding the config.

### App Check

Firebase App Check is enabled with reCAPTCHA v3 to ensure only the registered web app can access the Realtime Database. Enforcement is turned on in the Firebase Console.

- **Production:** reCAPTCHA v3 runs invisibly (no user-facing challenge)
- **Local dev:** A debug token is used automatically (`import.meta.env.DEV` guard in `config.ts`). On first run, copy the debug token from the browser console and register it in Firebase Console → App Check → Manage debug tokens
- The Android app also has App Check enabled, so enforcement applies to both platforms

## Deployment (GitHub Pages)

1. Create a new GitHub repo named `ChallengeDice-web`
2. Push this project to the repo
3. In repo Settings → Pages → Source: "GitHub Actions"
4. The `.github/workflows/deploy.yml` will automatically build and deploy on push to `main`
5. Site will be available at `https://<username>.github.io/ChallengeDice-web/`

**Important:** The `base` path in `svelte.config.js` is set to `/ChallengeDice-web`. If you use a different repo name, update this value.

**Note:** The deploy workflow uses Node.js 20, which GitHub is deprecating. Actions will be forced to Node.js 24 starting June 2, 2026, and Node.js 20 will be removed September 16, 2026. Update the workflow's `actions/checkout`, `actions/setup-node`, `actions/upload-pages-artifact`, and `actions/deploy-pages` to versions that support Node.js 24 before then.

## Game Logic Parity

The web game logic has been verified identical to the Android version through:
- 38 unit tests covering all functions in `GameLogic.kt`
- Deep comparison by automated review agents confirming:
  - `generateCombinations` — same deduplication, sort order, normalization
  - `calculateRowScore` — same penalty thresholds, multiplier indexing
  - `calculateScore` — same iteration and accumulation
  - `isCombinationValid` — same same-sum-pair logic
  - `applySelection` — same increment logic
  - All constants (row configs, multipliers, box counts) — exact match
  - AI weights (all 24 Expert floats) — exact match
  - AI strategy logic (evaluate, pickNearOptimal, phase detection) — identical

Only difference: `rollDice` uses `Uint32 % 6` (negligible ~0.0000002% bias) vs Android's `SecureRandom.nextInt(6)` (perfectly uniform). No practical impact.

## Key Files for Reference

| Web File | Ported From (Android) |
|----------|----------------------|
| `src/lib/game/logic.ts` | `model/GameLogic.kt` |
| `src/lib/game/models.ts` | `model/GameModels.kt` |
| `src/lib/game/ai.ts` | `model/AiStrategy.kt` |
| `src/lib/firebase/gameManager.ts` | `data/FirebaseGameManager.kt` |
| `src/lib/stores/localGame.svelte.ts` | `viewmodel/GameViewModel.kt` |
| `src/lib/stores/onlineGame.svelte.ts` | `viewmodel/OnlineGameViewModel.kt` |

## Related Files

- `PLAN.md` — Original implementation plan
- `OPEN_ISSUES.md` — Detailed list of all known issues with descriptions
