# Optional dive supplies

The `gameplay.batteryOxygen` setting is **off in Arcade** and **on in Realistic**.
Custom mode can combine it with any speed, light, sensor, or start-position option.
The top-right telemetry block shows battery and oxygen only while the option is on.
Warnings begin at 25% and become critical at 10%.

At 1× simulated time, oxygen lasts 10 hours. Battery has an 18-hour idle
component, plus load-dependent use from thrust, ballast, lights and sensors.
Full thrust draws an additional 1/12 of a battery per hour; lights add 1/22,
and active sensors add 1/24. Boost multiplies thrust use by 2.5. Typical
research-speed operation with lights and sensors lasts roughly 6–10 hours;
continuous full thrust and boost shorten that. At 2× or 3×, the same simulation
plays faster in wall time, so supplies drain 2× or 3× faster per wall second.
All tuning values live in `Config.power`.

These are gameplay estimates, not a physical battery or life-support model.
They are anchored to [WHOI's Alvin specifications](https://ndsf.whoi.edu/alvin/specifications/),
which give a normal dive duration of 6–10 hours and two 120 V, 140 Ah battery
banks. [WHOI's capabilities page](https://ndsf.whoi.edu/alvin/capabilities/)
notes that heavy electrical use can reduce normal dive duration and describes
up to 72 hours submerged under emergency conditions. The game uses a shorter
10-hour oxygen play limit for readable planning; it does **not** model Alvin's
emergency life-support reserve. [WHOI's Alvin safety page](https://ndsf.whoi.edu/alvin-safety/)
describes independent weight-release and emergency-battery systems that can
bring Alvin up when normal power is lost. The game's emergency blow is a safe
game equivalent, not a simulation of that hardware.

Empty battery or oxygen locks controls and starts an automatic ascent using the
submarine's emergency-blow acceleration. It continues to the surface, then
opens an aborted-dive debrief with the completed objective count. The player
can start a fresh dive from there. Pausing freezes supply use; changing the
option live preserves current levels, and the next dive restores both to 100%.

For deterministic tests, `window.__game.power.setLevels(battery, oxygen)` accepts
fractions in `[0,1]`. The normal game never calls it.
