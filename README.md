# Gem Dash

A small three.js game for [start.ng](https://start.ng). Play it at **https://gem-dash.start.ng**.

Your start.ng character lands on a tiny island. Collect as many gems as you can in 60 seconds and dodge the rolling boulders: one hit and it's game over.

## How to play

- Move with the arrow keys or WASD. On a phone, drag on the screen.
- Walk into a gem to collect it. A new one appears somewhere else.
- Every 5 gems you go up a level, and the boulders come more often and faster. From level 4 they can come in pairs.
- The round ends when a boulder hits you or the 60 seconds run out. Press **Play again** to restart.
- Signed-in players save their best round to the start.ng leaderboard.

## start.ng features

- **Your character:** the player is built from your start.ng character style (body, colours, hair, hat and accessory). Change your look on start.ng and the game follows.
- **Sign-in:** handled by start.ng through its connect page. The game never sees passwords or emails. Guests play with start.ng's guest look.
- **Leaderboard:** one column, "Gems collected", declared in `startng.json`.

## Files

| File | What it does |
| --- | --- |
| `index.html` | The page, HUD and start / game-over cards |
| `style.css` | Styles |
| `game.js` | The island, controls, gems, boulders and rounds |
| `character.js` | Builds the 3D character from a start.ng style |
| `startng.js` | Talks to start.ng (who's playing, sign-in, scores, leaderboard) |
| `startng.json` | The leaderboard column |

No build step: three.js loads from jsDelivr. To run it locally, serve the folder (for example `py -m http.server 8000`) and open http://localhost:8000. Locally there is no start.ng sign-in, so you play as a guest.
