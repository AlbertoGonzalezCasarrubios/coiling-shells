/**
 * The equation panel (general form and current values, typeset by MathJax only
 * while it is visible) and the About window with its pages.
 */
import { AI_TEX, AS_TEX, DEFS_TEX, GENERAL_TEX, GLOBAL_TEX, HORMONE_TEX, MIRROR_TEX, t } from '../i18n/i18n.js';
import { hasOrnament } from '../model/ornament.js';
import { state } from './state.js';
import { $, f, formatW, sig, qsa } from './util.js';

// Provided by main.js through init()
let PATTERN_CELLS, pattern;
// Values that main.js reassigns, read through getters
let live;

export const formulaPanel = $('formula');
const formulaGeneral = $('formulaGeneral');
const formulaLive = $('formulaLive');
export const infoDialog = $('info');
export const infoBody = $('infoBody');

const mathJaxReady = new Promise((resolve) => {
  const check = () => {
    const s = window.MathJax && window.MathJax.startup;
    if (s && s.promise) s.promise.then(resolve);
    else setTimeout(check, 100);
  };
  check();
});
let mathQueue = mathJaxReady;

/** Queues typesetting of `el`; `html` (a function) is evaluated just before, with the latest state. */
function typeset(el, html) {
  mathQueue = mathQueue
    .then(() => {
      const MJ = window.MathJax;
      MJ.typesetClear([el]);
      if (html) el.innerHTML = html();
      return MJ.typesetPromise([el]);
    })
    .catch((err) => console.warn('MathJax:', err));
}

export let formulaView = 'raup';

const SOURCE_TEX = String.raw`\[ s_i = r_a\,(1 + \sigma\,\xi_i),\quad \xi_i \in [-1,\,1],\quad x = 1,\dots,N \]`;

export function generalTeX(view = formulaView) {
  if (view === 'meinhardt') {
    const isAS = pattern.model === 'AS';
    const global = pattern.globalCtl > 0;
    // With global control, the activator–inhibitor model takes the hormone of Meinhardt & Klingler
    if (!isAS) return (global ? HORMONE_TEX : AI_TEX) + SOURCE_TEX;
    return (global ? GLOBAL_TEX : AS_TEX) + SOURCE_TEX;
  }
  return GENERAL_TEX + DEFS_TEX + (state.mirror ? MIRROR_TEX : '') + (hasOrnament(state) ? ORNAMENT_TEX : '');
}

/** Relief added along the outward normal of the aperture (descriptive model of ornament). */
const ORNAMENT_TEX = String.raw`\[
  \mathbf{P}^{*} = \mathbf{P} + W^{\theta/2\pi}\,a\,\delta(\theta,\varphi)\,\mathbf{n}(\varphi)
\]
\[
  \delta = f(s)\,\bigl[\,h_r R(\theta) + h_c C(u) + h_k K(u) + h_s \Sigma(\theta,u)\,\bigr],\qquad
  f(s) = 1 + c\,(2s - 1)
\]
\[
  R = \beta\!\left(\tfrac{n_r\theta}{2\pi},\,w_r,\,k\right),\quad
  C = \beta(n_c u,\,w_c),\quad
  K = \beta(u - u_k,\,w_k),\quad
  \beta(t,w) = \cos^2\!\left(\tfrac{\pi d}{w}\right)\ (d < \tfrac{w}{2}),\quad d = \left|t - \operatorname{round}(t)\right|
\]`;

/** Values of the ornament terms in use (terms that are off are left out). */
function ornamentLiveTeX() {
  const s = state,
    parts = [];
  if (s.ribN > 0 && s.ribH > 0)
    parts.push(
      String.raw`n_r = ${s.ribN},\; h_r = ${f(s.ribH, 2)},\; w_r = ${f(s.ribW, 2)}${s.ribSkew ? String.raw`,\; k = ${f(s.ribSkew, 2)}` : ''}`,
    );
  if (s.cordN > 0 && s.cordH > 0) parts.push(String.raw`n_c = ${s.cordN},\; h_c = ${f(s.cordH, 2)},\; w_c = ${f(s.cordW, 2)}`);
  if (s.nodules) parts.push(String.raw`h_r R + h_c C \;\to\; (h_r + h_c)\,R\,C`);
  if (s.keelH > 0) parts.push(String.raw`h_k = ${f(s.keelH, 2)},\; w_k = ${f(s.keelW, 2)},\; u_k = ${f(s.keelPos, 2)}`);
  if (s.spineN > 0 && s.spineH > 0)
    parts.push(
      String.raw`n_s = ${s.spineN},\; h_s = ${f(s.spineH, 2)},\; w_s = ${f(s.spineW, 2)},\; u_s = ${s.spineBoth ? '\\pm' : ''}${f(s.spinePos, 2)}`,
    );
  if (s.ornGrowth) parts.push(String.raw`c = ${f(s.ornGrowth, 2)}`);
  return parts.map((p) => String.raw`\[ ${p} \]`).join('');
}

function meinhardtLiveTeX() {
  const { model, Da, D2, ra, r2, kappa, ba, b2, noise, globalCtl, T } = pattern;
  // Optional terms: omitted when their coefficient is 0
  const term = (sign, c, tex) => (c > 0 ? ` ${sign} ${sig(c)}${tex ? String.raw`\,${tex}` : ''}` : '');
  const lap = (v) => String.raw`\frac{\partial^2 ${v}}{\partial x^2}`;
  const sat = kappa > 0 ? String.raw`(1+${sig(kappa)}\,a^2)` : '';
  const basal = term('+', ba, '');
  let eqs;
  if (model === 'AS') {
    const prod = String.raw`s\,b\left(\frac{a^2}{${sat || '1'}}${basal}\right)`;
    eqs = String.raw`\begin{aligned}
      \frac{\partial a}{\partial t} &= ${prod} - ${sig(ra)}\,a${term('+', Da, lap('a'))} \\
      \frac{\partial b}{\partial t} &= ${globalCtl > 0 ? String.raw`\frac{${sig(b2)}}{R}` : sig(b2)} - ${prod}${term('-', r2, 'b')}${term('+', D2, lap('b'))}${
        globalCtl > 0 ? String.raw` \\ \frac{dR}{dt} &= ${sig(globalCtl)}\,\big(\langle a \rangle - R\big)` : ''
      }
    \end{aligned}`;
  } else if (globalCtl > 0) {
    const sat2 = kappa > 0 ? String.raw`\frac{a^2}{1+${sig(kappa)}\,a^2}` : 'a^2';
    eqs = String.raw`\begin{aligned}
      \frac{\partial a}{\partial t} &= s\,\frac{${sat2}${basal}}{0.1 + h} - ${sig(ra)}\,a${term('+', Da, lap('a'))} \\
      \frac{\partial h}{\partial t} &= s\,${sat2} - \frac{${sig(r2)}}{R}\,h${term('+', D2, lap('h'))}${term('+', b2, '')} \\
      \frac{dR}{dt} &= ${sig(globalCtl)}\,\big(\langle a \rangle - R\big)
    \end{aligned}`;
  } else {
    eqs = String.raw`\begin{aligned}
      \frac{\partial a}{\partial t} &= s\left(\frac{a^2}{h${sat ? String.raw`\,${sat}` : ''}}${basal}\right) - ${sig(ra)}\,a${term('+', Da, lap('a'))} \\
      \frac{\partial h}{\partial t} &= s\,a^2 - ${sig(r2)}\,h${term('+', D2, lap('h'))}${term('+', b2, '')}
    \end{aligned}`;
  }
  const cells = Math.round(PATTERN_CELLS / pattern.size);
  return String.raw`\[ ${eqs} \]` + String.raw`\[ s_i = ${sig(ra)}\,(1 \pm ${sig(noise)}),\quad N = ${cells},\quad T = ${Math.round(T)} \]`;
}

export function liveTeX(view = formulaView) {
  if (view === 'meinhardt') return meinhardtLiveTeX();
  const { W, D, T, S, hand, turns } = state;
  const { rc, a, b } = live.lastBuild().derived;
  const R = `(${f(rc, 3)} + ${f(a, 3)}\\cos\\varphi)`;
  const zc = T * rc;
  const zTerm = zc === 0 ? `${f(b, 3)}\\sin\\varphi` : `-${f(zc, 3)} + ${f(b, 3)}\\sin\\varphi`;
  const ySign = hand > 0 ? '-' : ''; // ε = −1 dextral
  return (
    `\\[ W = ${formatW(W)},\\; D = ${f(D, 3)},\\; T = ${f(T, 2)},\\; S = ${f(S, 2)},\\; N = ${f(turns, 2)} \\]` +
    `\\[ r_c = ${f(rc, 3)},\\; a = ${f(a, 3)},\\; b = ${f(b, 3)},\\; \\varepsilon = ${hand > 0 ? '-1' : '+1'} \\]` +
    `\\[ \\mathbf{P}(\\theta,\\varphi) = ${formatW(W)}^{\\theta/2\\pi}` +
    `\\begin{pmatrix} ${R}\\cos\\theta \\\\ ${ySign}${R}\\sin\\theta \\\\ ${zTerm} \\end{pmatrix} \\]` +
    (state.mirror ? `\\[ \\mathbf{P}' = (x,\\,-y,\\,z) \\]` : '') +
    (hasOrnament(state) ? ornamentLiveTeX() : '')
  );
}

let formulaTimer = 0;
let lastGeneral = '';
export function scheduleFormula() {
  if (formulaPanel.hidden || !live.lastBuild()) return;
  clearTimeout(formulaTimer);
  formulaTimer = setTimeout(() => {
    if (generalTeX() !== lastGeneral) {
      lastGeneral = generalTeX();
      typeset(formulaGeneral, generalTeX);
    }
    typeset(formulaLive, liveTeX);
  }, 80);
}

export function setFormulaView(view) {
  formulaView = view;
  qsa('#eqView [data-eq]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.eq === view)));
  const note = $('eqNote');
  note.dataset.i18n = view === 'meinhardt' ? 'eq.mein.note' : 'eq.chirality';
  note.textContent = t(note.dataset.i18n);
  if (!formulaPanel.hidden) {
    typeset(note);
    lastGeneral = '';
    scheduleFormula();
  }
}

export function setFormulaOpen(open) {
  formulaPanel.hidden = !open;
  $('toggleFormula').setAttribute('aria-pressed', String(open));
  if (open) {
    // From the pigment tab, Meinhardt's equations open directly
    setFormulaView($('tab-pigment').hidden ? formulaView : 'meinhardt');
  }
}

let infoPage = 'raup';

export function showInfoPage(page) {
  infoPage = page;
  qsa('.info-tabs [data-page]').forEach((b) => {
    const on = b.dataset.page === page;
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
  });
  qsa('.info-page', infoBody).forEach((el) => {
    el.hidden = el.dataset.page !== page;
    // Each page is typeset with MathJax the first time it is shown
    if (!el.hidden && !el.dataset.typeset) {
      el.dataset.typeset = '1';
      typeset(el);
    }
  });
  infoBody.scrollTop = 0;
}

export function openInfo(page = infoPage) {
  showInfoPage(page);
  if (!infoDialog.open) infoDialog.showModal();
}

// ---------------------------------------------------------------------------

/** Connects this part of the interface to the rest of the app. */
export function initFormulas(ctx) {
  ({ PATTERN_CELLS, pattern } = ctx);
  live = ctx.live;
}
