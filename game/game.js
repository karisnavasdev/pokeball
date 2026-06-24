(() => {
  "use strict";

  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
      const r = typeof radii === "number" ? radii : 4;
      this.moveTo(x + r, y);
      this.arcTo(x + w, y, x + w, y + h, r);
      this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r);
      this.arcTo(x, y, x + w, y, r);
      this.closePath();
    };
  }

  const STORAGE = {
    coins: "pokeball_coins",
    owned: "pokeball_owned",
    equipped: "pokeball_equipped",
  };

  const BALL_CATALOG = [
    { id: "classic", name: "POKEBALL", price: 0, damage: 1, effect: "spark", color: "#ee1b24", accent: "#fff", desc: "Spark crack — breaks block below on hit" },
    { id: "great", name: "GREAT BALL", price: 150, damage: 2, effect: "cross", color: "#2563eb", accent: "#bfdbfe", desc: "2× damage + cross smash (4 directions)" },
    { id: "ultra", name: "ULTRA BALL", price: 400, damage: 3, effect: "column", color: "#f59e0b", accent: "#1f2937", desc: "3× damage + shatters full column" },
    { id: "fire", name: "FIRE BALL", price: 500, damage: 1, effect: "blast", blast: 2, color: "#ff4500", accent: "#ffcc00", desc: "Fire blast destroys 2×2 blocks" },
    { id: "thunder", name: "THUNDER BALL", price: 600, damage: 1, effect: "chain", color: "#facc15", accent: "#1e1b4b", desc: "Chain lightning hits all neighbors" },
    { id: "ice", name: "ICE BALL", price: 650, damage: 1, effect: "row", color: "#22d3ee", accent: "#e0f2fe", desc: "Shatters an entire row" },
    { id: "poison", name: "POISON BALL", price: 550, damage: 1, effect: "poison", color: "#a855f7", accent: "#4ade80", desc: "Poisons blocks around impact" },
    { id: "ghost", name: "GHOST BALL", price: 700, damage: 1, effect: "pierce", pierce: 3, color: "#d1d5db", accent: "#6b7280", desc: "Pierces through 3 blocks" },
    { id: "steel", name: "STEEL BALL", price: 800, damage: 2, effect: "steel", color: "#94a3b8", accent: "#e2e8f0", desc: "2× damage + horizontal line crash" },
    { id: "dragon", name: "DRAGON BALL", price: 1200, damage: 2, effect: "blast", blast: 3, color: "#dc2626", accent: "#fbbf24", desc: "Dragon blast destroys 3×3 blocks" },
    { id: "master", name: "MASTER BALL", price: 2500, damage: 3, effect: "master", blast: 2, color: "#8b5cf6", accent: "#f472b6", desc: "3× damage + 2×2 mega blast" },
  ];

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("start-btn");
  const scoreEl = document.getElementById("score");
  const levelEl = document.getElementById("level");
  const livesEl = document.getElementById("lives");
  const coinsEl = document.getElementById("coins");
  const shopBtn = document.getElementById("shop-btn");
  const shopFromMenu = document.getElementById("shop-from-menu");
  const shopPanel = document.getElementById("shop-panel");
  const shopClose = document.getElementById("shop-close");
  const shopGrid = document.getElementById("shop-grid");
  const shopCoinsEl = document.getElementById("shop-coins");
  const nftBtn = document.getElementById("nft-btn");
  const nftPanel = document.getElementById("nft-collection-panel");
  const nftClose = document.getElementById("nft-close");
  const nftRewardModal = document.getElementById("nft-reward-modal");

  const W = canvas.width;
  const H = canvas.height;
  const PADDLE_Y = H - 36;
  const PADDLE_H = 14;

  const BRICK_COLS = 8;
  const BRICK_ROWS = 7;
  const BRICK_PAD = 4;
  const BRICK_TOP = 64;
  const BRICK_H = 24;

  const COLORS = [
    { fill: "#ff4757", glow: "#ff6b81", pts: 50, name: "FIRE" },
    { fill: "#ffa502", glow: "#ffc048", pts: 40, name: "ELEC" },
    { fill: "#3742fa", glow: "#5352ed", pts: 40, name: "WATER" },
    { fill: "#2ed573", glow: "#7bed9f", pts: 30, name: "GRASS" },
    { fill: "#a55eea", glow: "#d68fff", pts: 60, name: "PSY" },
    { fill: "#ff6b81", glow: "#ff9ff3", pts: 35, name: "FAIRY" },
  ];

  const POWER_TYPES = ["wide", "multiball", "slow", "life"];

  const ballImg = new Image();
  let ballImgReady = false;
  ballImg.onload = () => { ballImgReady = true; };
  ballImg.onerror = () => { ballImgReady = false; };
  ballImg.src = "ball.png";

  const keys = {};
  let pointerX = W / 2;

  function loadOwned() {
    try {
      const raw = localStorage.getItem(STORAGE.owned);
      const list = raw ? JSON.parse(raw) : ["classic"];
      return new Set(list.length ? list : ["classic"]);
    } catch {
      return new Set(["classic"]);
    }
  }

  function loadEquipped() {
    const id = localStorage.getItem(STORAGE.equipped) || "classic";
    return BALL_CATALOG.some((b) => b.id === id) ? id : "classic";
  }

  function loadCoins() {
    const n = parseInt(localStorage.getItem(STORAGE.coins) || "0", 10);
    return Number.isFinite(n) ? n : 0;
  }

  function saveWallet() {
    localStorage.setItem(STORAGE.coins, String(wallet.coins));
    localStorage.setItem(STORAGE.owned, JSON.stringify([...wallet.owned]));
    localStorage.setItem(STORAGE.equipped, wallet.equipped);
  }

  const wallet = {
    coins: loadCoins(),
    owned: loadOwned(),
    equipped: loadEquipped(),
  };

  function getBallDef(id) {
    return BALL_CATALOG.find((b) => b.id === id) || BALL_CATALOG[0];
  }

  const state = {
    running: false,
    shopOpen: false,
    nftOpen: false,
    score: 0,
    sessionCoins: 0,
    level: 1,
    lives: 3,
    paddle: { x: W / 2 - 50, w: 100, wide: 0 },
    balls: [],
    bricks: [],
    particles: [],
    powerups: [],
    trails: [],
    ballAttached: true,
    shake: 0,
  };

  function brickWidth() {
    return (W - BRICK_PAD * (BRICK_COLS + 1)) / BRICK_COLS;
  }

  function resetPaddle() {
    state.paddle.w = state.paddle.wide > 0 ? 148 : 104;
    state.paddle.x = W / 2 - state.paddle.w / 2;
  }

  function makeBall(x, y, attached = false) {
    const def = getBallDef(wallet.equipped);
    return {
      x, y,
      r: 16,
      vx: 0,
      vy: 0,
      speed: 5 + state.level * 0.12,
      attached,
      spin: 0,
      ballId: def.id,
      pierceLeft: def.effect === "pierce" ? (def.pierce || 2) : 0,
      dead: false,
    };
  }

  function paddleBallY() {
    return PADDLE_Y - 16 - 4;
  }

  function resetBall() {
    const x = state.paddle.x + state.paddle.w / 2;
    state.balls = [makeBall(x, paddleBallY(), true)];
    state.ballAttached = true;
  }

  function buildLevel(lvl) {
    const bricks = [];
    const bw = brickWidth();
    const rows = Math.min(BRICK_ROWS + Math.floor((lvl - 1) / 2), 9);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        if (lvl > 2 && (r + c + lvl) % 11 === 0) continue;
        const type = COLORS[(r + c + lvl) % COLORS.length];
        const hp = r < 2 && lvl >= 4 ? 2 : 1;
        bricks.push({
          x: BRICK_PAD + c * (bw + BRICK_PAD),
          y: BRICK_TOP + r * (BRICK_H + BRICK_PAD),
          w: bw,
          h: BRICK_H,
          row: r,
          col: c,
          hp,
          maxHp: hp,
          ...type,
        });
      }
    }
    state.bricks = bricks;
  }

  function spawnParticles(x, y, color, n = 12) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.5 + Math.random() * 5;
      state.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1,
        color,
        size: 2 + Math.random() * 4,
      });
    }
  }

  function addCoins(n) {
    state.sessionCoins += n;
    wallet.coins += n;
    saveWallet();
    updateHud();
  }

  function maybeDropPower(x, y) {
    if (Math.random() > 0.2) return;
    const type = POWER_TYPES[Math.floor(Math.random() * POWER_TYPES.length)];
    state.powerups.push({ x, y, vy: 2.4, type, w: 30, h: 16 });
  }

  function launchBall() {
    if (!state.ballAttached) return;
    state.ballAttached = false;
    state.balls.forEach((b) => {
      if (!b.attached) return;
      b.attached = false;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.45;
      b.vx = Math.cos(angle) * b.speed;
      b.vy = Math.sin(angle) * b.speed;
    });
  }

  function addScore(n) {
    state.score += n;
    scoreEl.textContent = state.score;
  }

  function updateHud() {
    scoreEl.textContent = state.score;
    levelEl.textContent = state.level;
    livesEl.textContent = state.lives;
    coinsEl.textContent = wallet.coins;
    if (shopCoinsEl) shopCoinsEl.textContent = wallet.coins;
  }

  function levelComplete() {
    state.level++;
    state.paddle.wide = Math.max(0, state.paddle.wide - 60);
    resetPaddle();
    buildLevel(state.level);
    resetBall();
    updateHud();
    flashMessage(`LEVEL ${state.level}`);
  }

  function loseLife() {
    state.lives--;
    updateHud();
    state.balls = [];
    state.powerups = [];
    if (state.lives <= 0) {
      gameOver();
      return;
    }
    resetPaddle();
    resetBall();
    flashMessage("LIFE LOST");
  }

  function gameOver() {
    state.running = false;
    showNftReward("end", () => {
      overlay.classList.remove("hidden");
      overlay.querySelector("h1").textContent = "GAME OVER";
      overlay.querySelector("p").textContent = `Score: ${state.score} · +${state.sessionCoins} coins`;
      startBtn.textContent = "Play Again";
    });
  }

  function winGame() {
    state.running = false;
    showNftReward("end", () => {
      overlay.classList.remove("hidden");
      overlay.querySelector("h1").textContent = "YOU WIN!";
      overlay.querySelector("p").textContent = `Champion! Score: ${state.score} · +${state.sessionCoins} coins`;
      startBtn.textContent = "Play Again";
    });
  }

  let flashText = "";
  let flashTimer = 0;
  function flashMessage(msg) {
    flashText = msg;
    flashTimer = 90;
  }

  function refreshNftUi() {
    if (!window.PokeNft) return;
    PokeNft.renderGallery(document.getElementById("nft-gallery-game"), { compact: true });
    PokeNft.renderGallery(document.getElementById("nft-gallery-collection"));
    PokeNft.updateCollectCount(document.getElementById("nft-count-game"));
    PokeNft.updateCollectCount(document.getElementById("nft-count-modal"));
  }

  function showNftReward(phase, onDone) {
    if (!window.PokeNft) {
      onDone();
      return;
    }
    const { card, isNew } = PokeNft.grantReward();
    const title = phase === "start" ? "Start Game Reward!" : "End Game Reward!";
    const sub = isNew
      ? `New NFT unlocked — ${card.name}!`
      : `${card.name} added to your collection!`;
    PokeNft.showRewardModal(nftRewardModal, card, title, sub, () => {
      refreshNftUi();
      onDone();
    });
  }

  function beginGameplay() {
    state.running = true;
    state.score = 0;
    state.sessionCoins = 0;
    state.level = 1;
    state.lives = 3;
    state.paddle.wide = 0;
    state.particles = [];
    state.powerups = [];
    state.trails = [];
    resetPaddle();
    buildLevel(1);
    resetBall();
    updateHud();
    overlay.classList.add("hidden");
    overlay.querySelector("h1").textContent = "POKEBALL BREAKER";
    overlay.querySelector("p").textContent = "Break all blocks with your POKEBALL!";
    startBtn.textContent = "Start Game";
    setTimeout(() => {
      if (state.running && state.ballAttached) launchBall();
    }, 900);
  }

  function startGame() {
    if (state.shopOpen) closeShop();
    if (state.nftOpen) closeNft();
    showNftReward("start", beginGameplay);
  }

  function circleRect(cx, cy, cr, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy < cr * cr;
  }

  function bricksInBlast(center, size) {
    const bw = brickWidth();
    const stepX = bw + BRICK_PAD;
    const stepY = BRICK_H + BRICK_PAD;
    const cx = center.x + center.w / 2;
    const cy = center.y + center.h / 2;
    const halfW = (size * stepX) / 2;
    const halfH = (size * stepY) / 2;
    return state.bricks.filter((b) => !b.dead &&
      b.x + b.w / 2 >= cx - halfW && b.x + b.w / 2 <= cx + halfW &&
      b.y + b.h / 2 >= cy - halfH && b.y + b.h / 2 <= cy + halfH);
  }

  function bricksInRow(brick) {
    const y = brick.y;
    return state.bricks.filter((b) => !b.dead && Math.abs(b.y - y) < 2);
  }

  function adjacentBricks(brick) {
    const pad = BRICK_PAD + 2;
    return state.bricks.filter((b) => {
      if (b.dead || b === brick) return false;
      const touchX = brick.x <= b.x + b.w + pad && brick.x + brick.w + pad >= b.x;
      const touchY = brick.y <= b.y + b.h + pad && brick.y + brick.h + pad >= b.y;
      return touchX && touchY;
    });
  }

  function cardinalNeighbors(brick) {
    const cx = brick.x + brick.w / 2;
    const cy = brick.y + brick.h / 2;
    const pad = BRICK_PAD + 2;
    return state.bricks.filter((b) => {
      if (b.dead || b === brick) return false;
      const bx = b.x + b.w / 2;
      const by = b.y + b.h / 2;
      const sameCol = Math.abs(bx - cx) < brick.w * 0.6;
      const sameRow = Math.abs(by - cy) < brick.h * 0.6;
      const touchX = brick.x <= b.x + b.w + pad && brick.x + brick.w + pad >= b.x;
      const touchY = brick.y <= b.y + b.h + pad && brick.y + brick.h + pad >= b.y;
      return (sameCol || sameRow) && touchX && touchY;
    });
  }

  function bricksInColumn(brick) {
    const cx = brick.x + brick.w / 2;
    return state.bricks.filter((b) => !b.dead && b !== brick &&
      Math.abs(b.x + b.w / 2 - cx) < brick.w * 0.6);
  }

  function brickBelow(brick) {
    const cx = brick.x + brick.w / 2;
    const below = state.bricks
      .filter((b) => !b.dead && b !== brick &&
        Math.abs(b.x + b.w / 2 - cx) < brick.w * 0.6 && b.y > brick.y)
      .sort((a, b) => a.y - b.y);
    return below[0] || null;
  }

  function horizontalNeighbors(brick) {
    const cy = brick.y + brick.h / 2;
    const pad = BRICK_PAD + 2;
    return state.bricks.filter((b) => {
      if (b.dead || b === brick) return false;
      const sameRow = Math.abs(b.y + b.h / 2 - cy) < brick.h * 0.6;
      const touchX = brick.x <= b.x + b.w + pad && brick.x + brick.w + pad >= b.x;
      return sameRow && touchX;
    });
  }

  function destroyBrick(brick, ballDef, applySpecial) {
    if (brick.dead) return;
    brick.hp -= ballDef.damage || 1;

    if (ballDef.effect === "poison") {
      adjacentBricks(brick).forEach((b) => {
        b.hp -= 1;
        spawnParticles(b.x + b.w / 2, b.y + b.h / 2, "#a855f7", 6);
        if (b.hp <= 0) destroyBrick(b, { damage: 0 }, false);
      });
    }

    if (brick.hp > 0) {
      spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, "#ffffff", 4);
      state.shake = 3;
      return;
    }
    brick.dead = true;
    addScore(brick.pts);
    addCoins(Math.max(1, Math.floor(brick.pts / 8)));
    spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.glow, 18);
    maybeDropPower(brick.x + brick.w / 2, brick.y + brick.h / 2);
    state.shake = 7;
    if (!applySpecial) return;

    const effect = ballDef.effect;
    if (effect === "spark") {
      const below = brickBelow(brick);
      if (below) destroyBrick(below, { damage: 1 }, false);
      spawnParticles(brick.x + brick.w / 2, brick.y + brick.h, ballDef.color, 10);
    }
    if (effect === "cross") {
      cardinalNeighbors(brick).forEach((b) => destroyBrick(b, { damage: 1 }, false));
      spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, ballDef.color, 16);
    }
    if (effect === "column") {
      bricksInColumn(brick).forEach((b) => destroyBrick(b, { damage: 1 }, false));
      spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, ballDef.color, 24);
    }
    if (effect === "steel") {
      horizontalNeighbors(brick).forEach((b) => destroyBrick(b, { damage: 1 }, false));
      spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, "#94a3b8", 18);
    }
    if (effect === "blast" || effect === "master") {
      const size = ballDef.blast || 2;
      bricksInBlast(brick, size).forEach((b) => {
        if (b !== brick) destroyBrick(b, { damage: effect === "master" ? 2 : 1 }, false);
      });
      spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, ballDef.color, 28);
    }
    if (effect === "chain") {
      adjacentBricks(brick).forEach((b) => destroyBrick(b, { damage: 1 }, false));
      spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, "#facc15", 22);
    }
    if (effect === "row") {
      bricksInRow(brick).forEach((b) => {
        if (b !== brick) destroyBrick(b, { damage: 1 }, false);
      });
      spawnParticles(brick.x + brick.w / 2, brick.y, "#22d3ee", 30);
    }
  }

  function resolveBrickHit(ball, brick) {
    const def = getBallDef(ball.ballId);
    const pierce = def.effect === "pierce" && ball.pierceLeft > 0;

    if (!pierce) {
      const overlapL = ball.x + ball.r - brick.x;
      const overlapR = brick.x + brick.w - (ball.x - ball.r);
      const overlapT = ball.y + ball.r - brick.y;
      const overlapB = brick.y + brick.h - (ball.y - ball.r);
      const minO = Math.min(overlapL, overlapR, overlapT, overlapB);
      if (minO === overlapL) { ball.x = brick.x - ball.r - 0.5; ball.vx = -Math.abs(ball.vx); }
      else if (minO === overlapR) { ball.x = brick.x + brick.w + ball.r + 0.5; ball.vx = Math.abs(ball.vx); }
      else if (minO === overlapT) { ball.y = brick.y - ball.r - 0.5; ball.vy = -Math.abs(ball.vy); }
      else { ball.y = brick.y + brick.h + ball.r + 0.5; ball.vy = Math.abs(ball.vy); }
    } else {
      ball.pierceLeft--;
    }

    destroyBrick(brick, def, true);

    if (def.effect === "steel") {
      const spd = Math.hypot(ball.vx, ball.vy);
      if (spd < ball.speed) {
        const scale = ball.speed / (spd || 1);
        ball.vx *= scale;
        ball.vy *= scale;
      }
    }
  }

  function moveBall(ball) {
    if (ball.attached) {
      ball.x = state.paddle.x + state.paddle.w / 2;
      ball.y = paddleBallY();
      return;
    }

    const steps = 3;
    for (let s = 0; s < steps; s++) {
      ball.x += ball.vx / steps;
      ball.y += ball.vy / steps;
      ball.spin += 0.2;

      if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
      if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
      if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }

      if (ball.vy > 0 && circleRect(ball.x, ball.y, ball.r, state.paddle.x, PADDLE_Y, state.paddle.w, PADDLE_H)) {
        const hit = (ball.x - (state.paddle.x + state.paddle.w / 2)) / (state.paddle.w / 2);
        const angle = hit * 0.9;
        const spd = Math.max(Math.hypot(ball.vx, ball.vy), ball.speed);
        ball.vx = Math.sin(angle) * spd;
        ball.vy = -Math.abs(Math.cos(angle) * spd);
        ball.y = PADDLE_Y - ball.r - 1;
        const def = getBallDef(ball.ballId);
        if (def.effect === "pierce") ball.pierceLeft = def.pierce || 2;
        state.shake = 4;
        spawnParticles(ball.x, ball.y + ball.r, def.color, 6);
      }

      let hitBrick = false;
      for (const brick of state.bricks) {
        if (brick.dead) continue;
        if (!circleRect(ball.x, ball.y, ball.r, brick.x, brick.y, brick.w, brick.h)) continue;
        resolveBrickHit(ball, brick);
        hitBrick = true;
        break;
      }
      if (hitBrick) continue;
    }

    const def = getBallDef(ball.ballId);
    state.trails.push({ x: ball.x, y: ball.y, life: 1, ballId: ball.ballId });
    if (ball.y - ball.r > H + 20) ball.dead = true;
  }

  function update() {
    if (!state.running) return;

    if (state.paddle.wide > 0) state.paddle.wide--;
    state.paddle.w = state.paddle.wide > 0 ? 148 : 104;

    let move = 0;
    if (keys.ArrowLeft || keys.a || keys.A) move -= 1;
    if (keys.ArrowRight || keys.d || keys.D) move += 1;
    state.paddle.x += move * 8;
    if (pointerX != null) {
      state.paddle.x += (pointerX - (state.paddle.x + state.paddle.w / 2)) * 0.28;
    }
    state.paddle.x = Math.max(4, Math.min(W - state.paddle.w - 4, state.paddle.x));

    state.balls.forEach(moveBall);

    const alive = state.balls.filter((b) => !b.dead);
    if (alive.length === 0 && !state.ballAttached) loseLife();
    else state.balls = alive;

    state.powerups.forEach((p) => {
      p.y += p.vy;
      if (p.y > H) { p.dead = true; return; }
      if (p.x > state.paddle.x && p.x < state.paddle.x + state.paddle.w &&
          p.y + p.h > PADDLE_Y && p.y < PADDLE_Y + PADDLE_H) {
        p.dead = true;
        applyPower(p.type);
        spawnParticles(p.x, p.y, "#14f195", 14);
      }
    });
    state.powerups = state.powerups.filter((p) => !p.dead);

    state.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= 0.028;
    });
    state.particles = state.particles.filter((p) => p.life > 0);

    state.trails.forEach((t) => { t.life -= 0.08; });
    state.trails = state.trails.filter((t) => t.life > 0).slice(-50);

    if (state.bricks.length && state.bricks.every((b) => b.dead)) {
      if (state.level >= 10) winGame();
      else levelComplete();
    }

    if (state.shake > 0) state.shake *= 0.82;
    if (flashTimer > 0) flashTimer--;
  }

  function applyPower(type) {
    switch (type) {
      case "wide":
        state.paddle.wide = 420;
        break;
      case "multiball": {
        const src = state.balls.find((b) => !b.attached && !b.dead);
        if (!src) break;
        for (let i = 0; i < 2; i++) {
          const b = makeBall(src.x, src.y);
          const a = Math.atan2(src.vy, src.vx) + (i ? 0.55 : -0.55);
          b.vx = Math.cos(a) * src.speed;
          b.vy = Math.sin(a) * src.speed;
          state.balls.push(b);
        }
        state.ballAttached = false;
        break;
      }
      case "slow":
        state.balls.forEach((b) => {
          b.vx *= 0.75;
          b.vy *= 0.75;
          b.speed = Math.max(4, b.speed * 0.88);
        });
        break;
      case "life":
        state.lives++;
        updateHud();
        break;
    }
  }

  function drawRoundedRect(x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function drawStyledBall(x, y, r, spin, def) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin);

    const isClassic = def.id === "classic" && ballImgReady && ballImg.naturalWidth;
    if (isClassic) {
      ctx.shadowColor = def.color;
      ctx.shadowBlur = 16;
      ctx.drawImage(ballImg, -r, -r, r * 2, r * 2);
    } else {
      ctx.shadowColor = def.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI, false);
      ctx.fillStyle = def.color;
      ctx.fill();
      ctx.strokeStyle = def.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.lineTo(r, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = def.accent;
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();

      if (def.id === "fire" || def.id === "dragon" || def.effect === "master") {
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
        ctx.strokeStyle = "#ff6600";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (def.effect === "thunder") {
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-4, -r - 2);
        ctx.lineTo(2, -2);
        ctx.lineTo(-2, -2);
        ctx.lineTo(4, r + 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function draw() {
    try {
      const shakeX = (Math.random() - 0.5) * state.shake;
      const shakeY = (Math.random() - 0.5) * state.shake;
      ctx.save();
      ctx.translate(shakeX, shakeY);

      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#14142a");
      grad.addColorStop(1, "#06060e");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = "rgba(153, 69, 255, 0.12)";
      for (let x = 0; x < W; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }

      state.bricks.forEach((brick) => {
        if (brick.dead) return;
        ctx.globalAlpha = brick.hp < brick.maxHp ? 0.75 : 1;
        ctx.shadowColor = brick.glow;
        ctx.shadowBlur = 10;
        drawRoundedRect(brick.x, brick.y, brick.w, brick.h, 5, brick.fill, "rgba(255,255,255,0.25)");
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.font = "bold 8px Orbitron, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(brick.name, brick.x + brick.w / 2, brick.y + brick.h / 2 + 3);
        if (brick.hp > 1) {
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.fillRect(brick.x + 4, brick.y + brick.h - 5, brick.w - 8, 3);
        }
      });

      const pg = ctx.createLinearGradient(state.paddle.x, PADDLE_Y, state.paddle.x + state.paddle.w, PADDLE_Y);
      pg.addColorStop(0, "#9945ff");
      pg.addColorStop(0.5, "#14f195");
      pg.addColorStop(1, "#9945ff");
      ctx.shadowColor = "#14f195";
      ctx.shadowBlur = 16;
      drawRoundedRect(state.paddle.x, PADDLE_Y, state.paddle.w, PADDLE_H, 7, pg, "rgba(255,255,255,0.3)");
      ctx.shadowBlur = 0;

      state.powerups.forEach((p) => {
        const colors = { wide: "#3742fa", multiball: "#ff4757", slow: "#2ed573", life: "#ffa502" };
        const labels = { wide: "WIDE", multiball: "x2", slow: "SLOW", life: "+1" };
        drawRoundedRect(p.x - p.w / 2, p.y, p.w, p.h, 4, colors[p.type], "#fff");
        ctx.fillStyle = "#fff";
        ctx.font = "bold 8px Orbitron, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(labels[p.type], p.x, p.y + 11);
      });

      state.trails.forEach((t) => {
        ctx.globalAlpha = t.life * 0.35;
        drawStyledBall(t.x, t.y, 8, 0, getBallDef(t.ballId || wallet.equipped));
        ctx.globalAlpha = 1;
      });

      state.balls.forEach((ball) => {
        drawStyledBall(ball.x, ball.y, ball.r, ball.spin, getBallDef(ball.ballId));
      });

      state.particles.forEach((p) => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      const equipped = getBallDef(wallet.equipped);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "600 9px Orbitron, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(equipped.name, 8, H - 8);

      if (flashTimer > 0) {
        ctx.fillStyle = `rgba(20, 241, 149, ${Math.min(1, flashTimer / 60)})`;
        ctx.font = "bold 24px Orbitron, sans-serif";
        ctx.textAlign = "center";
        ctx.shadowColor = "#14f195";
        ctx.shadowBlur = 20;
        ctx.fillText(flashText, W / 2, H / 2);
        ctx.shadowBlur = 0;
      }

      if (state.ballAttached && state.running) {
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = "600 13px Space Grotesk, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("TAP or SPACE to launch", W / 2, PADDLE_Y - 28);
      }

      ctx.restore();
    } catch (err) {
      console.error("POKEBALL draw error:", err);
    }
  }

  function powerTags(ball) {
    const tags = [];
    if (ball.damage > 1) tags.push(`<span class="tag tag-dmg">${ball.damage}× DMG</span>`);
    const map = {
      spark: '<span class="tag tag-spark">SPARK</span>',
      cross: '<span class="tag tag-cross">CROSS</span>',
      column: '<span class="tag tag-col">COLUMN</span>',
      blast: `<span class="tag tag-fire">${ball.blast}×${ball.blast} BLAST</span>`,
      master: '<span class="tag tag-fire">MEGA BLAST</span>',
      chain: '<span class="tag tag-zap">CHAIN</span>',
      row: '<span class="tag tag-ice">ROW</span>',
      poison: '<span class="tag tag-poison">POISON</span>',
      pierce: '<span class="tag tag-ghost">PIERCE</span>',
      steel: '<span class="tag tag-steel">LINE CRASH</span>',
    };
    if (map[ball.effect]) tags.push(map[ball.effect]);
    return tags.join("");
  }

  function renderShop() {
    shopGrid.innerHTML = "";
    BALL_CATALOG.forEach((ball) => {
      const owned = wallet.owned.has(ball.id);
      const equipped = wallet.equipped === ball.id;
      const card = document.createElement("article");
      card.className = "shop-card" + (equipped ? " shop-card--equipped" : "");
      card.innerHTML = `
        <div class="shop-ball-preview" style="--ball-color:${ball.color};--ball-accent:${ball.accent}"></div>
        <h3>${ball.name}</h3>
        <p>${ball.desc}</p>
        <div class="shop-card-meta">${powerTags(ball)}</div>
      `;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "shop-action";
      if (equipped) {
        btn.textContent = "Equipped";
        btn.disabled = true;
      } else if (owned) {
        btn.textContent = "Equip";
        btn.addEventListener("click", () => equipBall(ball.id));
      } else if (wallet.coins >= ball.price) {
        btn.textContent = `Buy ${ball.price}`;
        btn.addEventListener("click", () => buyBall(ball.id));
      } else {
        btn.textContent = `Need ${ball.price}`;
        btn.disabled = true;
      }
      card.appendChild(btn);
      shopGrid.appendChild(card);
    });
    shopCoinsEl.textContent = wallet.coins;
  }

  function buyBall(id) {
    const ball = getBallDef(id);
    if (wallet.owned.has(id) || wallet.coins < ball.price) return;
    wallet.coins -= ball.price;
    wallet.owned.add(id);
    wallet.equipped = id;
    saveWallet();
    updateHud();
    renderShop();
    flashMessage(`${ball.name} UNLOCKED!`);
  }

  function equipBall(id) {
    if (!wallet.owned.has(id)) return;
    wallet.equipped = id;
    saveWallet();
    updateHud();
    renderShop();
    if (state.running && state.ballAttached) resetBall();
  }

  function openShop() {
    state.shopOpen = true;
    shopPanel.classList.remove("hidden");
    shopPanel.setAttribute("aria-hidden", "false");
    renderShop();
  }

  function closeShop() {
    state.shopOpen = false;
    shopPanel.classList.add("hidden");
    shopPanel.setAttribute("aria-hidden", "true");
  }

  function openNft() {
    if (state.running) return;
    state.nftOpen = true;
    refreshNftUi();
    nftPanel.classList.remove("hidden");
    nftPanel.setAttribute("aria-hidden", "false");
  }

  function closeNft() {
    state.nftOpen = false;
    nftPanel.classList.add("hidden");
    nftPanel.setAttribute("aria-hidden", "true");
  }

  function isModalOpen() {
    return state.shopOpen || state.nftOpen ||
      (nftRewardModal && !nftRewardModal.classList.contains("hidden"));
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape") {
      if (state.shopOpen) { closeShop(); return; }
      if (state.nftOpen) { closeNft(); return; }
    }
    keys[e.key] = true;
    if (e.code === "Space") {
      e.preventDefault();
      if (isModalOpen()) return;
      if (!state.running) return;
      if (state.ballAttached) launchBall();
    }
  });
  window.addEventListener("keyup", (e) => { keys[e.key] = false; });

  canvas.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    pointerX = ((e.clientX - rect.left) / rect.width) * W;
  });
  canvas.addEventListener("pointerdown", (e) => {
    const rect = canvas.getBoundingClientRect();
    pointerX = ((e.clientX - rect.left) / rect.width) * W;
    if (isModalOpen() || !state.running) return;
    if (state.ballAttached) launchBall();
  });

  startBtn.addEventListener("click", startGame);
  shopBtn.addEventListener("click", openShop);
  shopFromMenu.addEventListener("click", openShop);
  shopClose.addEventListener("click", closeShop);
  nftBtn?.addEventListener("click", openNft);
  nftClose?.addEventListener("click", closeNft);

  updateHud();
  renderShop();
  refreshNftUi();
  loop();
})();
