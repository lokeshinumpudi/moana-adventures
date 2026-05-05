/**
 * First-run controls + mechanics overlay. Auto-shows once per browser
 * (gated by localStorage flag) and can be re-opened with `?` or `H`.
 *
 * Self-contained — injects its own DOM and CSS. To wire in Game:
 *
 *   import { Onboarding } from './components/Onboarding.js';
 *   this.onboarding = new Onboarding(this);
 *   if (this.onboarding.shouldShowOnLoad()) this.onboarding.show();
 */
const STORAGE_KEY = 'moana:onboarded:v1';

const STYLE_ID = 'moana-onboarding-style';
const CSS = `
.mw-onboard {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(ellipse at center, rgba(8,16,30,0.78) 0%, rgba(4,8,16,0.92) 100%);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  color: #f0f4ff;
  animation: mw-fade-in 240ms ease-out;
  padding: 24px;
}
@keyframes mw-fade-in { from { opacity: 0; } to { opacity: 1; } }
.mw-onboard__panel {
  width: min(880px, 100%);
  max-height: calc(100vh - 48px);
  overflow: auto;
  background: linear-gradient(160deg, rgba(20,32,52,0.96), rgba(12,20,38,0.96));
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 18px;
  padding: 28px clamp(20px, 4vw, 36px);
  box-shadow: 0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(120,170,255,0.06) inset;
}
.mw-onboard__title {
  font-size: clamp(22px, 3vw, 30px);
  font-weight: 700; letter-spacing: -0.01em;
  margin: 0 0 4px;
  background: linear-gradient(110deg, #f0f4ff 30%, #6cb6ff 60%, #f0f4ff 90%);
  -webkit-background-clip: text; background-clip: text;
  color: transparent;
}
.mw-onboard__sub {
  margin: 0 0 18px; opacity: 0.7; font-size: 14px;
}
.mw-onboard__cols {
  display: grid; gap: 18px;
  grid-template-columns: 1fr 1fr;
}
@media (max-width: 720px) {
  .mw-onboard__cols { grid-template-columns: 1fr; }
}
.mw-onboard__col {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 16px 18px;
}
.mw-onboard__col h3 {
  margin: 0 0 12px; font-size: 13px; letter-spacing: 0.08em;
  text-transform: uppercase; opacity: 0.65; font-weight: 600;
}
.mw-onboard__col.mw--active {
  border-color: rgba(108,182,255,0.45);
  background: rgba(60,120,200,0.08);
  box-shadow: 0 0 0 1px rgba(108,182,255,0.25), 0 8px 30px rgba(60,120,200,0.18);
}
.mw-row { display: flex; align-items: center; gap: 12px; padding: 6px 0; }
.mw-row + .mw-row { border-top: 1px dashed rgba(255,255,255,0.05); }
.mw-row__keys { display: flex; gap: 4px; flex-shrink: 0; min-width: 100px; }
.mw-key {
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 12px; font-weight: 600;
  padding: 4px 8px; border-radius: 6px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-bottom-width: 2px;
  box-shadow: 0 1px 0 rgba(255,255,255,0.04);
  color: #f0f4ff; min-width: 22px; text-align: center;
}
.mw-row__desc { font-size: 14px; line-height: 1.4; opacity: 0.9; }
.mw-mech {
  margin-top: 18px; padding: 14px 18px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
}
.mw-mech h3 {
  margin: 0 0 10px; font-size: 13px; letter-spacing: 0.08em;
  text-transform: uppercase; opacity: 0.65; font-weight: 600;
}
.mw-mech ul { margin: 0; padding-left: 18px; line-height: 1.55; font-size: 14px; }
.mw-mech li { margin: 4px 0; opacity: 0.9; }
.mw-mech b { color: #6cb6ff; font-weight: 600; }
.mw-onboard__footer {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 22px; gap: 16px; flex-wrap: wrap;
}
.mw-onboard__hint { font-size: 12px; opacity: 0.55; }
.mw-onboard__cta {
  appearance: none; border: none; cursor: pointer;
  font-family: inherit; font-size: 15px; font-weight: 600;
  padding: 10px 22px; border-radius: 10px;
  background: linear-gradient(135deg, #4a8cff, #2a6cff);
  color: #fff; letter-spacing: 0.01em;
  box-shadow: 0 6px 18px rgba(74,140,255,0.35);
  transition: transform 120ms ease, box-shadow 120ms ease;
}
.mw-onboard__cta:hover { transform: translateY(-1px); box-shadow: 0 10px 22px rgba(74,140,255,0.45); }
.mw-onboard__cta:active { transform: translateY(0); }
`;

const DESKTOP_KEYS = [
  { keys: ['W'], desc: 'Sail forward' },
  { keys: ['S'], desc: 'Reverse / brake' },
  { keys: ['A', 'D'], desc: 'Turn port / starboard' },
  { keys: ['L-Click'], desc: 'Port machine gun' },
  { keys: ['R-Click'], desc: 'Starboard machine gun' },
  { keys: ['Q', 'E'], desc: 'Port / starboard cannon (heavy)' },
  { keys: ['F'], desc: 'Bow chaser cannon' },
  { keys: ['Z', 'X'], desc: 'Port / stbd machine gun (toggle)' },
  { keys: ['C'], desc: 'Toggle camera mode' },
  { keys: ['1', '2', '3', '4'], desc: 'Camera presets (orbit mode)' },
  { keys: ['?'], desc: 'Show this help again' },
];

const MOBILE_KEYS = [
  { keys: ['◉'], desc: 'Joystick — drag to steer & accelerate' },
  { keys: ['◀'], desc: 'Port cannon (heavy)' },
  { keys: ['▲'], desc: 'Bow chaser cannon' },
  { keys: ['▶'], desc: 'Starboard cannon (heavy)' },
  { keys: ['Tap'], desc: 'Tap and hold for sustained fire' },
];

const MECHANICS = [
  ['Wind', 'sail <b>downwind</b> for a speed boost; into the wind drags you. Watch the masthead flag and the ribbons drifting on the ocean.'],
  ['Combat', 'cannons hit hard but reload slow; <b>machine guns</b> spam light damage. Aim by lining up your <b>broadside</b> with a target.'],
  ['Scoring', 'kills broadcast to all players. Pick up <b>treasure</b>, <b>gems</b>, and <b>powerups</b> on islands. Dock to swap to on-foot mode.'],
  ['Survival', 'health regenerates while not under fire. If you go down, you respawn — kills go to the last shooter.'],
];

export class Onboarding {
  constructor(game) {
    this.game = game;
    this._overlay = null;
    this._injectStyle();
    this._bindKeys();
  }

  shouldShowOnLoad() {
    try { return !localStorage.getItem(STORAGE_KEY); } catch { return true; }
  }

  show() {
    if (this._overlay) return;
    const overlay = document.createElement('div');
    overlay.className = 'mw-onboard';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', "Moana's Wake controls and mechanics");
    overlay.innerHTML = this._html();
    document.body.appendChild(overlay);
    this._overlay = overlay;

    const close = () => this.hide();
    overlay.querySelector('.mw-onboard__cta').addEventListener('click', () => {
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch (_) { /* noop */ }
      close();
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  }

  hide() {
    if (!this._overlay) return;
    this._overlay.style.animation = 'mw-fade-in 200ms ease-in reverse';
    const node = this._overlay;
    this._overlay = null;
    setTimeout(() => node.remove(), 180);
  }

  _bindKeys() {
    window.addEventListener('keydown', (e) => {
      if (this._overlay && (e.key === 'Escape' || e.key === 'Enter')) {
        this.hide();
      } else if (!this._overlay && (e.key === '?' || e.key === 'h' || e.key === 'H')) {
        this.show();
      }
    });
  }

  _injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  _isTouch() {
    return matchMedia('(hover: none) and (pointer: coarse)').matches;
  }

  _renderRows(rows) {
    return rows.map(({ keys, desc }) => `
      <div class="mw-row">
        <span class="mw-row__keys">${keys.map((k) => `<span class="mw-key">${k}</span>`).join('')}</span>
        <span class="mw-row__desc">${desc}</span>
      </div>
    `).join('');
  }

  _html() {
    const isTouch = this._isTouch();
    const desktopActive = isTouch ? '' : 'mw--active';
    const mobileActive = isTouch ? 'mw--active' : '';
    return `
      <div class="mw-onboard__panel">
        <h2 class="mw-onboard__title">Welcome aboard, captain.</h2>
        <p class="mw-onboard__sub">Moana's Wake — a 3D multiplayer pirate ship brawl.</p>

        <div class="mw-onboard__cols">
          <div class="mw-onboard__col ${desktopActive}">
            <h3>Keyboard &amp; Mouse</h3>
            ${this._renderRows(DESKTOP_KEYS)}
          </div>
          <div class="mw-onboard__col ${mobileActive}">
            <h3>Touch</h3>
            ${this._renderRows(MOBILE_KEYS)}
          </div>
        </div>

        <div class="mw-mech">
          <h3>Mechanics</h3>
          <ul>
            ${MECHANICS.map(([name, body]) => `<li><b>${name}</b> — ${body}</li>`).join('')}
          </ul>
        </div>

        <div class="mw-onboard__footer">
          <span class="mw-onboard__hint">Press <span class="mw-key">?</span> any time to reopen this panel.</span>
          <button class="mw-onboard__cta" type="button">Set sail</button>
        </div>
      </div>
    `;
  }
}
