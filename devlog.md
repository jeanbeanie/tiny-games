# Tiny Games – Devlog

## Tiny Pet v0.6 - Growth & Neglect Timing Fix
**Date:** August 9, 2026

Found and fixed a couple of bugs where growth and neglect were tracking how many times the update loop happened to run instead of how much real time had actually passed. In practice that meant a pet aged fast with the tab open but barely aged at all while you were away, and neglect could either blow way past game over in a couple of minutes or barely register after a multi-day absence, depending on nothing more meaningful than whether the tab was open.

#### Changes:
- Pet growth now scales with real elapsed time (online or offline) instead of one age tick per loop, and stage thresholds were slowed down to a more deliberate pace
- Neglect is now derived live from time since your last interaction instead of an ever-increasing score, so it scales correctly and no longer needs the tab open to behave
- Coming back after a neglected stretch now eases the pet's mood back up gradually instead of either snapping back instantly or staying permanently stuck
- Bumped the save version since the above changes what saved pet data means

## Colony Clicker v0.10 - Bug Fix & Cleanup
**Date:** August 7, 2026

Found and fixed a food consumption bug that was scaling quadratically with population instead of linearly, meaning colonies became unsustainable once they grew past a handful of colonists no matter how well they were managed. Also cleaned up some markup and code issues along the way.

#### Changes:
- Fixed food consumption scaling quadratically with population instead of linearly
- Added a small test suite covering the food consumption formula
- Fixed invalid HTML (missing doctype/charset/lang, an unclosed tag)
- Removed a leftover debug console.log and an implicit global variable

## Colony Clicker v0.9.1 - Events/Buttons Cooldowns
**Date:** May 29, 2026

Adding cooldowns to a few select buttons, like the wood gather and construction buttons, have given a better
sense of pacing to the game. Starting a fresh run with a few food and wood resource makes the colony
feel a little less on the brink of immediate death upon arrival. The exploration button sees the biggest
impact on gameplay by not allowing the player to spam more land and resources, one of the current main
pacing tools of the game.

#### Changes:
- Gather Wood, Work on Construction, and Explore Land have set cooldowns
- Events expire after 15 seconds by default
- New games start with a small amount of food and wood

## Tiny Pets v0.5 - Care and Neglect Update
**Date:** Mar 24, 2026

I wanted the pet to feel like more than just a set of stats, and to have more meaningful consequences depending on how you care for it (or don’t).

#### Changes:
- Added a new "Care/Neglect" stat that tracks how well the pet is cared for
- Interactions increase care score, while not interacting for many hours increase neglect score
- Show bonding level based on care, which can influence pet moods and interactions
- Neglect is the main way to lose your pet now, rather than just low hunger or happiness

## Tiny Pets & Colony Clicker – Upcoming Updates
**Date:** Mar 21, 2026

Notes on the next few priority updates planned across the Tiny Games projects.

#### Colony Clicker:
- Save migration handling for upcoming changes to core game structure
- Balancing for resource gathering, event frequency, and land expansion
- 🥳 Minigame for land exploration, adding more player agency and variety to the core loop

#### Tiny Pet:
- Rename pet
- Simple growth system (egg, child, adult)
- 🥳 Battle system against AI pets, potentially with a rock-paper-scissors mechanic

#### General:
- Display dev log on the Tiny Games website?

## Colony Clicker v0.9 – Construction Update
**Date:** Feb 13, 2026

This update added the construction of buildings.

#### Changes:
- Buildings now have build times and require colonists or manual clicks to construct
	- Building progress is tracked and displayed in the UI
	- One building can be under construction at a time (for now!)
	- Bonuses do not go into effect until construction is complete
	- buildings require adequate buildableLand, which is found by exploring land
- Event choices are now properly disabled when requirements are not met
- include food generated from assigned colonists in UI (food gain per tick)

#### Future update ideas:
- Minigame for exploration
- Product made from resources (wood + food), deeper gameplay
- Save migration coming soon ^tm

## Colony Clicker v0.8 – Put Those Colonists to Work!
**Date:** Feb 9, 2026

This update added colonist assignment.

#### Changes:
- Colonist can now be assigned roles.
  - Gatherers contribute to food and wood production each tick
  - Explorers contribute to land exploration each tick
- Starvation forcibly unassigns workers
- Clicks still matter.

#### Future update ideas:
- Building construction with progress and labor requirements
- More consequences for over expanding
- Balance pacing
- UI polishing
- Save migration handling

## Colony Clicker v0.7 – Land and Resources are Finite Now
**Date:** Feb 8, 2026

This update focused on expanding future gameplay by making gatherable resources limited based on the amount of land available.
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
