// The screenshot scenes behind ?shot=start|play|serve|end. Each one plays the
// real rules forward from a fresh world, steered by a goal-driven autopilot
// (fetch what the oldest order still needs, prep it, assemble it, serve it),
// so every frame is what a short game really looks like and the same seed
// always gives the same frame.
import { CHOP_SECONDS, GRILL_BURN_SECONDS, GRILL_COOK_SECONDS, PANTRY_BINS, PREPPED, STATIONS, STEP } from './config.js';
import { matchingOrder, nearestStation } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const DAY_LIMIT_SECONDS = 200;
const SAMPLE = STEP;

/** Where the chef stands to use a station: its centre, just below the counter. */
function frontOf(station) {
  return { x: station.x + station.width / 2, y: station.y + station.height + 64 };
}

/** The raw pantry item that becomes `wanted` after prep. */
function rawFor(wanted) {
  for (const [raw, cooked] of Object.entries(PREPPED)) {
    if (cooked === wanted) return raw;
  }
  return wanted;
}

/** True when the plate's items are still a subset of some live order. */
function plateStillUseful(state) {
  if (state.plate.length === 0) return true;
  const plate = [...state.plate].sort();
  return state.orders.some((order) => {
    const need = [...order.recipe.items];
    return plate.every((item) => {
      const at = need.indexOf(item);
      if (at === -1) return false;
      need.splice(at, 1);
      return true;
    });
  });
}

/** True when the oldest order still needs `item`, given what is on the plate. */
function orderStillNeeds(state, item) {
  if (state.orders.length === 0) return false;
  const need = [...state.orders[0].recipe.items];
  for (const onPlate of state.plate) {
    const at = need.indexOf(onPlate);
    if (at !== -1) need.splice(at, 1);
  }
  return need.includes(item);
}

/** The next raw ingredient the oldest order still needs, or null. Items
 * already on the plate, on the board, on the grill or in hand are covered. */
function nextNeeded(state) {
  if (state.orders.length === 0) return null;
  const order = state.orders[0];
  const need = [...order.recipe.items];
  for (const item of state.plate) {
    const at = need.indexOf(item);
    if (at !== -1) need.splice(at, 1);
  }
  const inFlight = new Set();
  if (state.board) inFlight.add(PREPPED[state.board.item] ?? state.board.item);
  for (const slot of state.grill) inFlight.add('patty');
  if (state.chef.carrying) inFlight.add(PREPPED[state.chef.carrying] ?? state.chef.carrying);
  for (const wanted of need) {
    if (inFlight.has(wanted)) continue;
    const raw = rawFor(wanted);
    // Never fetch a second patty while both grill slots are busy.
    if (raw === 'pattyRaw' && state.grill.length >= 2) continue;
    return raw;
  }
  return null;
}

/**
 * One autopilot decision: where to walk, whether to tap E, whether to hold E,
 * and which pantry bin to pick. Returns {x, y, press, held, bin}.
 */
function autopilot(world) {
  const state = world.state;
  const chef = state.chef;
  const idle = { x: 0, y: 0, press: false, held: false, bin: -1 };

  function goTo(station, pressWhenNear) {
    const target = frontOf(station);
    const dx = target.x - chef.x;
    const dy = target.y - chef.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 26) return { x: 0, y: 0, press: pressWhenNear, held: false, bin: -1 };
    return { x: dx / distance, y: dy / distance, press: false, held: false, bin: -1 };
  }

  // A finished plate goes to the window at once.
  if (state.plate.length > 0 && matchingOrder(state)) {
    return goTo(STATIONS.window, true);
  }
  // A stale plate (its order expired) goes in the trash.
  if (state.plate.length > 0 && !plateStillUseful(state)) {
    return goTo(STATIONS.trash, true);
  }
  const carrying = chef.carrying;
  if (carrying) {
    if (carrying === 'burnt') return goTo(STATIONS.trash, true);
    const prep = { tomato: 'board', lettuce: 'board', pattyRaw: 'grill' }[carrying];
    if (prep === 'board') {
      // The board is already busy: the carried raw item is a duplicate.
      if (state.board) return goTo(STATIONS.trash, true);
      return goTo(STATIONS.board, true);
    }
    if (prep === 'grill') {
      if (state.grill.length >= 2) return goTo(STATIONS.trash, true);
      return goTo(STATIONS.grill, true);
    }
    // A ready item only goes on the plate while the oldest order still needs
    // it; a leftover (its order was served by another plate) goes in the trash.
    if (orderStillNeeds(state, carrying)) return goTo(STATIONS.assembly, true);
    return goTo(STATIONS.trash, true);
  }
  // Hands empty: collect a cooked patty first, but only while an order needs
  // one; a burnt patty is collected for the trash.
  const cooked = state.grill.findIndex((slot) => slot.progress >= GRILL_COOK_SECONDS && slot.progress < GRILL_BURN_SECONDS);
  if (cooked !== -1 && orderStillNeeds(state, 'patty')) return goTo(STATIONS.grill, true);
  const burnt = state.grill.findIndex((slot) => slot.progress >= GRILL_BURN_SECONDS);
  if (burnt !== -1) return goTo(STATIONS.grill, true);
  // A chopped item waiting on the board is collected (or finished) first.
  if (state.board) {
    const near = nearestStation(state);
    if (near && near.id === 'board') {
      return { x: 0, y: 0, press: state.board.progress >= CHOP_SECONDS, held: true, bin: -1 };
    }
    return goTo(STATIONS.board, false);
  }
  const wanted = nextNeeded(state);
  if (wanted === null) {
    // Nothing to do: wait by the assembly counter for the next ticket.
    const target = { x: 796, y: 320 };
    const dx = target.x - chef.x;
    const dy = target.y - chef.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 20) return idle;
    return { x: dx / distance, y: dy / distance, press: false, held: false, bin: -1 };
  }
  const decision = goTo(STATIONS.pantry, true);
  decision.bin = PANTRY_BINS.indexOf(wanted);
  return decision;
}

/** Run the autopilot for up to `seconds`, stopping early when `done` says so. */
function runFor(world, seconds, done) {
  const steps = Math.floor(seconds / SAMPLE);
  for (let index = 0; index < steps; index += 1) {
    const move = autopilot(world);
    const state = world.state;
    world.step(SAMPLE, { x: move.x, y: move.y }, move.press, move.held, move.bin, null, false);
    if (state.dayOver) break;
    if (done && done(state)) break;
  }
}

/**
 * Set `world` to the named scene (start, play, serve or end) and return the
 * screen to draw over it and the best coins total to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'serve' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / SAMPLE; index += 1) {
      world.step(SAMPLE, { x: 0, y: 0 }, false, false, -1, null, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    // Play until the plate is mid-assembly (two items on it) with orders
    // waiting, or a minute of play, whichever comes first.
    runFor(world, 60, (state) => state.plate.length >= 2 && state.orders.length >= 2);
    return { screen: SCREEN_PLAY, best: world.state.coins };
  }
  if (name === 'serve') {
    // Play until a plate is complete and the chef has walked to the window.
    runFor(world, DAY_LIMIT_SECONDS, (state) => {
      if (state.plate.length > 0 && matchingOrder(state)) {
        const target = frontOf(STATIONS.window);
        return Math.hypot(target.x - state.chef.x, target.y - state.chef.y) < 40;
      }
      return false;
    });
    return { screen: SCREEN_PLAY, best: world.state.coins };
  }
  // End: play the whole day out, win or lose.
  runFor(world, DAY_LIMIT_SECONDS, (state) => state.dayOver);
  return { screen: SCREEN_OVER, best: world.state.coins };
}
