/**
 * The field guide became the Journal (D-FLOW): see `ui/Journal.ts`. This
 * module keeps the old import path and class name that `game/Discovery.ts`
 * uses, so the Journal is `discovery.guide` everywhere.
 */

export { Journal as FieldGuide, type FieldGuideContent, type GuideEmitter } from './Journal.js';
