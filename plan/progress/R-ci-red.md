# R-ci-red

Hosted CI on main was red after items 38, 40 and 41. Root causes and changes:

1. journal-debrief frozen debrief: item 41 made Dive again the primary after a dive. The spec now expects `dive-again` primary; Dive sites moved under More options, so the Tab order and the two tests that click Dive sites open More first.
2. journal-debrief 'summary and Journal': the new stars explainer reused the `debrief-next` class, so two matched. It now has its own `debrief-stars-note` class (same CSS); the spec stays at one `.debrief-next`.
3. f-title-layout: item 38 made secondary home buttons transparent while Daily keeps a fill. The spec now checks the real intent: Daily is not the mint primary.
4. d2-predive: mode helper text changed; specs match `/fast travel/i` and `/battery, oxygen/i`.
5. phone-accept 844x390: genuine regression. The stars line pushed Keep exploring and Journal below the fold in the landscape debrief. Added a `max-height: 480px` rule in flow.css (tighter padding, actions laid out in a row). Separately, the spec's pilotCommand CDP touch left the next real tap dropped locally (also on main), so it now spends one tap on an inert corner.
6. props-geo unit: the material isolation test is tier-independent, so it runs once at low instead of three tiers (about 35 s down to 4 s); the taper test still runs on every tier. Peer-evidence checks moved out of the variant loop.
