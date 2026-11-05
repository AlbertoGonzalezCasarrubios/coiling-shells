/**
 * Textos de la interfaz en inglés (por defecto) y español.
 * En el HTML: data-i18n (texto), data-i18n-html (HTML), data-i18n-title (title + aria-label).
 */

const GENERAL_TEX = String.raw`\[
  \mathbf{P}(\theta,\varphi) = W^{\theta/2\pi}
  \begin{pmatrix}
    (r_c + a\cos\varphi)\cos\theta \\
    \varepsilon\,(r_c + a\cos\varphi)\sin\theta \\
    -T\,r_c + b\sin\varphi
  \end{pmatrix}
\]`;

const DEFS_TEX = String.raw`\[
  r_c = \tfrac{1+D}{2},\quad a = \tfrac{1-D}{2},\quad b = S\,a,\quad
  \theta \in [-2\pi N,\,0],\;\; \varphi \in [0,\,2\pi)
\]`;

const MIRROR_TEX = String.raw`\[ \mathbf{P}'(\theta,\varphi) = \operatorname{diag}(1,\,-1,\,1)\;\mathbf{P}(\theta,\varphi) \]`;

const REFS = `
  <ul class="refs-list">
    <li>Raup, D. M. (1961). The geometry of coiling in gastropods. <i>PNAS</i> 47, 602–609.</li>
    <li>Raup, D. M. (1962). Computer as aid in describing form in gastropod shells. <i>Science</i> 138, 150–152.</li>
    <li>Raup, D. M. &amp; Michelson, A. (1965). Theoretical morphology of the coiled shell. <i>Science</i> 147, 1294–1295.</li>
    <li>Raup, D. M. (1966). Geometric analysis of shell coiling: general problems. <i>J. Paleontology</i> 40, 1178–1190.</li>
  </ul>`;

const AI_TEX = String.raw`\[
  \begin{aligned}
    \frac{\partial a}{\partial t} &= s\left(\frac{a^2}{h\,(1+\kappa a^2)} + b_a\right) - r_a\,a + D_a\,\frac{\partial^2 a}{\partial x^2} \\
    \frac{\partial h}{\partial t} &= s\,a^2 - r_h\,h + D_h\,\frac{\partial^2 h}{\partial x^2} + b_h
  \end{aligned}
\]`;

const AS_TEX = String.raw`\[
  \begin{aligned}
    \frac{\partial a}{\partial t} &= s\,b\left(\frac{a^2}{1+\kappa a^2} + b_a\right) - r_a\,a + D_a\,\frac{\partial^2 a}{\partial x^2} \\
    \frac{\partial b}{\partial t} &= b_b - s\,b\left(\frac{a^2}{1+\kappa a^2} + b_a\right) - r_b\,b + D_b\,\frac{\partial^2 b}{\partial x^2}
  \end{aligned}
\]`;

const GLOBAL_TEX = String.raw`\[ \frac{dc}{dt} = r_c\,\big(\langle a \rangle - c\big), \qquad b_a^{\mathrm{ef}} = b_a + \frac{g}{1 + 40\,c} \]`;

const MEIN_REFS = `
  <ul class="refs-list">
    <li>Turing, A. M. (1952). The chemical basis of morphogenesis. <i>Phil. Trans. R. Soc. B</i> 237, 37–72.</li>
    <li>Gierer, A. &amp; Meinhardt, H. (1972). A theory of biological pattern formation. <i>Kybernetik</i> 12, 30–39.</li>
    <li>Meinhardt, H. &amp; Klingler, M. (1987). A model for pattern formation on the shells of molluscs. <i>J. Theor. Biol.</i> 126, 63–89.</li>
    <li>Fowler, D. R., Meinhardt, H. &amp; Prusinkiewicz, P. (1992). Modeling seashells. <i>Computer Graphics (SIGGRAPH '92)</i> 26(2), 379–387.</li>
    <li>Meinhardt, H. (2009). <i>The Algorithmic Beauty of Sea Shells</i>, 4th ed. Springer.</li>
  </ul>`;

export const STRINGS = {
  en: {
    'doc.title': 'Theoretical Shell Morphology',
    'brand.subtitle': "Raup's shell-coiling model (1962, 1966)",
    'lang.label': 'Language',
    'preset.title': 'Preset',
    'preset.custom': 'Custom',
    'raup.title': 'Raup parameters',
    'geo.title': 'Geometry',
    'geo.hand': 'Coiling',
    'geo.dextral': 'Dextral',
    'geo.sinistral': 'Sinistral',
    'geo.mirror': 'Mirror valve',
    'geo.mirror.hint': 'Duplicates the shell reflected across the aperture plane (bivalves)',
    'geo.grow': 'Animate growth',
    'geo.stop': 'Stop',
    'morpho.title': 'Morphospace W – D',
    'morpho.hint': 'Click or drag to choose W and D. Regions are approximate (after Raup, 1966).',
    'morpho.touch': 'D = 1/W',
    'morpho.open': 'whorls do not touch (T = 0)',
    'morpho.ammonoids': 'Ammonoids',
    'morpho.gastropods': 'Gastropods',
    'morpho.bivalves': 'Bivalves & brachiopods',
    'look.title': 'Appearance',
    'look.colors': 'Colours',
    'scale.hint': 'Slider scale: linear 1–10 (snails, ammonites) or logarithmic 1–10⁴ (bivalves)',
    'look.palette': 'Colour presets',
    'palette.light': 'Light',
    'palette.dark': 'Dark',
    'palette.hint': 'Restore a predefined colour scheme',
    'look.lines': 'Lines',
    'look.shell': 'Shell',
    'look.bg': 'Background',
    'look.quality': 'Mesh resolution',
    'look.low': 'Low',
    'look.medium': 'Medium',
    'look.high': 'High',
    'look.hideHidden': 'Hide back lines',
    'look.bands': 'Growth bands (solid)',
    'look.axis': 'Show coiling axis',
    'look.autoRotate': 'Auto-rotate',
    'export.title': 'Export',
    'export.png': 'Save PNG',
    'export.stl': 'STL (80 mm)',
    'export.stl.hint': 'Solid mesh for 3D printing / CAD. The aperture is open, so it is not watertight.',
    'mode.lines': 'Lines',
    'mode.solid': 'Solid',
    'mode.both': 'Both',
    'mode.label': 'Render mode',
    'tb.equation': 'Equation',
    'tb.info': 'About',
    'tb.axes': 'Axes',
    'tab.shape': 'Shape · Raup',
    'tab.pigment': 'Pigment · Meinhardt',
    'tab.label': 'Sections',
    'pig.apply': 'Apply pattern to shell',
    'pig.theory': 'Theory behind the model →',
    'pig.apply.hint': 'Colour the shell with the simulated pigmentation instead of a solid colour',
    'pig.preset': 'Pattern',
    'pig.custom': 'Custom',
    'pig.spacetime': 'Space–time record',
    'pig.axis.x': '← aperture margin (x) →',
    'pig.axis.t': 'apex → aperture (time)',
    'pig.computing': 'Computing…',
    'pig.colors': 'Pigment colours',
    'pig.base': 'Background',
    'pig.pigment': 'Pigment',
    'pig.model': 'Model',
    'pig.model.AI': 'Activator–inhibitor',
    'pig.model.AS': 'Activator–substrate',
    'pig.params': 'Parameters',
    'pig.seed': 'Seed',
    'pig.newSeed': 'New seed',
    'pig.insertion': 'Cell insertion (the margin grows with the shell)',
    'pig.save': 'Save pattern PNG',
    'pig.note': 'The pattern is drawn on the shell in Solid and Both modes. Without it, the shell keeps its solid colour.',
    'info.page.raup': 'Raup · shape',
    'info.page.meinhardt': 'Meinhardt · pigment',
    'info.page.app': 'App & credits',
    'info.pages': 'About sections',
    'tb.fullscreen': 'Fullscreen',
    'tb.exitFullscreen': 'Exit fullscreen',
    'tb.fullscreen.hint': 'Show the 3D view fullscreen (F)',
    'tb.hideInfo': 'Hide info',
    'tb.hideInfo.hint': 'Hide all panels and controls to see only the shell (H)',
    'tb.showInfo': 'Show info',
    'tb.showInfo.hint': 'Show panels and controls again (H or Esc)',
    'tb.axes.hint': 'Show or hide the x, y, z axes gizmo',
    'eq.title': 'Model equation',
    'eq.general': 'General form',
    'eq.live': 'With current values',
    'eq.close': 'Close',
    'eq.chirality': String.raw`\(\varepsilon = -1\) dextral, \(\varepsilon = +1\) sinistral`,
    'eq.mirrorNote': 'Mirror valve:',
    'views.label': 'Standard views',
    'view.iso': '3/4',
    'view.apertural': 'Apertural',
    'view.dorsal': 'Dorsal',
    'view.apical': 'Apical',
    'view.umbilical': 'Umbilical',
    'view.profile': 'Profile',
    'view.iso.hint': 'Three-quarter perspective',
    'view.apertural.hint': 'Facing the aperture, apex up',
    'view.dorsal.hint': 'Abapertural view, opposite the aperture',
    'view.apical.hint': 'From the apex, along the coiling axis (side view of a planispiral shell)',
    'view.umbilical.hint': 'From the base, into the umbilicus',
    'view.profile.hint': 'Side view, aperture seen edge-on',
    'hint.controls': 'Drag: rotate · Wheel: zoom · Right-click: pan · F: fullscreen · H: hide info',
    'hud.stats': (v, t) => `${v.toLocaleString('en')} vertices · ${t.toLocaleString('en')} triangles`,
    loading: 'Loading Three.js…',
    'info.title': 'About this app',
    'info.close': 'Close',
    'refs.short': 'Raup (1962) <i>Science</i> 138 · Raup (1966) <i>J. Paleontology</i> 40',
    params: {
      W: { name: 'Whorl expansion rate', desc: 'Growth factor of the aperture per revolution' },
      D: { name: 'Distance from axis', desc: 'Umbilicus size: inner / outer radius of the aperture' },
      T: { name: 'Translation rate', desc: 'Displacement along the axis per unit of radial growth' },
      S: { name: 'Aperture shape', desc: 'Ellipse semi-axis ratio (axial / radial)' },
      turns: { name: 'Number of whorls', desc: 'Revolutions from apex to aperture' },
      spiralLines: { name: 'Spiral lines' },
      ringsPerTurn: { name: 'Growth lines per whorl' },
      lineWidth: { name: 'Line width (px)' },
      lineOpacity: { name: 'Line opacity' },
      Da: { name: 'Activator diffusion' },
      'D2.AI': { name: 'Inhibitor diffusion' },
      'D2.AS': { name: 'Substrate diffusion' },
      ra: { name: 'Activator decay' },
      'r2.AI': { name: 'Inhibitor decay' },
      'r2.AS': { name: 'Substrate decay' },
      kappa: { name: 'Saturation' },
      ba: { name: 'Basal activator production' },
      'b2.AI': { name: 'Basal inhibitor production' },
      'b2.AS': { name: 'Substrate production' },
      noise: { name: 'Cell-to-cell noise' },
      globalCtl: { name: 'Global control' },
      pT: { name: 'Time (apex → aperture)' },
    },
    patterns: {
      nautilus: 'Nautilus — flame stripes',
      cepaea: 'Cepaea nemoralis — spiral bands',
      oliva: 'Oliva porphyria — tent pattern',
    },
    presets: {
      'Gasterópodos': 'Gastropods',
      'Cefalópodos': 'Cephalopods',
      'Bivalvos': 'Bivalves',
      caracol: 'Garden snail (Cornu aspersum)',
      turritella: 'Turritella',
      trochus: 'Top shell (Trochus)',
      planorbis: 'Ramshorn snail (Planorbis)',
      physa: 'Bladder snail (Physa, sinistral)',
      nautilus: 'Chambered nautilus (Nautilus pompilius)',
      ammonite: 'Evolute ammonite (Dactylioceras)',
      almeja: 'Venus clam (Venus)',
    },
    'info.raup': `
      <blockquote class="quote">
        <p>“The basic form of many coiled gastropod shells can be defined by four parameters. A digital computer with automatic plotting equipment can be used to make graphical reconstructions of a shell from any given values of the four parameters.”</p>
        <cite>— David M. Raup, <i>Science</i> (1962)</cite>
      </blockquote>

      <h3>Raup's model</h3>
      <p>Most coiled shells — snails, ammonoids, nautiloids, clams, brachiopods — grow by adding material at the margin of the aperture without changing their overall shape. Growth of this kind (self-similar or <em>gnomonic</em>) traces a <strong>logarithmic spiral</strong>. In the early 1960s David M. Raup used one of the first computer plotters to draw shells from this principle, and in 1966 showed that just four parameters describe an enormous variety of real forms.</p>

      <h3>The equation</h3>
      <p>A generating curve — here an ellipse that represents the aperture — lies in a plane containing the coiling axis \\(z\\) and is swept around it. After one full revolution (\\(\\Delta\\theta = 2\\pi\\)) every linear dimension has been multiplied by \\(W\\), so at angle \\(\\theta\\) the scale is \\(W^{\\theta/2\\pi}\\):</p>
      ${GENERAL_TEX}
      ${DEFS_TEX}
      <ul>
        <li><strong>\\(W\\) — whorl expansion rate.</strong> How much the aperture grows per revolution. Low values give many tight whorls; very high values give a shell that is almost all aperture.</li>
        <li><strong>\\(D\\) — distance from the axis.</strong> Ratio between the inner and outer edge of the aperture measured from the axis. \\(D = 0\\): the whorls touch the axis (no umbilicus); large \\(D\\): wide open umbilicus.</li>
        <li><strong>\\(T\\) — translation rate.</strong> How far the generating curve moves along the axis relative to its radial growth. \\(T = 0\\) gives a planispiral shell (nautilus, ammonites); high values give tall spires (Turritella).</li>
        <li><strong>\\(S\\) — shape of the generating curve.</strong> Axial / radial semi-axis ratio of the ellipse.</li>
        <li>\\(\\varepsilon\\) chooses the coiling direction: −1 dextral (clockwise seen from the apex), +1 sinistral. \\(N\\) is just the number of whorls drawn.</li>
      </ul>
      <p>With this normalisation the outer edge of the final aperture lies at distance 1 from the axis and the inner edge at distance \\(D\\), matching Raup's definition. The apex is at the origin (\\(\\theta \\to -\\infty\\)).</p>

      <h3>Theoretical morphospace</h3>
      <p>Each combination of \\(W, D, T, S\\) is a point in a space of possible shells. For planispiral shells (\\(T = 0\\)) successive whorls just touch when \\(D = 1/W\\); above that curve they separate, a form that is very rare in nature. Raup's key finding was that real shells occupy only small regions of this space, which raises the question of why the rest is empty — functional, developmental or historical constraints. The <em>Morphospace</em> panel in the sidebar shows this plane.</p>

      <h3>Bivalves</h3>
      <p>The same equations produce the valves of clams, cockles and mussels. Each valve is a logarithmic spiral with a <strong>very high \\(W\\)</strong> (roughly \\(10^2\\)–\\(10^4\\) or more), a low \\(D\\) and a small \\(T\\), so it completes only a fraction of a whorl: the beak (umbo) is the apex. The second valve is approximately the mirror image across the plane of the aperture (the commissure), which the <em>Mirror valve</em> button draws:</p>
      ${MIRROR_TEX}
      <p>The model ignores hinge teeth, the ligament and ornament, and it cannot represent inequivalve shells (oysters, scallops) or brachiopods, whose two valves differ.</p>

      <h3>References</h3>
      ${REFS}`,
    'info.meinhardt': `
      <h3>Painting with chemistry</h3>
      <p>A mollusc only adds pigment where the shell grows: along the margin of the aperture. Whatever happens there, cell by cell, is frozen into the shell as it grows. A shell pattern is therefore a <strong>record in time of a one-dimensional process</strong>: the horizontal direction along the margin is space \\(x\\), and the direction of growth is time. This was Hans Meinhardt's key insight, and it is why the panel in the <em>Pigment</em> tab shows a space–time diagram.</p>

      <h3>Local activation, long-range inhibition</h3>
      <p>Following Turing (1952), Gierer and Meinhardt (1972) showed that patterns arise spontaneously from two interacting substances: an <strong>activator</strong> \\(a\\) that enhances its own production (autocatalysis), and an antagonist that diffuses faster and keeps it in check. A small random excess of activator grows locally, while the fast-spreading antagonist prevents activation nearby. The result is a regular pattern that nobody "drew".</p>

      <h3>Activator–inhibitor model</h3>
      ${AI_TEX}
      <ul>
        <li>\\(s\\) is the <em>source density</em>: each cell's ability to perform the reaction. It varies slightly from cell to cell (the <em>noise</em> parameter), which is what starts the patterns.</li>
        <li>\\(r_a, r_h\\) are decay rates and \\(D_a, D_h\\) diffusion rates; \\(b_a, b_h\\) are small basal productions; \\(\\kappa\\) saturates the autocatalysis and makes peaks broader.</li>
        <li>If the inhibitor is fast (\\(r_h > r_a\\)) and spreads far (\\(D_h \\gg D_a\\)), the peaks are <strong>stable in time</strong> and draw bands along the direction of growth.</li>
        <li>If the inhibitor lives longer than the activator (\\(r_h < r_a\\)), each burst of activation is shut down by its own inhibitor and the system <strong>oscillates</strong>, drawing stripes parallel to the margin.</li>
      </ul>

      <h3>Activator–substrate model</h3>
      ${AS_TEX}
      <p>Here autocatalysis consumes a substrate \\(b\\) that is produced at rate \\(b_b\\). Where activation is high the substrate is <strong>depleted</strong>, and the cell needs time to recover before it can be activated again: it becomes <strong>refractory</strong>. Activation then spreads to neighbouring cells as a <strong>travelling wave</strong>, which draws an oblique line on the shell. When two waves meet they <strong>annihilate</strong>, because each runs into the refractory wake of the other, and the lines form a V.</p>

      <h3>Global control: the triangles of <i>Oliva porphyria</i></h3>
      <p>Meinhardt and Klingler (1987) explained the tent pattern of <i>Oliva</i> with a third substance that is shared by the whole margin, like a hormone. It measures the total activity: when waves annihilate and activity drops, the signal falls and makes it easier to trigger new waves, which split into new lines and close the triangles. This app uses a simplified version of that mechanism:</p>
      ${GLOBAL_TEX}

      <h3>Which pattern comes from which dynamics</h3>
      <ul>
        <li><strong>Bands along the spiral</strong> (<i>Cepaea nemoralis</i>): stable activator peaks.</li>
        <li><strong>Stripes parallel to the margin</strong> (the flames of <i>Nautilus</i>): oscillation; the irregularity comes from weak coupling between cells.</li>
        <li><strong>Oblique lines, zigzags and triangles</strong> (<i>Oliva</i>, many <i>Conus</i>): travelling waves, their collisions and new initiations.</li>
      </ul>

      <h3>Growth of the margin</h3>
      <p>A logarithmic spiral turning at a constant rate corresponds to growth at a constant relative rate, so every whorl gets the same simulation time. But the margin gets longer as the shell grows. With <strong>cell insertion</strong>, new cells are added at random positions in proportion to the size of the shell: pattern elements keep their absolute size and new stripes are intercalated, as in many real shells. Without it, the number of cells is fixed and the pattern simply scales with the shell, which is closer to shells like <i>Cepaea</i>, whose bands are present from the apex and just widen.</p>

      <h3>From the record to the shell</h3>
      <p>The space–time record is wrapped onto the 3D surface: the position along the margin becomes the angle \\(\\varphi\\) around the aperture, and time becomes the coiling angle \\(\\theta\\). Fowler, Meinhardt and Prusinkiewicz (1992) combined both models in exactly this way, joining Raup's geometry with Meinhardt's pigmentation.</p>

      <h3>Simplifications</h3>
      <p>The equations are integrated with an explicit Euler scheme, choosing a time step small enough to be stable, on a margin of 256 cells. The pigment shown is the activator concentration, rescaled to the 2–99.5 % range. The presets are approximate reproductions of the pattern types, not fits to real specimens.</p>

      <h3>References</h3>
      ${MEIN_REFS}`,
    'info.app': `
      <h3>How the app works</h3>
      <ul>
        <li>The surface is evaluated on a grid of \\(\\theta \\times \\varphi\\) points and each cell is split into two triangles. It is regenerated on every slider change.</li>
        <li>Lines of constant \\(\\varphi\\) are <em>spiral lines</em>; lines of constant \\(\\theta\\) are <em>growth lines</em>, the successive positions of the aperture.</li>
        <li>The shell is centred and scaled to a fixed size, so the coordinates are relative: only the shape matters, not the absolute size.</li>
        <li>In line mode, hidden lines are removed by drawing the surface into the depth buffer only.</li>
        <li>The axes gizmo shows the \\(x, y, z\\) frame of the equation (\\(z\\) = coiling axis). The view buttons use the standard orientations of malacology: apertural, dorsal (abapertural), apical, umbilical and profile.</li>
        <li>The pigmentation is simulated in a background thread (a Web Worker) and applied to the mesh as a texture: the position along the aperture is the horizontal texture coordinate and \\(\\theta\\) the vertical one.</li>
        <li>Built with Three.js (WebGL) and MathJax. The current shell is stored in the URL, so you can share a link to it.</li>
      </ul>

      <h3>Contact</h3>
      <p>For any questions or comments, contact <strong>Alberto González Casarrubios</strong> (Universidad Complutense de Madrid): <a href="mailto:albert23@ucm.es">albert23@ucm.es</a>.</p>

      <h3>License</h3>
      <p>This work is licensed under <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener">Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)</a>. You may share and adapt it as long as you give appropriate credit, but not for commercial purposes.</p>`,
  },

  es: {
    'doc.title': 'Morfología teórica de conchas',
    'brand.subtitle': 'Modelo de enrollamiento de Raup (1962, 1966)',
    'lang.label': 'Idioma',
    'preset.title': 'Preset',
    'preset.custom': 'Personalizado',
    'raup.title': 'Parámetros de Raup',
    'geo.title': 'Geometría',
    'geo.hand': 'Sentido',
    'geo.dextral': 'Dextral',
    'geo.sinistral': 'Sinistral',
    'geo.mirror': 'Valva especular',
    'geo.mirror.hint': 'Duplica la concha reflejada respecto al plano de la apertura (bivalvos)',
    'geo.grow': 'Animar crecimiento',
    'geo.stop': 'Detener',
    'morpho.title': 'Morfoespacio W – D',
    'morpho.hint': 'Haz clic o arrastra para elegir W y D. Las regiones son aproximadas (según Raup, 1966).',
    'morpho.touch': 'D = 1/W',
    'morpho.open': 'vueltas sin contacto (T = 0)',
    'morpho.ammonoids': 'Ammonoideos',
    'morpho.gastropods': 'Gasterópodos',
    'morpho.bivalves': 'Bivalvos y braquiópodos',
    'look.title': 'Apariencia',
    'look.colors': 'Colores',
    'scale.hint': 'Escala del slider: lineal 1–10 (caracoles, ammonites) o logarítmica 1–10⁴ (bivalvos)',
    'look.palette': 'Paletas de color',
    'palette.light': 'Claro',
    'palette.dark': 'Oscuro',
    'palette.hint': 'Restaura una combinación de colores predefinida',
    'look.lines': 'Líneas',
    'look.shell': 'Concha',
    'look.bg': 'Fondo',
    'look.quality': 'Resolución de la malla',
    'look.low': 'Baja',
    'look.medium': 'Media',
    'look.high': 'Alta',
    'look.hideHidden': 'Ocultar líneas traseras',
    'look.bands': 'Bandas de crecimiento (sólido)',
    'look.axis': 'Mostrar eje de enrollamiento',
    'look.autoRotate': 'Autorrotación',
    'export.title': 'Exportar',
    'export.png': 'Guardar PNG',
    'export.stl': 'STL (80 mm)',
    'export.stl.hint': 'Malla sólida para impresión 3D / CAD. La apertura está abierta, así que no es estanca.',
    'mode.lines': 'Líneas',
    'mode.solid': 'Sólido',
    'mode.both': 'Ambos',
    'mode.label': 'Modo de render',
    'tb.equation': 'Ecuación',
    'tb.info': 'Info',
    'tb.axes': 'Ejes',
    'tab.shape': 'Forma · Raup',
    'tab.pigment': 'Pigmento · Meinhardt',
    'tab.label': 'Secciones',
    'pig.apply': 'Aplicar patrón a la concha',
    'pig.theory': 'Teoría del modelo →',
    'pig.apply.hint': 'Colorea la concha con la pigmentación simulada en lugar de un color sólido',
    'pig.preset': 'Patrón',
    'pig.custom': 'Personalizado',
    'pig.spacetime': 'Registro espacio-tiempo',
    'pig.axis.x': '← borde de la apertura (x) →',
    'pig.axis.t': 'ápice → apertura (tiempo)',
    'pig.computing': 'Calculando…',
    'pig.colors': 'Colores del pigmento',
    'pig.base': 'Fondo',
    'pig.pigment': 'Pigmento',
    'pig.model': 'Modelo',
    'pig.model.AI': 'Activador-inhibidor',
    'pig.model.AS': 'Activador-sustrato',
    'pig.params': 'Parámetros',
    'pig.seed': 'Semilla',
    'pig.newSeed': 'Nueva semilla',
    'pig.insertion': 'Inserción de células (el borde crece con la concha)',
    'pig.save': 'Guardar patrón PNG',
    'pig.note': 'El patrón se dibuja sobre la concha en los modos Sólido y Ambos. Sin él, la concha mantiene su color sólido.',
    'info.page.raup': 'Raup · forma',
    'info.page.meinhardt': 'Meinhardt · pigmento',
    'info.page.app': 'App y créditos',
    'info.pages': 'Secciones de la información',
    'tb.fullscreen': 'Pantalla completa',
    'tb.exitFullscreen': 'Salir de pantalla completa',
    'tb.fullscreen.hint': 'Ver la vista 3D a pantalla completa (F)',
    'tb.hideInfo': 'Ocultar info',
    'tb.hideInfo.hint': 'Oculta todos los paneles y controles para ver solo la concha (H)',
    'tb.showInfo': 'Mostrar info',
    'tb.showInfo.hint': 'Vuelve a mostrar los paneles y controles (H o Esc)',
    'tb.axes.hint': 'Mostrar u ocultar el indicador de ejes x, y, z',
    'eq.title': 'Ecuación del modelo',
    'eq.general': 'Forma general',
    'eq.live': 'Con los valores actuales',
    'eq.close': 'Cerrar',
    'eq.chirality': String.raw`\(\varepsilon = -1\) dextral, \(\varepsilon = +1\) sinistral`,
    'eq.mirrorNote': 'Valva especular:',
    'views.label': 'Vistas estándar',
    'view.iso': '3/4',
    'view.apertural': 'Apertural',
    'view.dorsal': 'Dorsal',
    'view.apical': 'Apical',
    'view.umbilical': 'Umbilical',
    'view.profile': 'Perfil',
    'view.iso.hint': 'Perspectiva tres cuartos',
    'view.apertural.hint': 'Frente a la apertura, ápice arriba',
    'view.dorsal.hint': 'Vista abapertural, opuesta a la apertura',
    'view.apical.hint': 'Desde el ápice, a lo largo del eje (vista lateral de una concha planispiral)',
    'view.umbilical.hint': 'Desde la base, hacia el ombligo',
    'view.profile.hint': 'Vista lateral, apertura de canto',
    'hint.controls': 'Arrastrar: rotar · Rueda: zoom · Clic derecho: panear · F: pantalla completa · H: ocultar info',
    'hud.stats': (v, t) => `${v.toLocaleString('es')} vértices · ${t.toLocaleString('es')} triángulos`,
    loading: 'Cargando Three.js…',
    'info.title': 'Acerca de esta app',
    'info.close': 'Cerrar',
    'refs.short': 'Raup (1962) <i>Science</i> 138 · Raup (1966) <i>J. Paleontology</i> 40',
    params: {
      W: { name: 'Expansión de la espiral', desc: 'Factor de crecimiento de la apertura por vuelta' },
      D: { name: 'Distancia al eje', desc: 'Tamaño del ombligo: radio interno / externo de la apertura' },
      T: { name: 'Traslación vertical', desc: 'Desplazamiento a lo largo del eje por unidad de crecimiento radial' },
      S: { name: 'Forma de la apertura', desc: 'Razón de semiejes de la elipse (axial / radial)' },
      turns: { name: 'Número de vueltas', desc: 'Revoluciones desde el ápice hasta la apertura' },
      spiralLines: { name: 'Líneas espirales' },
      ringsPerTurn: { name: 'Líneas de crecimiento / vuelta' },
      lineWidth: { name: 'Grosor de línea (px)' },
      lineOpacity: { name: 'Opacidad de líneas' },
      Da: { name: 'Difusión del activador' },
      'D2.AI': { name: 'Difusión del inhibidor' },
      'D2.AS': { name: 'Difusión del sustrato' },
      ra: { name: 'Decaimiento del activador' },
      'r2.AI': { name: 'Decaimiento del inhibidor' },
      'r2.AS': { name: 'Decaimiento del sustrato' },
      kappa: { name: 'Saturación' },
      ba: { name: 'Producción basal del activador' },
      'b2.AI': { name: 'Producción basal del inhibidor' },
      'b2.AS': { name: 'Producción de sustrato' },
      noise: { name: 'Ruido entre células' },
      globalCtl: { name: 'Control global' },
      pT: { name: 'Tiempo (ápice → apertura)' },
    },
    patterns: {
      nautilus: 'Nautilus — rayas en llama',
      cepaea: 'Cepaea nemoralis — bandas espirales',
      oliva: 'Oliva porphyria — triángulos',
    },
    presets: {
      'Gasterópodos': 'Gasterópodos',
      'Cefalópodos': 'Cefalópodos',
      'Bivalvos': 'Bivalvos',
      caracol: 'Caracol de jardín (Cornu aspersum)',
      turritella: 'Turritella',
      trochus: 'Trompo (Trochus)',
      planorbis: 'Planorbis (planispiral)',
      physa: 'Physa (sinistral)',
      nautilus: 'Nautilus (Nautilus pompilius)',
      ammonite: 'Ammonite evoluto (Dactylioceras)',
      almeja: 'Almeja (Venus)',
    },
    'info.raup': `
      <blockquote class="quote">
        <p>“The basic form of many coiled gastropod shells can be defined by four parameters. A digital computer with automatic plotting equipment can be used to make graphical reconstructions of a shell from any given values of the four parameters.”</p>
        <cite>— David M. Raup, <i>Science</i> (1962)</cite>
        <p class="translation">«La forma básica de muchas conchas enrolladas de gasterópodos puede definirse mediante cuatro parámetros. Un ordenador digital con un trazador automático puede usarse para reconstruir gráficamente una concha a partir de cualquier valor de esos cuatro parámetros.»</p>
      </blockquote>

      <h3>El modelo de Raup</h3>
      <p>La mayoría de las conchas enrolladas —caracoles, ammonoideos, nautiloideos, almejas, braquiópodos— crecen añadiendo material en el borde de la apertura sin cambiar su forma global. Este tipo de crecimiento (autosemejante o <em>gnomónico</em>) describe una <strong>espiral logarítmica</strong>. A principios de los años 60 David M. Raup usó uno de los primeros trazadores por ordenador para dibujar conchas a partir de este principio, y en 1966 demostró que bastan cuatro parámetros para describir una enorme variedad de formas reales.</p>

      <h3>La ecuación</h3>
      <p>Una curva generadora —aquí una elipse que representa la apertura— está en un plano que contiene el eje de enrollamiento \\(z\\) y gira a su alrededor. Tras una revolución completa (\\(\\Delta\\theta = 2\\pi\\)) todas las dimensiones lineales se han multiplicado por \\(W\\), así que en el ángulo \\(\\theta\\) la escala es \\(W^{\\theta/2\\pi}\\):</p>
      ${GENERAL_TEX}
      ${DEFS_TEX}
      <ul>
        <li><strong>\\(W\\) — tasa de expansión.</strong> Cuánto crece la apertura en cada vuelta. Valores bajos dan muchas vueltas apretadas; valores muy altos, una concha que es casi toda apertura.</li>
        <li><strong>\\(D\\) — distancia al eje.</strong> Razón entre el borde interno y el externo de la apertura medidos desde el eje. \\(D = 0\\): las vueltas tocan el eje (sin ombligo); \\(D\\) grande: ombligo amplio.</li>
        <li><strong>\\(T\\) — tasa de traslación.</strong> Cuánto se desplaza la curva generadora a lo largo del eje respecto a su crecimiento radial. \\(T = 0\\) da una concha planispiral (nautilus, ammonites); valores altos, espiras altas (Turritella).</li>
        <li><strong>\\(S\\) — forma de la curva generadora.</strong> Razón entre el semieje axial y el radial de la elipse.</li>
        <li>\\(\\varepsilon\\) fija el sentido de enrollamiento: −1 dextral (horario visto desde el ápice), +1 sinistral. \\(N\\) es solo el número de vueltas dibujadas.</li>
      </ul>
      <p>Con esta normalización el borde externo de la apertura final está a distancia 1 del eje y el interno a distancia \\(D\\), como en la definición de Raup. El ápice está en el origen (\\(\\theta \\to -\\infty\\)).</p>

      <h3>Morfoespacio teórico</h3>
      <p>Cada combinación de \\(W, D, T, S\\) es un punto de un espacio de conchas posibles. En las conchas planispirales (\\(T = 0\\)) las vueltas sucesivas justo se tocan cuando \\(D = 1/W\\); por encima de esa curva se separan, una forma muy rara en la naturaleza. El gran hallazgo de Raup fue que las conchas reales ocupan solo pequeñas regiones de este espacio, lo que plantea por qué el resto está vacío: restricciones funcionales, de desarrollo o históricas. El panel <em>Morfoespacio</em> de la barra lateral muestra este plano.</p>

      <h3>Bivalvos</h3>
      <p>Las mismas ecuaciones producen las valvas de almejas, berberechos y mejillones. Cada valva es una espiral logarítmica con una <strong>\\(W\\) muy alta</strong> (aproximadamente \\(10^2\\)–\\(10^4\\) o más), \\(D\\) bajo y \\(T\\) pequeño, de modo que solo completa una fracción de vuelta: el umbo es el ápice. La segunda valva es aproximadamente la imagen especular respecto al plano de la apertura (la comisura), y es lo que dibuja el botón <em>Valva especular</em>:</p>
      ${MIRROR_TEX}
      <p>El modelo no incluye la charnela, el ligamento ni la ornamentación, y no representa conchas inequivalvas (ostras, vieiras) ni braquiópodos, cuyas dos valvas son distintas.</p>

      <h3>Referencias</h3>
      ${REFS}`,
    'info.meinhardt': `
      <h3>Pintar con química</h3>
      <p>Un molusco solo añade pigmento donde la concha crece: en el borde de la apertura. Lo que ocurre ahí, célula a célula, queda congelado en la concha a medida que crece. Un patrón de concha es, por tanto, un <strong>registro en el tiempo de un proceso unidimensional</strong>: la dirección a lo largo del borde es el espacio \\(x\\) y la dirección de crecimiento es el tiempo. Esta fue la idea clave de Hans Meinhardt, y por eso el panel de la pestaña <em>Pigmento</em> muestra un diagrama espacio-tiempo.</p>

      <h3>Activación local, inhibición de largo alcance</h3>
      <p>Siguiendo a Turing (1952), Gierer y Meinhardt (1972) mostraron que los patrones surgen espontáneamente de dos sustancias que interactúan: un <strong>activador</strong> \\(a\\) que estimula su propia producción (autocatálisis) y un antagonista que difunde más rápido y lo mantiene a raya. Un pequeño exceso aleatorio de activador crece localmente, mientras que el antagonista, que se extiende deprisa, impide la activación en los alrededores. El resultado es un patrón regular que nadie ha «dibujado».</p>

      <h3>Modelo activador-inhibidor</h3>
      ${AI_TEX}
      <ul>
        <li>\\(s\\) es la <em>densidad de fuente</em>: la capacidad de cada célula para llevar a cabo la reacción. Varía ligeramente de una célula a otra (el parámetro <em>ruido</em>), y eso es lo que pone en marcha los patrones.</li>
        <li>\\(r_a, r_h\\) son tasas de decaimiento y \\(D_a, D_h\\), de difusión; \\(b_a, b_h\\) son pequeñas producciones basales; \\(\\kappa\\) satura la autocatálisis y ensancha los picos.</li>
        <li>Si el inhibidor es rápido (\\(r_h > r_a\\)) y llega lejos (\\(D_h \\gg D_a\\)), los picos son <strong>estables en el tiempo</strong> y dibujan bandas en la dirección de crecimiento.</li>
        <li>Si el inhibidor vive más que el activador (\\(r_h < r_a\\)), cada brote de activación lo apaga su propio inhibidor y el sistema <strong>oscila</strong>, dibujando rayas paralelas al borde.</li>
      </ul>

      <h3>Modelo activador-sustrato</h3>
      ${AS_TEX}
      <p>Aquí la autocatálisis consume un sustrato \\(b\\) que se produce a ritmo \\(b_b\\). Donde la activación es alta, el sustrato se <strong>agota</strong>, y la célula necesita tiempo para recuperarse antes de poder activarse otra vez: queda <strong>refractaria</strong>. La activación pasa entonces a las células vecinas como una <strong>onda viajera</strong>, que dibuja una línea oblicua en la concha. Cuando dos ondas se encuentran se <strong>aniquilan</strong>, porque cada una choca con la estela refractaria de la otra, y las líneas forman una V.</p>

      <h3>Control global: los triángulos de <i>Oliva porphyria</i></h3>
      <p>Meinhardt y Klingler (1987) explicaron el patrón de tiendas de <i>Oliva</i> con una tercera sustancia compartida por todo el borde, como una hormona. Mide la actividad total: cuando las ondas se aniquilan y la actividad cae, la señal baja y facilita el disparo de ondas nuevas, que se dividen en nuevas líneas y cierran los triángulos. Esta app usa una versión simplificada de ese mecanismo:</p>
      ${GLOBAL_TEX}

      <h3>Qué patrón sale de cada dinámica</h3>
      <ul>
        <li><strong>Bandas a lo largo de la espiral</strong> (<i>Cepaea nemoralis</i>): picos estables del activador.</li>
        <li><strong>Rayas paralelas al borde</strong> (las llamas de <i>Nautilus</i>): oscilación; la irregularidad viene del acoplamiento débil entre células.</li>
        <li><strong>Líneas oblicuas, zigzags y triángulos</strong> (<i>Oliva</i>, muchos <i>Conus</i>): ondas viajeras, sus choques y nuevos disparos.</li>
      </ul>

      <h3>El crecimiento del borde</h3>
      <p>Una espiral logarítmica que gira a ritmo constante corresponde a un crecimiento con tasa relativa constante, así que cada vuelta recibe el mismo tiempo de simulación. Pero el borde se alarga a medida que la concha crece. Con <strong>inserción de células</strong>, se añaden células nuevas en posiciones al azar en proporción al tamaño de la concha: los elementos del patrón mantienen su tamaño absoluto y aparecen rayas nuevas intercaladas, como en muchas conchas reales. Sin ella, el número de células es fijo y el patrón simplemente escala con la concha, lo que se parece más a conchas como <i>Cepaea</i>, cuyas bandas existen desde el ápice y solo se ensanchan.</p>

      <h3>Del registro a la concha</h3>
      <p>El registro espacio-tiempo se envuelve sobre la superficie 3D: la posición a lo largo del borde pasa a ser el ángulo \\(\\varphi\\) alrededor de la apertura, y el tiempo, el ángulo de enrollamiento \\(\\theta\\). Fowler, Meinhardt y Prusinkiewicz (1992) combinaron los dos modelos exactamente así, uniendo la geometría de Raup con la pigmentación de Meinhardt.</p>

      <h3>Simplificaciones</h3>
      <p>Las ecuaciones se integran con un esquema de Euler explícito, con un paso de tiempo lo bastante pequeño para ser estable, sobre un borde de 256 células. El pigmento que se muestra es la concentración de activador, reescalada al intervalo entre los percentiles 2 y 99,5. Los presets son reproducciones aproximadas de los tipos de patrón, no ajustes a ejemplares reales.</p>

      <h3>Referencias</h3>
      ${MEIN_REFS}`,
    'info.app': `
      <h3>Cómo funciona la app</h3>
      <ul>
        <li>La superficie se evalúa en una rejilla de puntos \\(\\theta \\times \\varphi\\) y cada celda se divide en dos triángulos. Se regenera con cada cambio de los sliders.</li>
        <li>Las líneas de \\(\\varphi\\) constante son <em>líneas espirales</em>; las de \\(\\theta\\) constante son <em>líneas de crecimiento</em>, las posiciones sucesivas de la apertura.</li>
        <li>La concha se centra y escala a un tamaño fijo, así que las coordenadas son relativas: importa la forma, no el tamaño absoluto.</li>
        <li>En el modo líneas, las líneas ocultas se eliminan dibujando la superficie solo en el búfer de profundidad.</li>
        <li>El indicador de ejes muestra el sistema \\(x, y, z\\) de la ecuación (\\(z\\) = eje de enrollamiento). Los botones de vista usan las orientaciones estándar en malacología: apertural, dorsal (abapertural), apical, umbilical y perfil.</li>
        <li>La pigmentación se simula en un hilo aparte (un Web Worker) y se aplica a la malla como textura: la posición a lo largo de la apertura es la coordenada horizontal de la textura y \\(\\theta\\), la vertical.</li>
        <li>Hecha con Three.js (WebGL) y MathJax. La concha actual se guarda en la URL, así que puedes compartir un enlace a ella.</li>
      </ul>

      <h3>Contacto</h3>
      <p>Para cualquier duda o comentario, contacta con <strong>Alberto González Casarrubios</strong> (Universidad Complutense de Madrid): <a href="mailto:albert23@ucm.es">albert23@ucm.es</a>.</p>

      <h3>Licencia</h3>
      <p>Esta obra está bajo una licencia <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener">Creative Commons Atribución-NoComercial 4.0 Internacional (CC BY-NC 4.0)</a>. Puedes compartirla y adaptarla siempre que reconozcas la autoría, pero no con fines comerciales.</p>`,
  },
};

export { GENERAL_TEX, DEFS_TEX, MIRROR_TEX };

let current = 'en';

export function setLang(lang) {
  current = STRINGS[lang] ? lang : 'en';
  return current;
}

export function getLang() {
  return current;
}

/** Texto para la clave dada; las funciones se llaman con los argumentos extra. */
export function t(key, ...args) {
  const v = STRINGS[current][key] ?? STRINGS.en[key] ?? key;
  return typeof v === 'function' ? v(...args) : v;
}

export function tParam(key) {
  return STRINGS[current].params[key] || {};
}

export function tPattern(key) {
  return STRINGS[current].patterns[key] || key;
}

export function tPreset(key) {
  return STRINGS[current].presets[key] || key;
}

/** Aplica las traducciones a los elementos estáticos con atributos data-i18n*. */
export function applyStatic(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll('[data-i18n-html]').forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
    // los grupos y botones sin texto visible necesitan nombre accesible
    if (!el.textContent.trim() || el.getAttribute('role')) el.setAttribute('aria-label', el.title);
  });
  document.documentElement.lang = current;
  document.title = t('doc.title');
}
