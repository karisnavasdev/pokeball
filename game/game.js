(() => {
  "use strict";

  // Safari / older browser support
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

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("start-btn");
  const scoreEl = document.getElementById("score");
  const levelEl = document.getElementById("level");
  const livesEl = document.getElementById("lives");

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

  const state = {
    running: false,
    score: 0,
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
    return {
      x, y,
      r: 16,
      vx: 0,
      vy: 0,
      speed: 5 + state.level * 0.12,
      attached,
      spin: 0,
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
    overlay.classList.remove("hidden");
    overlay.querySelector("h1").textContent = "GAME OVER";
    overlay.querySelector("p").textContent = `Score: ${state.score} · Level ${state.level}`;
    startBtn.textContent = "Play Again";
  }

  function winGame() {
    state.running = false;
    overlay.classList.remove("hidden");
    overlay.querySelector("h1").textContent = "YOU WIN!";
    overlay.querySelector("p").textContent = `Champion! Score: ${state.score}`;
    startBtn.textContent = "Play Again";
  }

  let flashText = "";
  let flashTimer = 0;
  function flashMessage(msg) {
    flashText = msg;
    flashTimer = 90;
  }

  function startGame() {
    state.running = true;
    state.score = 0;
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

  function circleRect(cx, cy, cr, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy < cr * cr;
  }

  function resolveBrickHit(ball, brick) {
    const overlapL = ball.x + ball.r - brick.x;
    const overlapR = brick.x + brick.w - (ball.x - ball.r);
    const overlapT = ball.y + ball.r - brick.y;
    const overlapB = brick.y + brick.h - (ball.y - ball.r);
    const minO = Math.min(overlapL, overlapR, overlapT, overlapB);
    if (minO === overlapL) { ball.x = brick.x - ball.r - 0.5; ball.vx = -Math.abs(ball.vx); }
    else if (minO === overlapR) { ball.x = brick.x + brick.w + ball.r + 0.5; ball.vx = Math.abs(ball.vx); }
    else if (minO === overlapT) { ball.y = brick.y - ball.r - 0.5; ball.vy = -Math.abs(ball.vy); }
    else { ball.y = brick.y + brick.h + ball.r + 0.5; ball.vy = Math.abs(ball.vy); }

    brick.hp--;
    if (brick.hp <= 0) {
      brick.dead = true;
      addScore(brick.pts);
      spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.glow, 18);
      maybeDropPower(brick.x + brick.w / 2, brick.y + brick.h / 2);
      state.shake = 7;
    } else {
      spawnParticles(ball.x, ball.y, "#ffffff", 4);
      state.shake = 3;
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
        state.shake = 4;
        spawnParticles(ball.x, ball.y + ball.r, "#14f195", 6);
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

    state.trails.push({ x: ball.x, y: ball.y, life: 1 });
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
    state.trails = state.trails.filter((t) => t.life > 0).slice(-40);

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

  function drawPokeball(x, y, r, spin = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin);
    if (ballImgReady && ballImg.naturalWidth) {
      ctx.shadowColor = "rgba(255, 60, 60, 0.7)";
      ctx.shadowBlur = 16;
      ctx.drawImage(ballImg, -r, -r, r * 2, r * 2);
    } else {
      ctx.shadowColor = "rgba(255, 60, 60, 0.5)";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI, false);
      ctx.fillStyle = "#ee1b24";
      ctx.fill();
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.lineTo(r, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
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
      drawPokeball(t.x, t.y, 8, 0);
      ctx.globalAlpha = 1;
    });

    state.balls.forEach((ball) => {
      drawPokeball(ball.x, ball.y, ball.r, ball.spin);
    });

    state.particles.forEach((p) => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

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
      ctx.fillText("TAP or SPACE to launch POKEBALL", W / 2, PADDLE_Y - 28);
    }

    ctx.restore();
    } catch (err) {
      console.error("POKEBALL draw error:", err);
    }
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (e.code === "Space") {
      e.preventDefault();
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
    if (!state.running) return;
    if (state.ballAttached) launchBall();
  });

  startBtn.addEventListener("click", startGame);
  loop();
})();
