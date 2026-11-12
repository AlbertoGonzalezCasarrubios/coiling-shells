/**
 * Formulas (TeX, language-neutral) and reference lists (HTML) shared by the
 * equation panel, the PDF and the About pages.
 */

export const GENERAL_TEX = String.raw`\[
  \mathbf{P}(\theta,\varphi) = W^{\theta/2\pi}
  \begin{pmatrix}
    (r_c + a\cos\varphi)\cos\theta \\
    \varepsilon\,(r_c + a\cos\varphi)\sin\theta \\
    -T\,r_c + b\sin\varphi
  \end{pmatrix}
\]`;

export const DEFS_TEX = String.raw`\[
  r_c = \tfrac{1+D}{2},\quad a = \tfrac{1-D}{2},\quad b = S\,a,\quad
  \theta \in [-2\pi N,\,0],\;\; \varphi \in [0,\,2\pi)
\]`;

export const MIRROR_TEX = String.raw`\[ \mathbf{P}'(\theta,\varphi) = \operatorname{diag}(1,\,-1,\,1)\;\mathbf{P}(\theta,\varphi) \]`;

export const ORN_REFS = `
  <ul class="refs-list">
    <li>Fowler, D. R., Meinhardt, H. &amp; Prusinkiewicz, P. (1992). Modeling seashells. <i>Computer Graphics</i> (SIGGRAPH ’92) 26, 379–387.</li>
    <li>Cortie, M. B. (1993). Digital seashells. <i>Computers &amp; Graphics</i> 17, 79–84.</li>
    <li>Moulton, D. E., Goriely, A. &amp; Chirat, R. (2012). Mechanical growth and morphogenesis of seashells. <i>J. Theoretical Biology</i> 311, 69–79.</li>
    <li>Chirat, R., Moulton, D. E. &amp; Goriely, A. (2013). Mechanical basis of morphogenesis and convergent evolution of spiny seashells. <i>PNAS</i> 110, 6015–6020.</li>
    <li>Moulton, D. E., Goriely, A. &amp; Chirat, R. (2015). The morpho-mechanical basis of ammonite form. <i>J. Theoretical Biology</i> 364, 220–230.</li>
  </ul>`;

export const REFS = `
  <ul class="refs-list">
    <li>Raup, D. M. (1961). The geometry of coiling in gastropods. <i>PNAS</i> 47, 602–609.</li>
    <li>Raup, D. M. (1962). Computer as aid in describing form in gastropod shells. <i>Science</i> 138, 150–152.</li>
    <li>Raup, D. M. &amp; Michelson, A. (1965). Theoretical morphology of the coiled shell. <i>Science</i> 147, 1294–1295.</li>
    <li>Raup, D. M. (1966). Geometric analysis of shell coiling: general problems. <i>J. Paleontology</i> 40, 1178–1190.</li>
  </ul>`;

export const AI_TEX = String.raw`\[
  \begin{aligned}
    \frac{\partial a}{\partial t} &= s\left(\frac{a^2}{h\,(1+\kappa a^2)} + b_a\right) - r_a\,a + D_a\,\frac{\partial^2 a}{\partial x^2} \\
    \frac{\partial h}{\partial t} &= s\,a^2 - r_h\,h + D_h\,\frac{\partial^2 h}{\partial x^2} + b_h
  \end{aligned}
\]`;

export const AS_TEX = String.raw`\[
  \begin{aligned}
    \frac{\partial a}{\partial t} &= s\,b\left(\frac{a^2}{1+\kappa a^2} + b_a\right) - r_a\,a + D_a\,\frac{\partial^2 a}{\partial x^2} \\
    \frac{\partial b}{\partial t} &= b_b - s\,b\left(\frac{a^2}{1+\kappa a^2} + b_a\right) - r_b\,b + D_b\,\frac{\partial^2 b}{\partial x^2}
  \end{aligned}
\]`;

/** Activator–substrate with the hormone R of Meinhardt & Klingler (1987, Fig. 9). */
export const GLOBAL_TEX = String.raw`\[
  \begin{aligned}
    \frac{\partial a}{\partial t} &= s\,b\left(\frac{a^2}{1+\kappa a^2} + b_a\right) - r_a\,a + D_a\,\frac{\partial^2 a}{\partial x^2} \\
    \frac{\partial b}{\partial t} &= \frac{b_b}{R} - s\,b\left(\frac{a^2}{1+\kappa a^2} + b_a\right) - r_b\,b + D_b\,\frac{\partial^2 b}{\partial x^2} \\
    \frac{dR}{dt} &= g\,\big(\langle a \rangle - R\big)
  \end{aligned}
\]`;

/** Activator–inhibitor with the hormone R of Meinhardt & Klingler (1987, Fig. 8). */
export const HORMONE_TEX = String.raw`\[
  \begin{aligned}
    \frac{\partial a}{\partial t} &= s\,\frac{a^{*2} + b_a}{0.1 + h} - r_a\,a + D_a\,\frac{\partial^2 a}{\partial x^2} \\
    \frac{\partial h}{\partial t} &= s\,a^{*2} - \frac{r_h}{R}\,h + D_h\,\frac{\partial^2 h}{\partial x^2} + b_h \\
    \frac{dR}{dt} &= g\,\big(\langle a \rangle - R\big), \qquad a^{*2} = \frac{a^2}{1+\kappa a^2}
  \end{aligned}
\]`;

export const MEIN_REFS = `
  <ul class="refs-list">
    <li>Turing, A. M. (1952). The chemical basis of morphogenesis. <i>Phil. Trans. R. Soc. B</i> 237, 37–72.</li>
    <li>Gierer, A. &amp; Meinhardt, H. (1972). A theory of biological pattern formation. <i>Kybernetik</i> 12, 30–39.</li>
    <li>Ermentrout, B., Campbell, J. &amp; Oster, G. (1986). A model for shell patterns based on neural activity. <i>The Veliger</i> 28, 369–388.</li>
    <li>Meinhardt, H. &amp; Klingler, M. (1987). A model for pattern formation on the shells of molluscs. <i>J. Theor. Biol.</i> 126, 63–89.</li>
    <li>Fowler, D. R., Meinhardt, H. &amp; Prusinkiewicz, P. (1992). Modeling seashells. <i>Computer Graphics (SIGGRAPH '92)</i> 26(2), 379–387.</li>
    <li>Meinhardt, H. (2009). <i>The Algorithmic Beauty of Sea Shells</i>, 4th ed. Springer.</li>
  </ul>`;

/**
 * Sketch of the kinds of ornament on a piece of whorl seen from outside and
 * unrolled: growth runs to the right, and the right edge of each panel is the
 * margin of the aperture. `l` holds the labels of one language.
 * @param {{ ribs: string, cords: string, net: string, keel: string, margin: string, growth: string, periphery: string, alt: string }} l
 */
export function ornamentFigure(l) {
  const W = 118,
    H = 84,
    Y = 8;
  const panel = (i, title, inner) => {
    const x = 6 + i * 132;
    return `<g transform="translate(${x} ${Y})">
      <rect x="0" y="0" width="${W}" height="${H}" rx="3" fill="var(--surface-2)" stroke="var(--border)" />
      <g stroke="var(--accent)" fill="var(--accent)" stroke-linecap="round">${inner}</g>
      <line x1="${W}" y1="0" x2="${W}" y2="${H}" stroke="currentColor" stroke-width="3" />
      <text x="${W / 2}" y="${H + 16}" text-anchor="middle" font-size="11" fill="currentColor">${title}</text>
    </g>`;
  };
  const xs = [18, 38, 58, 78, 98],
    ys = [16, 32, 48, 64];
  const ribs = xs.map((x) => `<line x1="${x}" y1="4" x2="${x}" y2="${H - 4}" stroke-width="3" />`).join('');
  const cords = ys.map((y) => `<line x1="4" y1="${y}" x2="${W - 4}" y2="${y}" stroke-width="3" />`).join('');
  const thin = (s) => s.replaceAll('stroke-width="3"', 'stroke-width="1.5"');
  const nodules = xs.flatMap((x) => ys.map((y) => `<circle cx="${x}" cy="${y}" r="3.6" stroke="none" />`)).join('');
  const keel = `<line x1="4" y1="${H / 2}" x2="${W - 4}" y2="${H / 2}" stroke-width="5" />
    <text x="6" y="${H / 2 - 6}" font-size="9" fill="currentColor" stroke="none">${l.periphery}</text>`;
  const spines = [24, 54, 84].map((x) => `<path d="M${x - 6} ${H - 14} L${x} ${H - 34} L${x + 6} ${H - 14} Z" stroke="none" />`).join('');
  return `<figure class="theory-figure">
    <svg viewBox="0 0 532 154" role="img" aria-label="${l.alt}">
      ${panel(0, l.ribs, ribs)}
      ${panel(1, l.cords, cords)}
      ${panel(2, l.net, thin(ribs) + thin(cords) + nodules)}
      ${panel(3, l.keel, keel + spines)}
      <g fill="currentColor" stroke="currentColor">
        <line x1="40" y1="142" x2="470" y2="142" stroke-width="1.2" />
        <path d="M470 138 L480 142 L470 146 Z" stroke="none" />
        <text x="40" y="136" font-size="10.5" stroke="none">${l.growth}</text>
        <text x="526" y="136" font-size="10.5" text-anchor="end" stroke="none">${l.margin}</text>
      </g>
    </svg>
  </figure>`;
}
