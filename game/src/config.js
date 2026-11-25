// Dapur Kilat — every tuning number, colour and recipe in one place.
// The kitchen is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** One full service day, in seconds; surviving it with hearts left wins. */
export const DAY_SECONDS = 150;

/** Hearts lost when an order's patience runs out; at zero the day is lost. */
export const HEARTS = 3;

/** How many order tickets can wait on the board at once. */
export const MAX_ORDERS = 4;

export const CHEF = {
  radius: 26,
  speed: 330,
  /** Y band the chef walks in: below the station row, above the floor edge. */
  floorTop: 236,
  floorBottom: 676,
  floorLeft: 36,
  floorRight: 1244,
};

/** Ingredient ids. Raw ones need prep; the rest go straight on the plate. */
export const INGREDIENTS = {
  bun: { name: 'Roti', color: '#e8b96a', dark: '#b98a3e', prep: 'none', price: 0 },
  pattyRaw: { name: 'Daging', color: '#d97b7b', dark: '#a84a4a', prep: 'grill', price: 0 },
  tomato: { name: 'Tomat', color: '#e5533d', dark: '#a82f1e', prep: 'chop', price: 0 },
  lettuce: { name: 'Selada', color: '#7dc24f', dark: '#4d8a2a', prep: 'chop', price: 0 },
  cheese: { name: 'Keju', color: '#f2c94c', dark: '#c79a1d', prep: 'none', price: 0 },
};

/** What a prepped ingredient becomes. */
export const PREPPED = {
  pattyRaw: 'patty',
  tomato: 'tomatoCut',
  lettuce: 'lettuceCut',
};

export const COOKED_NAMES = {
  patty: 'Daging Panggang',
  tomatoCut: 'Tomat Iris',
  lettuceCut: 'Selada Iris',
  burnt: 'Gosong!',
};

/** Seconds of holding E at the board to finish one chop. */
export const CHOP_SECONDS = 1.4;
/** Seconds on the grill until a patty is cooked, and until it burns. */
export const GRILL_COOK_SECONDS = 3.5;
export const GRILL_BURN_SECONDS = 7.0;
/** Grill slots. */
export const GRILL_SLOTS = 2;

/** Recipes the order board can ask for. Items are ingredient ids. */
export const RECIPES = [
  { id: 'burgerKilat', name: 'Burger Kilat', items: ['bun', 'patty', 'lettuceCut'], price: 18 },
  { id: 'sandwichKeju', name: 'Sandwich Keju', items: ['bun', 'cheese', 'tomatoCut'], price: 20 },
  { id: 'saladSegar', name: 'Salad Segar', items: ['lettuceCut', 'tomatoCut', 'cheese'], price: 16 },
  { id: 'burgerKeju', name: 'Burger Keju', items: ['bun', 'patty', 'cheese', 'tomatoCut'], price: 26 },
  { id: 'burgerKomplit', name: 'Burger Komplit', items: ['bun', 'patty', 'lettuceCut', 'tomatoCut', 'cheese'], price: 34 },
];

/** Order pacing: seconds between new tickets, shrinking as the day rushes. */
export const ORDER = {
  firstAfter: 1.5,
  intervalStart: 14,
  intervalEnd: 7,
  patienceStart: 58,
  patienceEnd: 38,
};

/** Stations along the back counter, left to right. */
export const STATIONS = {
  pantry: { id: 'pantry', label: 'BAHAN', x: 16, width: 284, y: 104, height: 92 },
  board: { id: 'board', label: 'TALENAN', x: 316, width: 136, y: 104, height: 92 },
  grill: { id: 'grill', label: 'PANGGANGAN', x: 468, width: 192, y: 104, height: 92 },
  assembly: { id: 'assembly', label: 'MEJA RAKIT', x: 676, width: 240, y: 104, height: 92 },
  window: { id: 'window', label: 'JENDELA SAJI', x: 932, width: 188, y: 104, height: 92 },
  trash: { id: 'trash', label: 'SAMPAH', x: 1136, width: 128, y: 104, height: 92 },
};

/** The five pantry bins, in the order the 1-5 keys pick them. */
export const PANTRY_BINS = ['bun', 'pattyRaw', 'tomato', 'lettuce', 'cheese'];

export const PALETTE = {
  wall: '#f3dfae',
  wallShadow: '#e0c48d',
  floorA: '#eec27f',
  floorB: '#e0a95c',
  counterTop: '#a06a35',
  counterFront: '#7d5023',
  steel: '#9aa5b1',
  steelDark: '#6e7883',
  boardWood: '#d9a05b',
  grillBody: '#3a3f4a',
  grillGlow: '#ff8c2f',
  marble: '#f2efe8',
  windowGlow: '#ffd98a',
  ticket: '#fff8e6',
  ticketEdge: '#d9b96a',
  ink: '#2b2118',
  muted: '#7a6a52',
  chefHat: '#ffffff',
  chefSkin: '#f2c09a',
  chefShirt: '#3f7d5c',
  chefApron: '#f5f0e1',
  good: '#2e8b57',
  warn: '#e08a00',
  bad: '#c93a2e',
  gold: '#f2c94c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best coins total is kept between visits (this browser only). */
export const BEST_KEY = 'dapur-kilat.best-coins';
