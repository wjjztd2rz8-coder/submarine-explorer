/** Read-only evidence for recovering research saves made before fixed equipment. */
export const LEGACY_REWARDS = {
  poi: 10,
  objective: 5,
  species: 15,
  photo: 10,
  primary: 30,
  rating: 20,
  secret: 15,
  sample: 10,
  event: 5,
};
export const LEGACY_PURCHASE_COSTS: Readonly<Record<string, readonly number[]>> = {
  'light-range': [35, 65, 100],
  'light-beam': [40, 75],
  'sonar-range': [35, 65, 100],
  'sonar-detail': [40, 75],
  battery: [40, 75, 110],
  oxygen: [40, 75],
  boost: [35, 65, 100],
  thrust: [45, 80, 120],
  turn: [35, 65],
  reverse: [35, 65],
};
