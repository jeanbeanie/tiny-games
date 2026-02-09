# Tiny Games – Devlog

## Colony Clicker v0.7 – Land and Resources are Finite Now
**Date:** Jan 30, 2026

This update focused on expanding future gameplay by making resources a limited based on the amount of land available.
With land limits influencing total resources as well as buildable land area,
players will need to be more strategic about how they expand and manage their colony.

#### Changes:
- Explorable land area with a finite limit
- Status update when resources are exhausted due to land limits

#### Future update ideas:
- Colonist slots for buildings and resources
- More events and event variety
- UI polishing
- Save migration handling

## Colony Clicker v0.6 - Mo' Food Mo' Problems
**Date:** Jan 30, 2026

This update introduces the Granary building, an option to better manage food.
With greater food storage comes greater risk, food can now spoil if hoarded and unused for too long. 
Granaries help mitigate this risk by reducing spoilage chances.

#### What's Added
- Granary building
  - Increases food storage
  - Reduces the chance of food spoilage
- Food spoilage system
  - Excess food can now be lost if storage maxxed out for too long
- Show temporary statuses for relevant events (e.g., starvation and food spoilage warnings)

#### What's Changed
- Cleaned up population and food code structure
- General code cleanup in preparation for the future
- Improved event handling
  - Active events now persist across page reloads

#### Future update ideas:
- Colonist roles
- More events and event variety
- UI polishing

## Tiny Pet v0.3 – Mood & Polish Update
**Date:** Jan 27, 2026

This update focused on the game's feel rather than adding new systems.

#### Changes:
- Added explicit pet moods and flavor text
- Refactored UI state handling for button cooldowns vs stat-based disabling
- Improved feedback when interacting with the pet
- Tightened game-over logic and reset flow
- General polish pass for Tiny Games release

This version is the first to feel like a stable prototype.

## Colony Clicker v0.5 – Systems & Survival Update

This release was focused on cleaning up the game’s internal structure and laying the groundwork for future features.

#### Key changes:
- Refactored game state into a single persistent object
- Added real tick tracking and event cooldowns
- Implemented starvation mechanics and colony failure
- Events now persist correctly across reloads
- Added the ability to abandon and reset a colony
- Improved save/load reliability across all actions

This update doesn’t add a whole lot of fancy UI stuff, but it makes the game way more stable and robust for future devving. Future updates can build on this foundation.

## Colony Clicker v0.4 (Events & Resource Constraints)
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

## Colony Clickerv v0.3 (Initial Public Prototype)
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