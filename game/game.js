(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("start-btn");
  const scoreEl = document.getElementById("score");
  const levelEl = document.getElementById("level");
  const livesEl = document.getElementById("lives");

  const W = canvas.width;
  const H = canvas.height;

  const BRICK_COLS = 8;
  const BRICK_ROWS = 7;
  const BRICK_PAD = 4;
  const BRICK_TOP = 72;
  const BRICK_H = 22;

  const COLORS = [
  { fill: "#ff4757", glow: "#ff6b81", pts: 50 },   // fire
  { fill: "#ffa502", glow: "#ffc048", pts: 40 },   // electric
  { fill: "#3742fa", glow: "#5352ed", pts: 40 },   // water
  { fill: "#2ed573", glow: "#7bed9f", pts: 30 },   // grass
  { fill: "#a55eea", glow: "#d68fff", pts: 60 },   // psychic
  { fill: "#ff6b81", glow: "#ff9ff3", pts: 35 },   // fairy
  ];

  const POWER_TYPES = ["wide", "multiball", "slow", "life"];

  const ballImg = new Image();
  ballImg.src = "/game/ball.png";

  const keys = {};
  let pointerX = W / 2;

  const state = {
    running: false,
    paused: false,
    score: 0,
    level: 1,
    lives: 3,
    paddle: { x: W / 2 - 50, w: 100, h: 14, wide: 0 },
    balls: [],
    bricks: [],
    particles: [],
    powerups: [],
    ballAttached: true,
    shake: 0,
  };

  function brickWidth() {
    return (W - BRICK_PAD * (BRICK_COLS + 1)) / BRICK_COLS;
  }

  function resetPaddle() {
    state.paddle.w = state.paddle.wide > 0 ? 140 : 100;
    state.paddle.x = W / 2 - state.paddle.w / 2;
  }

  function makeBall(x, y, attached = false) {
    return {
      x, y,
      r: 11,
      vx: 0,
      vy: 0,
      speed: 5.2 + state.level * 0.15,
      attached,
    };
  }

  function resetBall() {
    state.balls = [makeBall(state.paddle.x + state.paddle.w / 2, H - 48, true)];
    state.ballAttached = true;
  }

  function buildLevel(lvl) {
    const bricks = [];
    const bw = brickWidth();
    const rows = Math.min(BRICK_ROWS + Math.floor((lvl - 1) / 2), 10);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        if (lvl > 2 && Math.random() < 0.06) continue;
        const type = COLORS[(r + c + lvl) % COLORS.length];
        const hp = r < 2 && lvl >= 3 ? 2 : 1;
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

  function spawnParticles(x, y, color, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 4;
      state.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  function maybeDropPower(x, y) {
    if (Math.random() > 0.18) return;
    const type = POWER_TYPES[Math.floor(Math.random() * POWER_TYPES.length)];
    state.powerups.push({ x, y, vy: 2.2, type, w: 28, h: 14 });
  }

  function launchBall() {
    if (!state.ballAttached) return;
    state.ballAttached = false;
    state.balls.forEach((b) => {
      if (!b.attached) return;
      b.attached = false;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
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
    state.paddle.wide = Math.max(0, state.paddle.wide - 1);
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
    overlay.querySelector("p").textContent = `Final score: ${state.score} · Level ${state.level}`;
    startBtn.textContent = "Play Again";
  }

  function winGame() {
    state.running = false;
    overlay.classList.remove("hidden");
    overlay.querySelector("h1").textContent = "YOU WIN!";
    overlay.querySelector("p").textContent = `Champion score: ${state.score}`;
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
    state.paused = false;
    state.score = 0;
    state.level = 1;
    state.lives = 3;
    state.paddle.wide = 0;
    state.particles = [];
    state.powerups = [];
    resetPaddle();
    buildLevel(1);
    resetBall();
    updateHud();
    overlay.classList.add("hidden");
    overlay.querySelector("h1").textContent = "POKEBALL BREAKER";
    overlay.querySelector("p").textContent = "Break all blocks. Catch power-ups. Don't drop the ball.";
    startBtn.textContent = "Start Game";
  }

  function circleRect(cx, cy, cr, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy < cr * cr;
  }

  function update() {
    if (!state.running || state.paused) return;

    if (state.paddle.wide > 0) state.paddle.wide--;
    const targetW = state.paddle.wide > 0 ? 140 : 100;
    state.paddle.w = targetW;

    let move = 0;
    if (keys.ArrowLeft || keys.a) move -= 1;
    if (keys.ArrowRight || keys.d) move += 1;
    state.paddle.x += move * 7.5;
    state.paddle.x = Math.max(4, Math.min(W - state.paddle.w - 4, state.paddle.x));

    if (pointerX != null) {
      state.paddle.x += (pointerX - (state.paddle.x + state.paddle.w / 2)) * 0.22;
      state.paddle.x = Math.max(4, Math.min(W - state.paddle.w - 4, state.paddle.x));
    }

    state.balls.forEach((ball) => {
      if (ball.attached) {
        ball.x = state.paddle.x + state.paddle.w / 2;
        ball.y = state.paddle.y - ball.r - 2;
        return;
      }

      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx *= -1; }
      if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx *= -1; }
      if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy *= -1; }

      const py = H - 36;
      if (ball.vy > 0 && circleRect(ball.x, ball.y, ball.r, state.paddle.x, py, state.paddle.w, state.paddle.h)) {
        const hit = (ball.x - (state.paddle.x + state.paddle.w / 2)) / (state.paddle.w / 2);
        const angle = hit * 0.85;
        const spd = Math.hypot(ball.vx, ball.vy) || ball.speed;
        ball.vx = Math.sin(angle) * spd;
        ball.vy = -Math.abs(Math.cos(angle) * spd);
        ball.y = py - ball.r - 1;
        state.shake = 4;
      }

      if (ball.y - ball.r > H) {
        ball.dead = true;
      }

      state.bricks.forEach((brick) => {
        if (brick.dead) return;
        if (!circleRect(ball.x, ball.y, ball.r, brick.x, brick.y, brick.w, brick.h)) return;
        const overlapL = ball.x + ball.r - brick.x;
        const overlapR = brick.x + brick.w - (ball.x - ball.r);
        const overlapT = ball.y + ball.r - brick.y;
        const overlapB = brick.y + brick.h - (ball.y - ball.r);
        const minO = Math.min(overlapL, overlapR, overlapT, overlapB);
        if (minO === overlapL || minO === overlapR) ball.vx *= -1;
        else ball.vy *= -1;
        brick.hp--;
        if (brick.hp <= 0) {
          brick.dead = true;
          addScore(brick.pts);
          spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.glow, 14);
          maybeDropPower(brick.x + brick.w / 2, brick.y + brick.h / 2);
          state.shake = 6;
        } else {
          state.shake = 2;
        }
      });
    });

    const alive = state.balls.filter((b) => !b.dead);
    if (alive.length === 0 && !state.ballAttached) loseLife();
    else state.balls = alive;

    state.powerups.forEach((p) => {
      p.y += p.vy;
      if (p.y > H) { p.dead = true; return; }
      const py = H - 36;
      if (p.x > state.paddle.x && p.x < state.paddle.x + state.paddle.w &&
          p.y + p.h > py && p.y < py + state.paddle.h) {
        p.dead = true;
        applyPower(p.type);
        spawnParticles(p.x, p.y, "#14f195", 12);
      }
    });
    state.powerups = state.powerups.filter((p) => !p.dead);

    state.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.life -= 0.03;
    });
    state.particles = state.particles.filter((p) => p.life > 0);

    if (state.bricks.every((b) => b.dead)) {
      if (state.level >= 12) winGame();
      else levelComplete();
    }

    if (state.shake > 0) state.shake *= 0.85;
    if (flashTimer > 0) flashTimer--;
  }

  function applyPower(type) {
    switch (type) {
      case "wide":
        state.paddle.wide = 480;
        break;
      case "multiball": {
        const src = state.balls.find((b) => !b.attached && !b.dead) || state.balls[0];
        if (!src) break;
        for (let i = 0; i < 2; i++) {
          const b = makeBall(src.x, src.y);
          const a = Math.atan2(src.vy, src.vx) + (i ? 0.5 : -0.5);
          b.vx = Math.cos(a) * src.speed;
          b.vy = Math.sin(a) * src.speed;
          state.balls.push(b);
        }
        break;
      }
      case "slow":
        state.balls.forEach((b) => {
          b.vx *= 0.82;
          b.vy *= 0.82;
          b.speed *= 0.9;
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
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function draw() {
    const shakeX = (Math.random() - 0.5) * state.shake;
    const shakeY = (Math.random() - 0.5) * state.shake;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#12121f");
    grad.addColorStop(1, "#080810");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(153, 69, 255, 0.15)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    state.bricks.forEach((brick) => {
      if (brick.dead) return;
      ctx.globalAlpha = brick.hp < brick.maxHp ? 0.7 : 1;
      ctx.shadowColor = brick.glow;
      ctx.shadowBlur = 8;
      drawRoundedRect(brick.x, brick.y, brick.w, brick.h, 4, brick.fill, "rgba(255,255,255,0.2)");
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      if (brick.hp > 1) {
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillRect(brick.x + 4, brick.y + brick.h / 2 - 1, brick.w - 8, 2);
      }
    });

    const py = H - 36;
    const pg = ctx.createLinearGradient(state.paddle.x, py, state.paddle.x + state.paddle.w, py);
    pg.addColorStop(0, "#9945ff");
    pg.addColorStop(0.5, "#14f195");
    pg.addColorStop(1, "#9945ff");
    ctx.shadowColor = "#14f195";
    ctx.shadowBlur = 14;
    drawRoundedRect(state.paddle.x, py, state.paddle.w, state.paddle.h, 7, pg);
    ctx.shadowBlur = 0;

    state.powerups.forEach((p) => {
      const colors = { wide: "#3742fa", multiball: "#ff4757", slow: "#2ed573", life: "#ffa502" };
      const labels = { wide: "W", multiball: "M", slow: "S", life: "+" };
      drawRoundedRect(p.x - p.w / 2, p.y, p.w, p.h, 4, colors[p.type], "#fff");
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Orbitron, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(labels[p.type], p.x, p.y + 11);
    });

    state.balls.forEach((ball) => {
      if (ballImg.complete && ballImg.naturalWidth) {
        ctx.shadowColor = "rgba(255, 80, 80, 0.6)";
        ctx.shadowBlur = 12;
        ctx.drawImage(ballImg, ball.x - ball.r, ball.y - ball.r, ball.r * 2, ball.r * 2);
        ctx.shadowBlur = 0;
      } else {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fillStyle = "#ff4757";
        ctx.fill();
      }
    });

    state.particles.forEach((p) => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.globalAlpha = 1;
    });

    if (flashTimer > 0) {
      ctx.fillStyle = `rgba(20, 241, 149, ${flashTimer / 120})`;
      ctx.font = "bold 22px Orbitron, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(flashText, W / 2, H / 2);
    }

    if (state.ballAttached && state.running) {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "12px Space Grotesk, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SPACE to launch", W / 2, H - 58);
    }

    ctx.restore();
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
  canvas.addEventListener("pointerdown", () => {
    if (state.running && state.ballAttached) launchBall();
  });

  startBtn.addEventListener("click", startGame);
  loop();
})();
