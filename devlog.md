# Tiny Games – Devlog

### v0.5 – Systems & Survival Update

This release was focused on cleaning up the game’s internal structure and laying the groundwork for future features.

Key changes:
- Refactored game state into a single persistent object
- Added real tick tracking and event cooldowns
- Implemented starvation mechanics and colony failure
- Events now persist correctly across reloads
- Added the ability to abandon and reset a colony
- Improved save/load reliability across all actions

This update doesn’t add a whole lot of fancy UI stuff, but it makes the game way more stable and robust for future devving. Future updates can build on this foundation.

## v0.4 – Colony Clicker (Events & Resource Constraints)
**Date:** Jan 24, 2026

#### What changed
- Added wood storage caps and clamping
- Introduced a lightweight event system with player choices
- Events can alter food, wood, and population
- Event UI integrated into the main game flow
- Improved feedback around resource gain/loss

#### Why
The game needed moments of choice and uncertainty.
Events add narrative flavor and decision-making without complicating the core loop.

#### Notes
- Events are defined as data, not conditions, so will be easy to expand
- Resource clamping continues to simplify edge cases
- Wood now feels like an actual limited resource instead of an infinite meaningless one

#### Next
- Expand event variety and consequences
- Explore early progression or specializations
- Continue refining

## v0.3 – Colony Clicker (Initial Public Prototype)
**Date:** Jan 19, 2026

#### What changed
- Implemented food production/consumption loop
- Added storage caps and clamping to prevent negative values
- Made sheds reduce food consumption and increase storage
- Deployed game to GitHub Pages

#### Why
Needed a complete, stable core loop before expanding features

#### Notes
- Ended up centralizing food logic and removed several bugs
- Clamping resources simplified the entire tick system
- Showing food gain/loss per tick was low effort high reward

#### Next
- v0.4 features will be focused on *player choices*
- Considering jobs, triggered events, risk/reward systems