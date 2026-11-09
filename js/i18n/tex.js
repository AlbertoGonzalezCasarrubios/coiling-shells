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

export const GLOBAL_TEX = String.raw`\[ \frac{dc}{dt} = 0.02\,\big(\langle a \rangle - c\big), \qquad b_a^{\mathrm{ef}} = b_a + \frac{g}{1 + 40\,c} \]`;

export const MEIN_REFS = `
  <ul class="refs-list">
    <li>Turing, A. M. (1952). The chemical basis of morphogenesis. <i>Phil. Trans. R. Soc. B</i> 237, 37–72.</li>
    <li>Gierer, A. &amp; Meinhardt, H. (1972). A theory of biological pattern formation. <i>Kybernetik</i> 12, 30–39.</li>
    <li>Ermentrout, B., Campbell, J. &amp; Oster, G. (1986). A model for shell patterns based on neural activity. <i>The Veliger</i> 28, 369–388.</li>
    <li>Meinhardt, H. &amp; Klingler, M. (1987). A model for pattern formation on the shells of molluscs. <i>J. Theor. Biol.</i> 126, 63–89.</li>
    <li>Fowler, D. R., Meinhardt, H. &amp; Prusinkiewicz, P. (1992). Modeling seashells. <i>Computer Graphics (SIGGRAPH '92)</i> 26(2), 379–387.</li>
    <li>Meinhardt, H. (2009). <i>The Algorithmic Beauty of Sea Shells</i>, 4th ed. Springer.</li>
  </ul>`;
