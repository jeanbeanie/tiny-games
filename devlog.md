# Tiny Games – Devlog

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