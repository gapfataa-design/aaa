var Point = (function () {
  function Point(x, y) {
    this.x = (typeof x !== 'undefined') ? x : 0;
    this.y = (typeof y !== 'undefined') ? y : 0;
  }
  Point.prototype.clone = function () {
    return new Point(this.x, this.y);
  };
  return Point;
})();

const canvas = document.getElementById('heartCanvas');
const ctx = canvas.getContext('2d');

const PARTICLE_COUNT = 2300;
const particles = [];
const pointer = { x: null, y: null, active: false };

let elapsed = 0;
let clickWave = 0;

function sampleHeart(t, radiusScale) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = -(
    13 * Math.cos(t) -
    5 * Math.cos(2 * t) -
    2 * Math.cos(3 * t) -
    Math.cos(4 * t)
  );
  return new Point(x * radiusScale, y * radiusScale);
}

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const t = Math.random() * Math.PI * 2;
  const isOutline = i % 3 === 0;
  const radiusScale = isOutline
    ? 0.91 + Math.random() * 0.09
    : 0.18 + Math.pow(Math.random(), 0.52) * 0.76;

  const target = sampleHeart(t, radiusScale);
  const hemisphere = target.x < 0 ? -1 : 1;

  particles.push({
    target,
    hemisphere,
    pos: new Point(
      (Math.random() - 0.5) * 520,
      215 + (Math.random() - 0.5) * 44
    ),
    vel: new Point(0, 0),
    baseSize: isOutline ? 1.1 + Math.random() * 1.9 : 0.7 + Math.random() * 1.4,
    brightness: 0.35 + Math.random() * 0.65,
    phase: Math.random() * Math.PI * 2,
    orbitSpeed: 0.7 + Math.random() * 1.4
  });
}

function updatePointer(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * canvas.width;
  pointer.y = ((clientY - rect.top) / rect.height) * canvas.height;
  pointer.active = true;
}

canvas.addEventListener('pointermove', (e) => updatePointer(e.clientX, e.clientY));
canvas.addEventListener('pointerleave', () => {
  pointer.active = false;
});
canvas.addEventListener('click', () => {
  clickWave = 1;
});

function drawFloorBed(cx, baseY, progress) {
  const bedAlpha = Math.max(0.18, 0.75 * (1 - progress * 0.65));
  const grad = ctx.createRadialGradient(cx, baseY, 8, cx, baseY, 240);
  grad.addColorStop(0, `rgba(180, 242, 255, ${bedAlpha * 0.55})`);
  grad.addColorStop(0.45, `rgba(56, 189, 248, ${bedAlpha * 0.28})`);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, baseY, 240, 34, 0, 0, Math.PI * 2);
  ctx.fill();
}

function render() {
  requestAnimationFrame(render);

  elapsed += 0.016;
  clickWave = Math.max(0, clickWave - 0.014);

  // Rastro sutil para estelas suaves
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.45;
  const floorY = canvas.height * 0.81;

  // Ascenso inicial desde la cama inferior
  const rise = Math.min(1, elapsed / 2.8);
  const riseEase = 1 - Math.pow(1 - rise, 3);

  drawFloorBed(cx, floorY, riseEase);

  // Ciclo continuo: corazón sólido -> separación en dos remolinos -> reunión
  const cycleTime = elapsed % 15;
  let splitStrength = 0;
  if (cycleTime > 5.8 && cycleTime < 10.2) {
    const local = (cycleTime - 5.8) / 4.4;
    splitStrength = Math.sin(local * Math.PI);
  }

  const pulse = 1 + 0.045 * Math.sin(elapsed * 3.1);
  const heartScale = 16.5 * pulse;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = particles[i];

    let goalX = p.target.x * heartScale;
    let goalY = p.target.y * heartScale;

    // División en dos lóbulos/remolinos laterales y vuelta al centro
    if (splitStrength > 0.001) {
      const swirl = p.phase + elapsed * p.orbitSpeed * 1.9;
      const lobeOffsetX = p.hemisphere * (125 + Math.abs(p.target.x) * 6.2);
      const lobeOffsetY = p.target.y * 9.5;
      goalX = lobeOffsetX + Math.cos(swirl) * 42 * splitStrength;
      goalY = lobeOffsetY + Math.sin(swirl) * 38 * splitStrength;
    }

    if (clickWave > 0.001) {
      const burstAngle = p.phase + elapsed * 2.5;
      goalX += p.hemisphere * 140 * clickWave + Math.cos(burstAngle) * 55 * clickWave;
      goalY += Math.sin(burstAngle) * 55 * clickWave;
    }

    const bedX = p.hemisphere * 145 + p.target.x * 14 + Math.sin(p.phase + elapsed) * 18;
    const bedY = 205 + Math.cos(p.phase + elapsed * 1.4) * 14;

    const finalGoalX = bedX + (goalX - bedX) * riseEase;
    const finalGoalY = bedY + (goalY - bedY) * riseEase;

    p.vel.x = (p.vel.x + (finalGoalX - p.pos.x) * 0.052) * 0.83;
    p.vel.y = (p.vel.y + (finalGoalY - p.pos.y) * 0.052) * 0.83;

    p.pos.x += p.vel.x;
    p.pos.y += p.vel.y;

    let drawX = cx + p.pos.x;
    let drawY = cy + p.pos.y;

    // Repulsión suave al mover el mouse sobre el corazón
    if (pointer.active) {
      const dx = drawX - pointer.x;
      const dy = drawY - pointer.y;
      const dist = Math.hypot(dx, dy);
      const maxDist = 95;
      if (dist < maxDist && dist > 0.01) {
        const push = ((maxDist - dist) / maxDist) * 28;
        drawX += (dx / dist) * push;
        drawY += (dy / dist) * push;
      }
    }

    const shimmer = 0.55 + 0.45 * Math.sin(elapsed * 4.2 + p.phase);
    const alpha = Math.min(1, p.brightness * shimmer * (0.3 + 0.7 * riseEase));

    // Núcleo más blanco-cian cerca del centro del corazón
    const distFromCenter = Math.hypot(p.target.x, p.target.y);
    const isCore = distFromCenter < 7.5 && splitStrength < 0.35;
    const color = isCore
      ? `rgba(220, 248, 255, ${alpha.toFixed(3)})`
      : `rgba(82, 206, 255, ${alpha.toFixed(3)})`;

    ctx.beginPath();
    ctx.arc(drawX, drawY, p.baseSize, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // Halo luminoso central
  const aura = ctx.createRadialGradient(cx, cy, 12, cx, cy, 230);
  aura.addColorStop(0, 'rgba(125, 211, 252, 0.16)');
  aura.addColorStop(0.55, 'rgba(14, 165, 233, 0.06)');
  aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

render();