// Casa Larga: the numbers.
//
// Plan coordinates: x runs east, n runs north from the inside face of the front
// wall. In three.js that is (x, y up, z = -n), so walking north is walking down
// the negative z axis, which is where a three.js camera looks by default.
// Everything is in metres.

export const PAPER = '#f1eee6';
export const INK = '#17171a';

export const GROUND_Y = -0.16; // the sheet of paper the house stands on
export const BASE_Y = -0.15; // underside of the floor slab
export const CUT_PLAN = 1.2; // where an architect cuts a plan
export const CUT_OPEN = 5.4; // above the highest parapet: nothing is cut

export const EYE = 1.6;

// Rooms, to the centre lines of their walls so that together they tile the plan.
// `walk` rooms get real materials when the camera reaches them. `dir` is the
// direction the materials sweep in (x, n).
export const ROOMS = [
  { key: 'hall', name: 'HALL', x0: -2.1, x1: 2.1, n0: -0.4, n1: 7.1, ceil: 2.7, walk: true, dir: [0, 1], clear: [4.0, 7.0] },
  { key: 'living', name: 'LIVING ROOM', x0: -6.2, x1: 6.1, n0: 7.1, n1: 18.3, ceil: 4.2, walk: true, dir: [0, 1], clear: [12.0, 11.0] },
  { key: 'kitchen', name: 'KITCHEN / DINING', x0: -6.2, x1: 6.1, n0: 18.3, n1: 28.5, ceil: 3.2, walk: true, dir: [0, 1], clear: [12.0, 10.0] },
  { key: 'court', name: 'COURTYARD', x0: -6.2, x1: 6.2, n0: 28.5, n1: 40.8, ceil: 30, walk: true, dir: [0, 1], clear: [12.0, 12.0] },
];

// Rooms the camera never enters. They are drawn and their walls rise, nothing more.
export const SIDE_ROOMS = [
  { name: 'STUDY', x: -4.1, n: 1.3, clear: [3.8, 7.0] },
  { name: 'CLOAKS', x: 4.1, n: 2.9, clear: [3.8, 4.3] },
  { name: 'WC', x: 3.7, n: 6.2, clear: [3.8, 2.5], small: true },
  { name: 'GALLERY', x: 6.9, n: 22.0, clear: [1.4, 28.4], vertical: true },
  { name: 'BEDROOM 3', x: 10.2, n: 2.0, clear: [4.2, 6.3] },
  { name: 'BEDROOM 2', x: 10.2, n: 8.6, clear: [4.2, 6.3] },
  { name: 'BATH', x: 9.2, n: 14.4, clear: [2.0, 4.0], small: true },
  { name: 'BATH', x: 11.0, n: 14.55, clear: [2.0, 4.0], small: true },
  { name: 'BEDROOM 1', x: 9.9, n: 19.2, clear: [4.2, 7.0] },
  { name: 'DRESSING', x: 9.9, n: 25.02, clear: [4.2, 4.0], small: true },
];

// Trees. The one in the courtyard is where the walk ends.
export const TREES = [
  { room: 'court', x: -2.7, n: 35.4, base: 0, trunk: 2.3, r: 2.5, turn: 0.4 },
  { room: 'rest', x: -14.2, n: 9.6, base: GROUND_Y, trunk: 2.0, r: 2.3, turn: 0.2 },
  { room: 'rest', x: -15.6, n: 15.0, base: GROUND_Y, trunk: 2.4, r: 2.8, turn: 1.1 },
  { room: 'rest', x: -13.8, n: 21.0, base: GROUND_Y, trunk: 1.9, r: 2.1, turn: 2.0 },
  { room: 'rest', x: -11.0, n: -8.6, base: GROUND_Y, trunk: 2.2, r: 2.4, turn: 0.7 },
];

// Inner doors, drawn standing open. hinge (x, n), leaf direction when open and
// the direction it lies in when closed, as angles in degrees from east.
export const DOORS = [
  { x: 2.2, n: 0.7, open: 0, closed: 90 },
  { x: 4.6, n: 4.5, open: 90, closed: 0 },
  { x: -5.0, n: 7.0, open: -90, closed: 0 },
  { x: 6.2, n: 8.2, open: 0, closed: 90 },
  { x: 7.8, n: 5.2, open: 0, closed: 90 },
  { x: 7.8, n: 7.0, open: 0, closed: 90 },
  { x: 7.8, n: 14.6, open: 0, closed: 90 },
  { x: 10.6, n: 13.0, open: 90, closed: 0 },
  { x: 7.8, n: 17.6, open: 0, closed: 90 },
  { x: 8.2, n: 24.4, open: 90, closed: 0 },
];

// The sun: late afternoon, low in the south-west. This is the direction the
// light travels in three.js coordinates (towards the north-east and down).
export const SUN_ELEV = 17;
export const SUN_HEADING = [0.5, -0.866]; // (x, z)

export const PROJECT = {
  name: 'Casa Larga',
  place: 'Coll de Marès, Mallorca',
  drawing: 'Ground floor plan',
  sheet: 'A-101',
  scale: '1:100',
  date: '12.10.2026',
};
