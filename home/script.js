/* =========================================================
   1. PERLIN NOISE (mini implementazione, no dipendenze)
   ========================================================= */
class PerlinNoise {
  constructor(seed = Math.random()) {
    this.p = new Uint8Array(512);
    const perm = [];
    for (let i = 0; i < 256; i++) perm[i] = i;

    let s = seed * 10000;
    const rand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };

    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    for (let i = 0; i < 512; i++) this.p[i] = perm[i & 255];
  }

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  lerp(a, b, t) {
    return a + t * (b - a);
  }

  grad(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
  }

  perlin2(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const p = this.p;
    const A = p[X] + Y;
    const B = p[X + 1] + Y;

    return this.lerp(
      this.lerp(
        this.grad(p[A], x, y),
        this.grad(p[B], x - 1, y),
        u
      ),
      this.lerp(
        this.grad(p[A + 1], x, y - 1),
        this.grad(p[B + 1], x - 1, y - 1),
        u
      ),
      v
    );
  }
}

/* =========================================================
   2. WEB COMPONENT <a-waves>
   ========================================================= */
class AWaves extends HTMLElement {
  connectedCallback() {
    this.svg = this.querySelector('.js-svg');
    if (!this.svg) return;

    this.mouse = {
      x: -10, y: 0, lx: 0, ly: 0,
      sx: 0, sy: 0, v: 0, vs: 0, a: 0, set: false,
    };

    this.lines = [];
    this.paths = [];
    this.noise = new PerlinNoise(Math.random());

    // bind una sola volta → niente nuove funzioni ad ogni frame
    this._tick = this.tick.bind(this);
    this._onResize = this.onResize.bind(this);
    this._onMouseMove = this.onMouseMove.bind(this);
    this._onTouchMove = this.onTouchMove.bind(this);

    this.setSize();
    this.setLines();
    this.bindEvents();

    this._running = true;
    requestAnimationFrame(this._tick);
  }

  disconnectedCallback() {
    this._running = false;
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('mousemove', this._onMouseMove);
    this.removeEventListener('touchmove', this._onTouchMove);
  }

  bindEvents() {
    window.addEventListener('resize', this._onResize);
    window.addEventListener('mousemove', this._onMouseMove);
    this.addEventListener('touchmove', this._onTouchMove, { passive: false });
  }

  onResize() {
    this.setSize();
    this.setLines();
  }

  onMouseMove(e) {
    this.updateMousePosition(e.clientX, e.clientY);
  }

  onTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    this.updateMousePosition(touch.clientX, touch.clientY);
  }

  updateMousePosition(x, y) {
    const { mouse } = this;
    mouse.x = x - this.bounding.left;
    mouse.y = y - this.bounding.top;

    if (!mouse.set) {
      mouse.sx = mouse.x;
      mouse.sy = mouse.y;
      mouse.lx = mouse.x;
      mouse.ly = mouse.y;
      mouse.set = true;
    }
  }

  setSize() {
    this.bounding = this.getBoundingClientRect();
    this.svg.style.width = this.bounding.width + 'px';
    this.svg.style.height = this.bounding.height + 'px';
  }

  setLines() {
    const { width, height } = this.bounding;

    this.lines = [];
    this.paths.forEach((p) => p.remove());
    this.paths = [];

    // spaziatura adattiva: meno linee su schermi molto grandi
    const isLarge = width > 2000;
    const xGap = isLarge ? 20 : 12;
    const yGap = isLarge ? 40 : 28;

    const oWidth = width + 200;
    const oHeight = height + 30;
    const totalLines = Math.ceil(oWidth / xGap);
    const totalPoints = Math.ceil(oHeight / yGap);
    const xStart = (width - xGap * totalLines) / 2;
    const yStart = (height - yGap * totalPoints) / 2;

    for (let i = 0; i <= totalLines; i++) {
      const points = [];
      for (let j = 0; j <= totalPoints; j++) {
        points.push({
          x: xStart + xGap * i,
          y: yStart + yGap * j,
          wave: { x: 0, y: 0 },
          cursor: { x: 0, y: 0, vx: 0, vy: 0 },
        });
      }

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      this.svg.appendChild(path);
      this.paths.push(path);
      this.lines.push(points);
    }
  }

  movePoints(time) {
    const { lines, mouse, noise } = this;

    lines.forEach((points) => {
      points.forEach((p) => {
        const move = noise.perlin2(
          (p.x + time * 0.0125) * 0.002,
          (p.y + time * 0.005) * 0.0015
        ) * 12;

        p.wave.x = Math.cos(move) * 14;
        p.wave.y = Math.sin(move) * 8;

        const dx = p.x - mouse.sx;
        const dy = p.y - mouse.sy;
        const d = Math.hypot(dx, dy);
        const l = Math.max(175, mouse.vs);

        if (d < l) {
          const s = 1 - d / l;
          const f = Math.cos(d * 0.001) * s;
          p.cursor.vx += Math.cos(mouse.a) * f * l * mouse.vs * 0.00065;
          p.cursor.vy += Math.sin(mouse.a) * f * l * mouse.vs * 0.00065;
        }

        p.cursor.vx += (0 - p.cursor.x) * 0.005;
        p.cursor.vy += (0 - p.cursor.y) * 0.005;
        p.cursor.vx *= 0.925;
        p.cursor.vy *= 0.925;
        p.cursor.x += p.cursor.vx * 2;
        p.cursor.y += p.cursor.vy * 2;
        p.cursor.x = Math.min(100, Math.max(-100, p.cursor.x));
        p.cursor.y = Math.min(100, Math.max(-100, p.cursor.y));
      });
    });
  }

  moved(point, withCursorForce = true) {
    const x = point.x + point.wave.x + (withCursorForce ? point.cursor.x : 0);
    const y = point.y + point.wave.y + (withCursorForce ? point.cursor.y : 0);
    return {
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
    };
  }

  drawLines() {
    const { lines, paths } = this;

    lines.forEach((points, lIndex) => {
      let d = '';
      points.forEach((p) => {
        const pt = this.moved(p, true);
        d += (d === '' ? 'M ' : 'L ') + pt.x + ' ' + pt.y + ' ';
      });
      paths[lIndex].setAttribute('d', d);
    });
  }

  tick(time) {
    if (!this._running) return;

    const { mouse } = this;

    mouse.sx += (mouse.x - mouse.sx) * 0.1;
    mouse.sy += (mouse.y - mouse.sy) * 0.1;

    const dx = mouse.x - mouse.lx;
    const dy = mouse.y - mouse.ly;
    const d = Math.hypot(dx, dy);

    mouse.v = d;
    mouse.vs += (d - mouse.vs) * 0.1;
    mouse.vs = Math.min(100, mouse.vs);

    mouse.lx = mouse.x;
    mouse.ly = mouse.y;
    mouse.a = Math.atan2(dy, dx);

    this.movePoints(time);
    this.drawLines();

    requestAnimationFrame(this._tick);
  }
}

customElements.define('a-waves', AWaves);

/* =========================================================
   3. FIT-TO-WIDTH per le righe della citazione
   ========================================================= */
function fitQuoteLines() {
  const lines = document.querySelectorAll('.quote-line');
  if (!lines.length) return;

  let minRatio = Infinity;

  lines.forEach((line) => {
    line.style.fontSize = '100px';

    // forza reflow prima di misurare
    void line.offsetHeight;

    const cs = getComputedStyle(line);
    const paddingX =
      parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const available = line.clientWidth - paddingX - 4;
    const text = line.scrollWidth;

    if (text > 0) {
      const ratio = available / text;
      if (ratio < minRatio) minRatio = ratio;
    }
  });

  if (minRatio !== Infinity) {
    const size = 100 * minRatio;
    lines.forEach((line) => (line.style.fontSize = size + 'px'));
  }
}

let resizeTimer;
function scheduleFit() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(fitQuoteLines, 60);
}

window.addEventListener('load', fitQuoteLines);
window.addEventListener('resize', scheduleFit);

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(fitQuoteLines);
}

/* =========================================================
   4. CURSORE PERSONALIZZATO († ruotato a nord-ovest)
   ========================================================= */
(function initCursor() {
  const cursor = document.querySelector('.custom-cursor');
  if (!cursor) return;

  // se il dispositivo non ha hover (touch) o l'utente preferisce
  // ridurre le animazioni, non attiviamo il cursore custom
  const noHover = window.matchMedia('(hover: none)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (noHover || reduceMotion) return;

  let x = 0, y = 0;
  let cx = 0, cy = 0;
  let hasMoved = false;

  window.addEventListener('mousemove', (e) => {
    x = e.clientX;
    y = e.clientY;
    if (!hasMoved) {
      cx = x;
      cy = y;
      hasMoved = true;
    }
  });

  function loop() {
    cx += (x - cx) * 0.25;
    cy += (y - cy) * 0.25;
    cursor.style.transform =
      `translate(${cx}px, ${cy}px) translate(-50%, -50%) rotate(135deg)`;
    requestAnimationFrame(loop);
  }
  loop();

  document.querySelectorAll('a, button, .nav-link').forEach((el) => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
  });
})();