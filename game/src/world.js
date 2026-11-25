// Dapur Kilat's simulation: the chef, the orders, the plate, the board and the
// grill. It knows nothing about the canvas or the keyboard: the loop feeds it a
// steering vector, an interact press, a held interact, a pantry bin pick and an
// optional click target, and it answers with event flags the loop turns into
// sounds and announcements.

import {
  CHEF, CHOP_SECONDS, DAY_SECONDS, GRILL_BURN_SECONDS, GRILL_COOK_SECONDS,
  GRILL_SLOTS, HEARTS, INGREDIENTS, MAX_ORDERS, ORDER, PANTRY_BINS, PREPPED,
  RECIPES, STATIONS,
} from './config.js';

export const EVENT_PICKUP = 1;
export const EVENT_SERVE = 2;
export const EVENT_EXPIRE = 4;
export const EVENT_OVER = 8;
export const EVENT_ERROR = 16;
export const EVENT_CHOP_DONE = 32;
export const EVENT_GRILL_DONE = 64;

function stationCentre(station) {
  return { x: station.x + station.width / 2, y: station.y + station.height };
}

/** The nearest station the chef can reach, or null when too far away. */
export function nearestStation(state) {
  let best = null;
  let bestDistance = Infinity;
  for (const station of Object.values(STATIONS)) {
    const centre = stationCentre(station);
    const dx = Math.abs(state.chef.x - centre.x);
    const dy = state.chef.y - centre.y;
    if (dx > station.width / 2 + 46 || dy < -10 || dy > 120) continue;
    const distance = dx + dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = station;
    }
  }
  return best;
}

/** True when the plate's items are exactly one order's recipe, any order. */
export function matchingOrder(state) {
  const plateKey = [...state.plate].sort().join(',');
  for (const order of state.orders) {
    if ([...order.recipe.items].sort().join(',') === plateKey) return order;
  }
  return null;
}

export function createWorld(random) {
  const state = {
    chef: { x: 640, y: 480, carrying: null },
    selectedBin: 0,
    orders: [],
    plate: [],
    board: null,
    grill: [],
    coins: 0,
    served: 0,
    failed: 0,
    hearts: HEARTS,
    timeLeft: DAY_SECONDS,
    elapsed: 0,
    dayOver: false,
    won: false,
    nextOrderIn: ORDER.firstAfter,
    orderCount: 0,
    moveTarget: null,
    pendingStation: null,
    flash: null,
    flashUntil: 0,
  };

  function dealRecipe() {
    // Early in the day only the short recipes appear; the long ones join the
    // rush once a third of the day has passed.
    const pool = RECIPES.filter((recipe) => state.elapsed < DAY_SECONDS / 3
      ? recipe.items.length <= 3
      : true);
    return pool[random.pick(pool.length)];
  }

  function spawnOrder() {
    const recipe = dealRecipe();
    const rush = state.elapsed / DAY_SECONDS;
    const patience = ORDER.patienceStart + (ORDER.patienceEnd - ORDER.patienceStart) * rush;
    state.orders.push({
      id: state.orderCount + 1,
      recipe,
      patience,
      maxPatience: patience,
    });
    state.orderCount += 1;
  }

  function interact(station) {
    let events = 0;
    const chef = state.chef;
    if (station.id === 'pantry') {
      if (chef.carrying) return EVENT_ERROR;
      chef.carrying = PANTRY_BINS[state.selectedBin];
      return EVENT_PICKUP;
    }
    if (station.id === 'board') {
      if (state.board && state.board.progress >= CHOP_SECONDS && !chef.carrying) {
        chef.carrying = PREPPED[state.board.item] ?? state.board.item;
        state.board = null;
        return EVENT_CHOP_DONE;
      }
      if (!state.board && chef.carrying && INGREDIENTS[chef.carrying]
        && INGREDIENTS[chef.carrying].prep === 'chop') {
        state.board = { item: chef.carrying, progress: 0 };
        chef.carrying = null;
        return EVENT_PICKUP;
      }
      return EVENT_ERROR;
    }
    if (station.id === 'grill') {
      const cooked = state.grill.find((slot) => slot.progress >= GRILL_COOK_SECONDS
        && slot.progress < GRILL_BURN_SECONDS);
      const burnt = state.grill.find((slot) => slot.progress >= GRILL_BURN_SECONDS);
      if (!chef.carrying && cooked) {
        chef.carrying = 'patty';
        state.grill.splice(state.grill.indexOf(cooked), 1);
        return EVENT_PICKUP;
      }
      if (!chef.carrying && burnt) {
        chef.carrying = 'burnt';
        state.grill.splice(state.grill.indexOf(burnt), 1);
        return EVENT_PICKUP;
      }
      if (chef.carrying === 'pattyRaw' && state.grill.length < GRILL_SLOTS) {
        state.grill.push({ item: 'pattyRaw', progress: 0 });
        chef.carrying = null;
        return EVENT_PICKUP;
      }
      return EVENT_ERROR;
    }
    if (station.id === 'assembly') {
      if (chef.carrying && state.plate.length < 5) {
        state.plate.push(chef.carrying);
        chef.carrying = null;
        return EVENT_PICKUP;
      }
      return EVENT_ERROR;
    }
    if (station.id === 'window') {
      const order = matchingOrder(state);
      if (!order || state.plate.length === 0) return EVENT_ERROR;
      const tip = Math.round(10 * (order.patience / order.maxPatience));
      state.coins += order.recipe.price + tip;
      state.served += 1;
      state.plate = [];
      state.orders.splice(state.orders.indexOf(order), 1);
      state.flash = `+${order.recipe.price + tip} koin — ${order.recipe.name} tersaji!`;
      state.flashUntil = state.elapsed + 2.5;
      return EVENT_SERVE;
    }
    if (station.id === 'trash') {
      if (chef.carrying) {
        chef.carrying = null;
        return EVENT_PICKUP;
      }
      if (state.plate.length > 0) {
        state.plate = [];
        return EVENT_PICKUP;
      }
      return EVENT_ERROR;
    }
    return events;
  }

  return {
    state,

    reset() {
      state.chef.x = 640;
      state.chef.y = 480;
      state.chef.carrying = null;
      state.selectedBin = 0;
      state.orders = [];
      state.plate = [];
      state.board = null;
      state.grill = [];
      state.coins = 0;
      state.served = 0;
      state.failed = 0;
      state.hearts = HEARTS;
      state.timeLeft = DAY_SECONDS;
      state.elapsed = 0;
      state.dayOver = false;
      state.won = false;
      state.nextOrderIn = ORDER.firstAfter;
      state.orderCount = 0;
      state.moveTarget = null;
      state.pendingStation = null;
      state.flash = null;
      state.flashUntil = 0;
    },

    /**
     * Advance the world one fixed step. `steer` is {x, y} in -1..1, `press` is
     * a fresh E tap, `held` is E held down, `bin` is a 0-4 pantry pick or -1,
     * `click` is a logical {x, y} click or null. Attract mode (title screen)
     * passes `attract` true: orders still arrive, nothing is lost.
     */
    step(dt, steer, press, held, bin, click, attract) {
      let events = 0;
      const chef = state.chef;

      if (state.dayOver) return events;

      if (bin >= 0 && bin < PANTRY_BINS.length) state.selectedBin = bin;

      // A click walks the chef to a station and interacts on arrival.
      if (click) {
        const hit = Object.values(STATIONS).find((station) => click.x >= station.x
          && click.x <= station.x + station.width
          && click.y >= station.y && click.y <= station.y + station.height + 40);
        if (hit) {
          if (hit.id === 'pantry') {
            const binWidth = hit.width / PANTRY_BINS.length;
            state.selectedBin = Math.min(
              PANTRY_BINS.length - 1,
              Math.max(0, Math.floor((click.x - hit.x) / binWidth)),
            );
          }
          const centre = stationCentre(hit);
          state.moveTarget = { x: centre.x, y: centre.y + 60 };
          state.pendingStation = hit;
        } else {
          state.moveTarget = { x: click.x, y: Math.max(CHEF.floorTop, Math.min(CHEF.floorBottom, click.y)) };
          state.pendingStation = null;
        }
      }

      // Steering: keys win over a click target; any key cancels the walk.
      let move = steer;
      if (state.moveTarget) {
        if (steer.x !== 0 || steer.y !== 0) {
          state.moveTarget = null;
          state.pendingStation = null;
        } else {
          const dx = state.moveTarget.x - chef.x;
          const dy = state.moveTarget.y - chef.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 12) {
            state.moveTarget = null;
            if (state.pendingStation) {
              events |= interact(state.pendingStation);
              state.pendingStation = null;
            }
          } else {
            move = { x: dx / distance, y: dy / distance };
          }
        }
      }

      chef.x = Math.max(CHEF.floorLeft, Math.min(CHEF.floorRight, chef.x + move.x * CHEF.speed * dt));
      chef.y = Math.max(CHEF.floorTop, Math.min(CHEF.floorBottom, chef.y + move.y * CHEF.speed * dt));

      // Chopping advances only while E is held at the board, and finishes
      // exactly once: a chopped item waits on the board when hands are full.
      if (state.board && held) {
        const station = nearestStation(state);
        if (station && station.id === 'board' && state.board.progress < CHOP_SECONDS) {
          state.board.progress += dt;
          if (state.board.progress >= CHOP_SECONDS) {
            state.board.progress = CHOP_SECONDS;
            events |= EVENT_CHOP_DONE;
            if (!chef.carrying) {
              chef.carrying = PREPPED[state.board.item];
              state.board = null;
            }
          }
        }
      }

      // The grill cooks on its own; a patty left too long burns.
      for (const slot of state.grill) {
        const before = slot.progress;
        slot.progress += dt;
        if (before < GRILL_COOK_SECONDS && slot.progress >= GRILL_COOK_SECONDS) {
          events |= EVENT_GRILL_DONE;
        }
      }

      // A fresh E tap interacts with the nearest station.
      if (press) {
        const station = nearestStation(state);
        if (station) events |= interact(station);
      }

      // The clock and the order board.
      state.elapsed += dt;
      state.timeLeft = Math.max(0, DAY_SECONDS - state.elapsed);
      state.nextOrderIn -= dt;
      if (state.nextOrderIn <= 0 && state.orders.length < MAX_ORDERS) {
        spawnOrder();
        const rush = state.elapsed / DAY_SECONDS;
        state.nextOrderIn = ORDER.intervalStart
          + (ORDER.intervalEnd - ORDER.intervalStart) * rush;
      }
      for (let index = state.orders.length - 1; index >= 0; index -= 1) {
        const order = state.orders[index];
        order.patience -= dt;
        if (order.patience <= 0) {
          state.orders.splice(index, 1);
          if (!attract) {
            state.failed += 1;
            state.hearts -= 1;
            state.flash = `Pesanan #${order.id} hangus — pelanggan pulang kecewa.`;
            state.flashUntil = state.elapsed + 2.5;
            events |= EVENT_EXPIRE;
            if (state.hearts <= 0) {
              state.dayOver = true;
              state.won = false;
              events |= EVENT_OVER;
              return events;
            }
          }
        }
      }

      if (state.timeLeft <= 0) {
        state.dayOver = true;
        state.won = state.hearts > 0;
        events |= EVENT_OVER;
      }
      return events;
    },
  };
}
