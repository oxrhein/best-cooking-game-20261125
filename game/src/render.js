// Dapur Kilat's painter: everything is canvas vector art, no image files.
// The kitchen, the order board, the stations, the chef and every screen are
// drawn from the world state each frame.

import {
  CHEF, COOKED_NAMES, DAY_SECONDS, FIELD, FONT, GRILL_BURN_SECONDS,
  GRILL_COOK_SECONDS, INGREDIENTS, PALETTE, PANTRY_BINS, RECIPES, STATIONS,
} from './config.js';
import { matchingOrder, nearestStation } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** Ingredient names for the plate and the tickets. */
export function ingredientLabel(id) {
  if (INGREDIENTS[id]) return INGREDIENTS[id].name;
  return COOKED_NAMES[id] ?? id;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = FIELD.width * dpr;
    canvas.height = FIELD.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  fit();
  window.addEventListener('resize', fit);

  function roundRect(x, y, w, h, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function text(string, x, y, size, color, weight = 700, align = 'left') {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(string, x, y);
  }

  /** One ingredient, drawn at (x, y) with radius `r`. */
  function drawIngredient(id, x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    if (id === 'bun') {
      ctx.fillStyle = INGREDIENTS.bun.color;
      ctx.beginPath();
      ctx.arc(0, -r * 0.15, r, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = INGREDIENTS.bun.dark;
      ctx.fillRect(-r, -r * 0.15, r * 2, r * 0.28);
      ctx.fillStyle = '#f7d9a0';
      ctx.beginPath();
      ctx.arc(-r * 0.4, -r * 0.55, r * 0.12, 0, Math.PI * 2);
      ctx.arc(r * 0.3, -r * 0.7, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'pattyRaw') {
      ctx.fillStyle = INGREDIENTS.pattyRaw.color;
      roundRect(-r, -r * 0.55, r * 2, r * 1.1, r * 0.4);
      ctx.fill();
      ctx.fillStyle = INGREDIENTS.pattyRaw.dark;
      ctx.fillRect(-r * 0.6, -r * 0.2, r * 1.2, r * 0.16);
    } else if (id === 'patty') {
      ctx.fillStyle = '#7a4a21';
      roundRect(-r, -r * 0.5, r * 2, r, r * 0.35);
      ctx.fill();
      ctx.strokeStyle = '#4a2c12';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -r * 0.4);
      ctx.lineTo(r * 0.5, r * 0.4);
      ctx.moveTo(r * 0.5, -r * 0.4);
      ctx.lineTo(-r * 0.5, r * 0.4);
      ctx.stroke();
    } else if (id === 'tomato') {
      ctx.fillStyle = INGREDIENTS.tomato.color;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3f7d2c';
      ctx.beginPath();
      ctx.arc(0, -r * 0.75, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'tomatoCut') {
      ctx.fillStyle = INGREDIENTS.tomato.color;
      ctx.beginPath();
      ctx.arc(-r * 0.45, 0, r * 0.55, 0, Math.PI * 2);
      ctx.arc(r * 0.45, 0, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2a594';
      ctx.beginPath();
      ctx.arc(-r * 0.45, 0, r * 0.3, 0, Math.PI * 2);
      ctx.arc(r * 0.45, 0, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'lettuce') {
      ctx.fillStyle = INGREDIENTS.lettuce.color;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INGREDIENTS.lettuce.dark;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    } else if (id === 'lettuceCut') {
      ctx.strokeStyle = INGREDIENTS.lettuce.color;
      ctx.lineWidth = r * 0.28;
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, -r * 0.4);
      ctx.lineTo(r * 0.8, -r * 0.4);
      ctx.moveTo(-r * 0.8, r * 0.1);
      ctx.lineTo(r * 0.8, r * 0.1);
      ctx.moveTo(-r * 0.8, r * 0.6);
      ctx.lineTo(r * 0.8, r * 0.6);
      ctx.stroke();
    } else if (id === 'cheese') {
      ctx.fillStyle = INGREDIENTS.cheese.color;
      ctx.beginPath();
      ctx.moveTo(-r, r * 0.6);
      ctx.lineTo(r, r * 0.6);
      ctx.lineTo(0, -r * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = INGREDIENTS.cheese.dark;
      ctx.beginPath();
      ctx.arc(-r * 0.25, r * 0.2, r * 0.14, 0, Math.PI * 2);
      ctx.arc(r * 0.3, -r * 0.1, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'burnt') {
      ctx.fillStyle = '#221d1a';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, -r * 0.3);
      ctx.lineTo(r * 0.4, r * 0.3);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRoom(state) {
    // Wall and floor.
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, 0, FIELD.width, 210);
    ctx.fillStyle = PALETTE.wallShadow;
    ctx.fillRect(0, 200, FIELD.width, 10);
    for (let row = 0, y = 210; y < FIELD.height; row += 1, y += 80) {
      for (let col = 0, x = 0; x < FIELD.width; col += 1, x += 80) {
        ctx.fillStyle = (col + row) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        ctx.fillRect(x, y, 80, 80);
      }
    }
    // Rug in the middle of the floor.
    ctx.fillStyle = '#c94f3d';
    roundRect(430, 420, 420, 190, 16);
    ctx.fill();
    ctx.strokeStyle = '#f3dfae';
    ctx.lineWidth = 4;
    roundRect(446, 436, 388, 158, 12);
    ctx.stroke();
  }

  function drawTicket(order, x) {
    const w = 216;
    const h = 78;
    const urgent = order.patience < 15;
    ctx.fillStyle = PALETTE.ticket;
    roundRect(x, 8, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = urgent ? PALETTE.bad : PALETTE.ticketEdge;
    ctx.lineWidth = urgent ? 3 : 2;
    roundRect(x, 8, w, h, 10);
    ctx.stroke();
    text(`#${order.id} ${order.recipe.name}`, x + 10, 24, 14, PALETTE.ink, 800);
    text(`${order.recipe.price} koin`, x + w - 10, 24, 13, PALETTE.good, 800, 'right');
    order.recipe.items.forEach((item, index) => {
      drawIngredient(item, x + 22 + index * 34, 52, 13);
    });
    // Patience bar.
    const frac = Math.max(0, order.patience / order.maxPatience);
    ctx.fillStyle = '#e5d9bd';
    roundRect(x + 10, h - 12, w - 20, 7, 3);
    ctx.fill();
    ctx.fillStyle = frac > 0.5 ? PALETTE.good : frac > 0.25 ? PALETTE.warn : PALETTE.bad;
    if (frac > 0) {
      roundRect(x + 10, h - 12, (w - 20) * frac, 7, 3);
      ctx.fill();
    }
  }

  function drawBoard(state) {
    // Order tickets on the left, day clock and coins on the right.
    state.orders.forEach((order, index) => drawTicket(order, 16 + index * 226));
    const rightX = FIELD.width - 268;
    // Day timer.
    const dayFrac = state.timeLeft / DAY_SECONDS;
    text('SIANG HARI', rightX, 22, 13, PALETTE.muted, 800);
    ctx.fillStyle = '#e5d9bd';
    roundRect(rightX, 32, 252, 12, 6);
    ctx.fill();
    ctx.fillStyle = dayFrac > 0.3 ? '#3f7d5c' : PALETTE.bad;
    roundRect(rightX, 32, 252 * Math.max(0, dayFrac), 12, 6);
    ctx.fill();
    const minutes = Math.floor(state.timeLeft / 60);
    const seconds = Math.floor(state.timeLeft % 60);
    text(`${minutes}:${String(seconds).padStart(2, '0')}`, rightX + 126, 62, 20, PALETTE.ink, 800, 'center');
    // Coins, hearts, served.
    text(`🪙 ${state.coins}`, rightX, 84, 16, '#8a6d1d', 800);
    let hearts = '';
    for (let index = 0; index < 3; index += 1) hearts += index < state.hearts ? '♥ ' : '♡ ';
    text(hearts, rightX + 110, 84, 16, PALETTE.bad, 800);
    text(`tersaji ${state.served}`, rightX + 200, 84, 13, PALETTE.muted, 800);
  }

  function drawStations(state) {
    for (const station of Object.values(STATIONS)) {
      const { x, y, width, height } = station;
      ctx.fillStyle = PALETTE.counterFront;
      roundRect(x, y + 8, width, height, 10);
      ctx.fill();
      ctx.fillStyle = PALETTE.counterTop;
      roundRect(x, y, width, 18, 8);
      ctx.fill();
      text(station.label, x + width / 2, y + height - 12, 13, '#f3dfae', 800, 'center');
    }

    // Pantry: five bins with the ingredients on the counter.
    const pantry = STATIONS.pantry;
    PANTRY_BINS.forEach((id, index) => {
      const binX = pantry.x + 14 + index * 54;
      const selected = state.selectedBin === index;
      ctx.fillStyle = selected ? '#ffe9a8' : PALETTE.steel;
      roundRect(binX, pantry.y + 22, 46, 46, 8);
      ctx.fill();
      ctx.strokeStyle = selected ? '#e08a00' : PALETTE.steelDark;
      ctx.lineWidth = selected ? 3 : 2;
      roundRect(binX, pantry.y + 22, 46, 46, 8);
      ctx.stroke();
      drawIngredient(id, binX + 23, pantry.y + 45, 15);
    });

    // Chopping board: the item being chopped and its progress ring.
    const board = STATIONS.board;
    ctx.fillStyle = PALETTE.boardWood;
    roundRect(board.x + 18, board.y + 22, 100, 52, 8);
    ctx.fill();
    if (state.board) {
      drawIngredient(state.board.item, board.x + 68, board.y + 48, 18);
      const frac = state.board.progress / 1.4;
      ctx.fillStyle = '#e5d9bd';
      roundRect(board.x + 28, board.y + 62, 80, 8, 4);
      ctx.fill();
      ctx.fillStyle = PALETTE.good;
      roundRect(board.x + 28, board.y + 62, 80 * Math.min(1, frac), 8, 4);
      ctx.fill();
    } else {
      ctx.fillStyle = '#8a5a2b';
      ctx.font = `700 22px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('🔪', board.x + 68, board.y + 52);
    }

    // Grill: two slots, cooking bars, a burn warning.
    const grill = STATIONS.grill;
    ctx.fillStyle = PALETTE.grillBody;
    roundRect(grill.x + 14, grill.y + 20, 164, 56, 10);
    ctx.fill();
    for (let slot = 0; slot < 2; slot += 1) {
      const slotX = grill.x + 26 + slot * 82;
      ctx.fillStyle = '#22252c';
      roundRect(slotX, grill.y + 30, 70, 36, 6);
      ctx.fill();
      const item = state.grill[slot];
      if (item) {
        const frac = item.progress / GRILL_COOK_SECONDS;
        ctx.fillStyle = GRILL_BURN_SECONDS - item.progress < 1.5 ? '#ff5a3c' : PALETTE.grillGlow;
        ctx.beginPath();
        ctx.arc(slotX + 35, grill.y + 48, 10 + 4 * Math.min(1, frac), 0, Math.PI * 2);
        ctx.fill();
        drawIngredient(item.progress >= GRILL_COOK_SECONDS ? 'patty' : 'pattyRaw', slotX + 35, grill.y + 48, 13);
        if (item.progress >= GRILL_BURN_SECONDS) {
          text('GOSONG!', slotX + 35, grill.y + 14, 11, '#ff5a3c', 800, 'center');
        }
      }
    }

    // Assembly counter: the plate and everything on it, mid-assembly.
    const assembly = STATIONS.assembly;
    ctx.fillStyle = PALETTE.marble;
    ctx.beginPath();
    ctx.ellipse(assembly.x + 120, assembly.y + 52, 92, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9b98a';
    ctx.lineWidth = 2;
    ctx.stroke();
    state.plate.forEach((item, index) => {
      drawIngredient(item, assembly.x + 60 + index * 30, assembly.y + 44, 13);
    });
    if (state.plate.length === 0) {
      text('piring kosong', assembly.x + 120, assembly.y + 52, 12, PALETTE.muted, 600, 'center');
    }

    // Serving window: warm glow, a bell, and the ready cue.
    const windowStation = STATIONS.window;
    ctx.fillStyle = PALETTE.windowGlow;
    roundRect(windowStation.x + 14, windowStation.y + 20, 160, 52, 8);
    ctx.fill();
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(windowStation.x + 14, windowStation.y + 20, 160, 6);
    text('🔔 SAJIKAN', windowStation.x + 94, windowStation.y + 48, 15, '#6b4423', 800, 'center');

    // Trash can.
    const trash = STATIONS.trash;
    ctx.fillStyle = '#6e7883';
    roundRect(trash.x + 44, trash.y + 26, 40, 48, 6);
    ctx.fill();
    ctx.fillStyle = '#4a5158';
    ctx.fillRect(trash.x + 38, trash.y + 20, 52, 10);
  }

  function drawChef(state, screen) {
    const chef = state.chef;
    const bob = screen === SCREEN_PLAY ? Math.sin(state.elapsed * 8) * 2 : 0;
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(chef.x, chef.y + 26, 26, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body: shirt and apron.
    ctx.fillStyle = PALETTE.chefShirt;
    roundRect(chef.x - 20, chef.y - 6 + bob, 40, 30, 12);
    ctx.fill();
    ctx.fillStyle = PALETTE.chefApron;
    roundRect(chef.x - 14, chef.y + 2 + bob, 28, 22, 8);
    ctx.fill();
    // Head and tall chef hat.
    ctx.fillStyle = PALETTE.chefSkin;
    ctx.beginPath();
    ctx.arc(chef.x, chef.y - 18 + bob, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.chefHat;
    roundRect(chef.x - 15, chef.y - 40 + bob, 30, 16, 6);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(chef.x - 9, chef.y - 38 + bob, 8, 0, Math.PI * 2);
    ctx.arc(chef.x + 9, chef.y - 38 + bob, 8, 0, Math.PI * 2);
    ctx.fill();
    // Eyes.
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    ctx.arc(chef.x - 5, chef.y - 18 + bob, 2, 0, Math.PI * 2);
    ctx.arc(chef.x + 5, chef.y - 18 + bob, 2, 0, Math.PI * 2);
    ctx.fill();
    // Carried ingredient floats above the hat.
    if (chef.carrying) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(chef.x, chef.y - 58 + bob, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d9b96a';
      ctx.lineWidth = 2;
      ctx.stroke();
      drawIngredient(chef.carrying, chef.x, chef.y - 58 + bob, 13);
    }
  }

  function drawPrompt(state, screen) {
    if (screen !== SCREEN_PLAY) return;
    const station = nearestStation(state);
    if (!station) {
      text('WASD / panah — jalan   •   E — pakai stasiun   •   1-5 — pilih bahan   •   klik stasiun — jalan ke sana',
        FIELD.width / 2, FIELD.height - 16, 14, PALETTE.muted, 600, 'center');
      return;
    }
    const chef = state.chef;
    let hint = '';
    if (station.id === 'pantry') hint = chef.carrying ? 'tangan penuh!' : `E — ambil ${ingredientLabel(PANTRY_BINS[state.selectedBin])} (1-5 ganti bahan)`;
    else if (station.id === 'board') hint = state.board ? 'tahan E — potong!'
      : (chef.carrying && INGREDIENTS[chef.carrying] && INGREDIENTS[chef.carrying].prep !== 'chop'
        ? 'bahan ini tidak perlu dipotong — bawa ke meja rakit'
        : 'E — taruh bahan di talenan');
    else if (station.id === 'grill') hint = 'E — panggang / angkat daging';
    else if (station.id === 'assembly') hint = chef.carrying ? 'E — taruh di piring' : 'bawa bahan ke sini untuk merakit';
    else if (station.id === 'window') hint = matchingOrderHint(state);
    else if (station.id === 'trash') hint = 'E — buang';
    // The hint lives in a pill at the bottom, clear of the stations and the chef.
    ctx.fillStyle = 'rgba(43,33,24,0.85)';
    ctx.font = `700 14px ${FONT}`;
    const pillWidth = ctx.measureText(hint).width + 36;
    roundRect(FIELD.width / 2 - pillWidth / 2, FIELD.height - 44, pillWidth, 32, 16);
    ctx.fill();
    text(hint, FIELD.width / 2, FIELD.height - 27, 14, '#ffe9a8', 700, 'center');
  }

  function matchingOrderHint(state) {
    if (state.plate.length === 0) return 'piring masih kosong';
    const order = matchingOrder(state);
    return order ? `E — sajikan ${order.recipe.name}!` : 'piring ini belum cocok dengan pesanan';
  }

  function drawFlash(state) {
    if (!state.flash || state.elapsed > state.flashUntil) return;
    // Just below the station row, clear of the tickets and the counters.
    ctx.fillStyle = 'rgba(43,33,24,0.85)';
    roundRect(FIELD.width / 2 - 260, 204, 520, 34, 10);
    ctx.fill();
    text(state.flash, FIELD.width / 2, 222, 15, '#ffe9a8', 700, 'center');
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(43,33,24,0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = '#fff8e6';
    roundRect(290, 130, 700, 420, 20);
    ctx.fill();
    ctx.strokeStyle = '#d9b96a';
    ctx.lineWidth = 3;
    roundRect(290, 130, 700, 420, 20);
    ctx.stroke();
    text('🍳 DAPUR KILAT', 640, 196, 52, '#c94f3d', 900, 'center');
    text('Masak cepat, sajikan tepat waktu!', 640, 240, 20, PALETTE.muted, 600, 'center');
    const lines = [
      'Terima pesanan dari papan order, ambil bahan di counter,',
      'potong di talenan, panggang daging di panggangan,',
      'rakit di piring, lalu sajikan di jendela sebelum pelanggan pergi.',
      '',
      'WASD / panah — jalan      E — pakai stasiun (tahan untuk memotong)',
      '1-5 — pilih bahan      klik stasiun — jalan ke sana      P — jeda',
      '',
      'Daging gosong kalau kelamaan di panggangan. Bertahanlah sampai',
      'siang berakhir — hati habis berarti dapur tutup!',
    ];
    lines.forEach((line, index) => {
      text(line, 640, 282 + index * 26, 16, PALETTE.ink, line === '' ? 400 : 600, 'center');
    });
    text('Tekan SPASI / klik untuk mulai', 640, 512, 18, PALETTE.good, 800, 'center');
    if (best > 0) text(`Koin terbanyak: ${best}`, 640, 540, 14, PALETTE.muted, 700, 'center');
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(43,33,24,0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text('JEDA', FIELD.width / 2, FIELD.height / 2 - 20, 56, '#fff8e6', 900, 'center');
    text('Tekan P atau Spasi untuk lanjut', FIELD.width / 2, FIELD.height / 2 + 30, 18, '#fff8e6', 600, 'center');
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(43,33,24,0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = '#fff8e6';
    roundRect(340, 170, 600, 330, 20);
    ctx.fill();
    ctx.strokeStyle = '#d9b96a';
    ctx.lineWidth = 3;
    roundRect(340, 170, 600, 330, 20);
    ctx.stroke();
    if (state.won) {
      text('🎉 SIANG BERAKHIR!', 640, 230, 40, PALETTE.good, 900, 'center');
      text('Dapur selamat — semua pelanggan pulang kenyang.', 640, 272, 17, PALETTE.muted, 600, 'center');
    } else {
      text('😖 DAPUR TUTUP', 640, 230, 40, PALETTE.bad, 900, 'center');
      text('Terlalu banyak pelanggan pergi kecewa.', 640, 272, 17, PALETTE.muted, 600, 'center');
    }
    text(`Koin: ${state.coins}`, 640, 322, 24, PALETTE.ink, 800, 'center');
    text(`Pesanan tersaji: ${state.served}   •   hangus: ${state.failed}`, 640, 358, 17, PALETTE.muted, 600, 'center');
    text(`Koin terbanyak: ${Math.max(best, state.coins)}`, 640, 392, 15, PALETTE.muted, 700, 'center');
    text('Tekan SPASI / klik untuk main lagi', 640, 446, 18, PALETTE.good, 800, 'center');
  }

  return {
    draw(state, screen, best) {
      ctx.clearRect(0, 0, FIELD.width, FIELD.height);
      drawRoom(state);
      drawBoard(state);
      drawStations(state);
      drawChef(state, screen);
      drawPrompt(state, screen);
      drawFlash(state);
      if (screen === SCREEN_TITLE) drawTitle(state, best);
      else if (screen === SCREEN_PAUSED) drawPaused();
      else if (screen === SCREEN_OVER) drawOver(state, best);
    },
  };
}
