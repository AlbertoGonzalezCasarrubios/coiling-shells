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

const GLOBAL_TEX = String.raw`\[ \frac{dc}{dt} = 0.02\,\big(\langle a \rangle - c\big), \qquad b_a^{\mathrm{ef}} = b_a + \frac{g}{1 + 40\,c} \]`;

const MEIN_REFS = `
  <ul class="refs-list">
    <li>Turing, A. M. (1952). The chemical basis of morphogenesis. <i>Phil. Trans. R. Soc. B</i> 237, 37–72.</li>
    <li>Gierer, A. &amp; Meinhardt, H. (1972). A theory of biological pattern formation. <i>Kybernetik</i> 12, 30–39.</li>
    <li>Ermentrout, B., Campbell, J. &amp; Oster, G. (1986). A model for shell patterns based on neural activity. <i>The Veliger</i> 28, 369–388.</li>
    <li>Meinhardt, H. &amp; Klingler, M. (1987). A model for pattern formation on the shells of molluscs. <i>J. Theor. Biol.</i> 126, 63–89.</li>
    <li>Fowler, D. R., Meinhardt, H. &amp; Prusinkiewicz, P. (1992). Modeling seashells. <i>Computer Graphics (SIGGRAPH '92)</i> 26(2), 379–387.</li>
    <li>Meinhardt, H. (2009). <i>The Algorithmic Beauty of Sea Shells</i>, 4th ed. Springer.</li>
  </ul>`;

export const STRINGS = {
  en: {
    'doc.title': 'Theoretical Shells: Form and Colour',
    'brand.subtitle': "Raup's coiling model · Meinhardt's pigmentation models",
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
    'tb.graphs': 'Graphs',
    'tb.graphs.hint': 'Show charts on top of the 3D view',
    'graphs.morpho': 'Position in the morphospace (W – D)',
    'graphs.profile': 'Activator and inhibitor on the margin',
    'graphs.profile.empty': 'Choose a pattern in the Pigment tab to see the activator and the inhibitor or substrate along the margin.',
    'graphs.time': 'Moment of growth shown in the profile',
    'tab.shape': 'Shape · Raup',
    'tab.pigment': 'Pigment · Meinhardt',
    'tab.label': 'Sections',
    'pig.theory': 'Theory →',
    'pig.none': 'Solid colour',
    'pig.mode': 'Controls',
    'pig.mode.simple': 'Simple',
    'pig.mode.advanced': 'Advanced',
    'pig.profile': 'Margin profile',
    'pig.profile.a': 'Activator a',
    'pig.profile.h': 'Inhibitor h',
    'pig.profile.b': 'Substrate b',
    'pig.profile.threshold': 'pigment threshold',
    'pig.profile.time': 'time',
    'pig.profile.hint': 'Concentrations along the aperture margin at one moment, each relative to its maximum. Click or drag on the space–time record to choose the moment. Pigment is laid down where the activator rises above the threshold.',
    'pig.state.extinct': 'No pattern: with these values the activator dies out and the shell stays unpigmented. Try a preset or one of the recipes below.',
    'pig.state.uniform': 'No pattern: with these values the margin stays uniform. Try a preset or one of the recipes below.',
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
    'pig.recipes': '<strong>How to change the type of pattern</strong><ul><li><b>Bands along the spiral</b>: activator–inhibitor with a far-reaching inhibitor (D<sub>h</sub> ≫ D<sub>a</sub>) that is faster than the activator (r<sub>h</sub> &gt; r<sub>a</sub>).</li><li><b>Stripes parallel to the margin</b>: activator–inhibitor with D<sub>h</sub> ≈ 0 (far left) and a longer-lived inhibitor (r<sub>h</sub> &lt; r<sub>a</sub>).</li><li><b>Oblique lines and triangles</b>: activator–substrate with a slowly recovering substrate (small b<sub>b</sub>); global control g &gt; 0 for triangles.</li></ul>',
    'pig.params': 'Pattern controls',
    'pig.advanced': 'Advanced: model constants',
    'pig.advanced.hint': 'Every constant of the equations. The constants span several orders of magnitude, so their sliders are logarithmic; the leftmost position is 0, which switches that term off. Near some values the pattern jumps from one type to another: these are real thresholds of the model. Changing the model loads constants that work for it.',
    'eq.mein.note': 'x: position along the margin (in cells) · t: time · s: source density of each cell',
    'pig.seed': 'Seed',
    'pig.newSeed': 'New seed',
    'pig.insertion': 'Growing margin (cell insertion)',
    'pig.insertion.desc': 'On: new cells are added to the margin as the shell grows, so pattern elements keep their real size and new stripes appear between the old ones. Off: the margin always has the same cells and the whole pattern simply grows with the shell.',
    'pig.save': 'Save pattern PNG',
    'pig.note': 'The shell starts in a plain colour. Choose a pattern to paint it; each one is computed from Meinhardt’s equations, not drawn. “Solid colour” takes you back to a plain shell.',
    'info.page.raup': 'Raup · shape',
    'info.page.meinhardt': 'Meinhardt · pigment',
    'info.page.app': 'Credits',
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
    loading: 'Loading Three.js…',
    'info.title': 'About',
    'info.close': 'Close',
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
      Da: { name: 'Activator diffusion', desc: 'How fast the activator spreads to neighbouring cells' },
      'D2.AI': { name: 'Inhibitor diffusion', desc: 'Range of the inhibition: high values give stable bands; near 0, oscillations and stripes' },
      'D2.AS': { name: 'Substrate diffusion', desc: 'How fast the substrate spreads back into depleted cells' },
      ra: { name: 'Activator decay', desc: 'Higher values, shorter-lived activator; it also sets the time scale of the pattern' },
      'r2.AI': { name: 'Inhibitor decay', desc: 'Below the activator decay, the inhibitor outlives the activator and the margin oscillates' },
      'r2.AS': { name: 'Substrate decay', desc: 'Loss of substrate in addition to its consumption by the reaction' },
      kappa: { name: 'Saturation', desc: 'Limits self-enhancement: broader, flatter peaks' },
      ba: { name: 'Basal activator production', desc: 'A little activator everywhere, so activation can start again' },
      'b2.AI': { name: 'Basal inhibitor production', desc: 'A little inhibitor everywhere: makes activation harder to start' },
      'b2.AS': { name: 'Substrate production', desc: 'How fast the substrate is replenished: low values, slow recovery and wide gaps between waves' },
      noise: { name: 'Cell-to-cell noise' },
      globalCtl: { name: 'Global control', desc: 'Strength of the hormone-like signal that triggers new waves when total activity drops' },
      pT: { name: 'Growth time', desc: 'Simulated time from apex to aperture: more time, more stripes along the direction of growth' },
      pSize: { name: 'Pattern size', desc: 'Sets the number of cells along the margin: a larger pattern means fewer cells' },
      pNoise: { name: 'Irregularity', desc: 'Differences between cells (σ): from regular to irregular patterns' },
      pAmount: { name: 'Pigment amount', desc: 'Lowers or raises the threshold above which pigment is laid down; it does not change the simulation' },
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

      <h3>Growing without changing shape</h3>
      <p>A snail, an ammonite or a clam never remodels the part of the shell it has already built: it only adds new material at the edge of the aperture. If each new increment has the same proportions as the previous one, the shell gets larger but keeps its shape. This is called <strong>gnomonic</strong> or self-similar growth, and the curve that grows in this way is the <strong>logarithmic spiral</strong>, in which the distance to the centre is multiplied by the same factor in every turn. That is why a young snail looks like a scaled-down copy of an adult.</p>
      <p>In the 1960s the palaeontologist David M. Raup turned this principle into a computer program that could draw a coiled shell from just four numbers. This let him explore not only the shells that exist, but every shell that <em>could</em> exist.</p>

      <h3>The four parameters</h3>
      <p>Imagine the aperture as a closed curve, here an ellipse, lying in a plane that contains the coiling axis. As the animal grows, this curve turns around the axis, gets larger and slides along the axis. Four numbers describe that movement:</p>
      <ul>
        <li><strong>\\(W\\) — whorl expansion rate.</strong> The factor by which the aperture grows in one full turn: with \\(W = 2\\) each whorl is twice as large as the one before. Low values (about 1.2 to 3) give many tightly packed whorls, as in most snails and ammonites. Very high values (hundreds to thousands) give a shell that is almost all aperture and completes only a small fraction of a turn, as in clams.</li>
        <li><strong>\\(D\\) — distance from the axis.</strong> The distance from the axis to the inner edge of the aperture, divided by the distance to its outer edge. With \\(D = 0\\) the inner edge touches the axis, so the whorls close it up (no umbilicus). As \\(D\\) increases, a hollow opens along the axis (the umbilicus), until the tube coils loosely like a ram's horn.</li>
        <li><strong>\\(T\\) — translation rate.</strong> How far the aperture slides along the axis compared with how far it moves away from it. With \\(T = 0\\) all the whorls lie in one plane (planispiral shells such as the nautilus, ammonites or <i>Planorbis</i>). Small values give low spires, as in the garden snail or <i>Trochus</i>; large values give tall, slender spires, as in <i>Turritella</i>.</li>
        <li><strong>\\(S\\) — shape of the aperture.</strong> The ratio between the axial and the radial semi-axis of the ellipse. \\(S = 1\\) is a circle, \\(S > 1\\) an aperture taller than it is wide, and \\(S < 1\\) a flattened one.</li>
      </ul>
      <p>Two more settings are needed to draw a shell, although they do not change its proportions. The <strong>coiling direction</strong>: most snails are <em>dextral</em>, so with the apex up and the aperture facing you the aperture is on the right; <em>sinistral</em> shells, such as <i>Physa</i>, are their mirror images. And the <strong>number of whorls</strong> \\(N\\), which only sets how much of the spiral is drawn.</p>

      <h3>The equation</h3>
      <p>Each point of the shell is located by two angles. \\(\\theta\\) says how far along the spiral it is: \\(\\theta = 0\\) is the final aperture and negative values go back towards the apex. \\(\\varphi\\) says where it is around the aperture. After one full turn (\\(\\Delta\\theta = 2\\pi\\)) all lengths have been multiplied by \\(W\\), so at angle \\(\\theta\\) the scale factor is \\(W^{\\theta/2\\pi}\\):</p>
      ${GENERAL_TEX}
      ${DEFS_TEX}
      <p>The bracket contains the aperture: an ellipse with radial semi-axis \\(a\\) and axial semi-axis \\(b = S\\,a\\), whose centre lies at distance \\(r_c\\) from the axis. The factors \\(\\cos\\theta\\) and \\(\\sin\\theta\\) make it turn around the axis, the term \\(-T\\,r_c\\) moves it along the axis, and the factor in front makes it grow. \\(\\varepsilon = -1\\) for dextral shells and \\(+1\\) for sinistral ones.</p>
      <p>With this normalisation the final aperture has its outer edge at distance 1 from the axis and its inner edge at distance \\(D\\), exactly as Raup defined it. The apex is at the origin, which the spiral approaches without ever reaching (\\(\\theta \\to -\\infty\\)).</p>

      <h3>Reading the drawing</h3>
      <p>In line mode the grid itself shows the geometry. Lines that run along the spiral (constant \\(\\varphi\\)) follow the path of one point of the aperture as the shell grows, like the spiral cords of many snails. Lines that go around the tube (constant \\(\\theta\\)) are <strong>growth lines</strong>: successive positions of the aperture, like the fine growth lines visible on real shells.</p>
      <p>The view buttons give the standard orientations used in malacology: <em>apertural</em> (facing the aperture, apex up), <em>dorsal</em> or abapertural (from the opposite side), <em>apical</em> (from the apex, looking down the axis), <em>umbilical</em> (from below) and <em>profile</em> (from the side, with the aperture seen edge-on).</p>

      <h3>Theoretical morphospace</h3>
      <p>Every combination of \\(W, D, T\\) and \\(S\\) is a point in a space of possible shells: the <strong>theoretical morphospace</strong>. Raup drew it as a cube with axes \\(W\\), \\(D\\) and \\(T\\). For planispiral shells there is an important boundary in the \\(W\\)–\\(D\\) plane: successive whorls just touch when \\(D = 1/W\\). Below that curve each whorl overlaps the one before; above it the whorls separate and the tube coils freely, a form that is rare (it occurs in some fossil groups, in a few snails and in the living cephalopod <i>Spirula</i>).</p>
      <p>When Raup placed real shells in this space, he found that they occupy only a few small regions. Most gastropods have low \\(W\\) and small \\(D\\); ammonoids have low \\(W\\) and a wider range of \\(D\\); bivalves and brachiopods have very high \\(W\\). Most of the space is empty. Some of the missing forms would be mechanically weak or impractical to live in, some cannot be built by the way a particular group grows, and some simply never evolved. The morphospace turns this question into something that can be measured and compared.</p>
      <p>The <em>Morphospace</em> panel in the sidebar shows where the current shell lies; it can also be shown on the 3D view from the <em>Graphs</em> menu. Click or drag on it to move to another point.</p>

      <h3>Bivalves</h3>
      <p>The same equation produces the valves of clams and cockles. Each valve is a logarithmic spiral with a very high \\(W\\) (roughly \\(10^2\\) to \\(10^4\\) or more), a small \\(D\\) and a small \\(T\\), so it completes only part of a turn. The beak, or umbo, is the apex. A higher \\(W\\) gives a flatter valve; a lower \\(W\\) gives a prominent, curled umbo.</p>
      <p>In equivalve bivalves the second valve is the mirror image of the first across the plane where the two valves meet (the commissure). This is what the <em>Mirror valve</em> button draws:</p>
      ${MIRROR_TEX}
      <p>The mirror construction does not apply to oysters and scallops, whose two valves are different, or to brachiopods: although they look like clams, their two valves are dorsal and ventral rather than left and right, and are not mirror images of each other.</p>

      <h3>What the model leaves out</h3>
      <p>Raup's model is deliberately minimal. It assumes that the aperture keeps the same shape and orientation throughout life, so it ignores changes of proportion with age (allometry). It also assumes that the aperture lies in a plane containing the axis and that growth is perfectly regular. It does not include ornament (ribs, spines, varices, keels), the thickened lip of adult snails, internal structures such as the septa of ammonites and nautiloids, or the hinge of bivalves. Its value is not in reproducing one species in detail, but in showing how much of the diversity of shells follows from a few simple rules of growth.</p>

      <h3>References</h3>
      ${REFS}`,
    'info.meinhardt': `
      <h3>A pattern that records its own history</h3>
      <p>A mollusc can only add pigment where it adds shell: along the edge of the aperture, where the mantle secretes new material. Once laid down, the pigment cannot be changed; the shell simply grows beyond it. A shell pattern is therefore a <strong>record in time of a one-dimensional process</strong>. The direction along the margin is space (\\(x\\)) and the direction of growth is time. Reading a shell from the apex to the aperture is like watching, frame by frame, what happened along the margin throughout the animal's life.</p>
      <p>This was the central idea of Hans Meinhardt's work, and it is why the <em>Pigment</em> tab shows a <strong>space–time record</strong>: a flat image in which the horizontal axis is the margin and the vertical axis is time. That image is then wrapped onto the 3D shell.</p>

      <h3>Local activation and long-range inhibition</h3>
      <p>How can cells that only interact with their neighbours produce a regular pattern? Alan Turing (1952) showed that two substances that react and diffuse can break a uniform state on their own. Gierer and Meinhardt (1972) identified the essential ingredients: an <strong>activator</strong> that promotes its own production (autocatalysis), and an <strong>antagonist</strong> that acts over a longer distance.</p>
      <p>A small random excess of activator at one point grows, because the activator amplifies itself. The antagonist spreads further and suppresses activation in the surroundings. The result is a peak of activation with a zone of inhibition around it, so the margin fills with peaks at fairly regular distances. No cell "knows" the pattern: it emerges from the interactions. The antagonism can work in two ways, and each produces a different family of patterns.</p>

      <h3>Activator–inhibitor model</h3>
      ${AI_TEX}
      <p>The activator \\(a\\) promotes its own production (the term \\(a^2\\)) and also the production of an inhibitor \\(h\\), which slows it down (\\(h\\) in the denominator). Each substance decays at its own rate (\\(r_a\\), \\(r_h\\)) and spreads to neighbouring cells by diffusion (\\(D_a\\), \\(D_h\\)). The remaining terms are:</p>
      <ul>
        <li>\\(s\\), the <strong>source density</strong>: the ability of each cell to carry out the reaction. It varies slightly from one cell to the next, and these small differences are the seeds of the pattern.</li>
        <li>\\(b_a\\) and \\(b_h\\): small basal productions. \\(b_a\\) keeps a little activator everywhere, so activation can start again after it has faded.</li>
        <li>\\(\\kappa\\): saturation. Activator production cannot increase without limit, so the peaks become broader and flatter.</li>
      </ul>
      <p>The type of pattern depends mainly on how fast and how far the inhibitor acts compared with the activator:</p>
      <ul>
        <li>If the inhibitor spreads much further than the activator (\\(D_h \\gg D_a\\)) and reacts quickly (\\(r_h > r_a\\)), the peaks are <strong>stable</strong>. Each active spot on the margin stays active for a long time and draws a <strong>band along the direction of growth</strong>.</li>
        <li>If the inhibitor barely spreads but lasts longer than the activator (\\(r_h < r_a\\)), each burst of activation builds up the inhibitor that later switches it off, and the cell <strong>oscillates</strong>. Neighbouring cells pull each other into step, so they switch on and off together, and each burst draws a <strong>stripe parallel to the margin</strong>, that is, parallel to the growth lines.</li>
      </ul>

      <h3>Activator–substrate model</h3>
      ${AS_TEX}
      <p>Here the antagonist is not an inhibitor but a <strong>substrate</strong> \\(b\\) that the activator needs and <strong>consumes</strong>. The substrate is produced everywhere at rate \\(b_b\\) and spreads by diffusion (\\(D_b\\)). Where activation is high, the substrate is used up and the activation cannot last there. It passes to the neighbouring cells, which still have substrate, while the cell left behind becomes <strong>refractory</strong>: it needs time to rebuild its substrate before it can be activated again.</p>
      <p>Activation therefore travels along the margin as a <strong>wave</strong>, and as the shell grows the moving wave leaves an <strong>oblique line</strong>. When two waves moving in opposite directions meet, each runs into the depleted wake of the other and both <strong>disappear</strong>, closing a V. Where the substrate has recovered, a new wave can start spontaneously and split into two waves moving apart, which opens an inverted V.</p>

      <h3>Global control: the triangles of <i>Oliva porphyria</i></h3>
      <p>Annihilating and branching waves produce zigzags, but not the large triangles of <i>Oliva porphyria</i>, where new lines start at many places at the same time. Meinhardt and Klingler (1987) explained them with an additional substance shared by the whole animal, like a hormone. It measures the total activity of the margin: when many waves annihilate and activity drops, the signal falls, and this makes it easier for new waves to start everywhere. This app uses a simplified version of the mechanism, which acts on the basal activator production:</p>
      ${GLOBAL_TEX}
      <p>\\(c\\) follows the mean activator \\(\\langle a \\rangle\\) with a delay, and \\(g\\) sets the strength of the control. With \\(g = 0\\) there is no global signal.</p>

      <h3>Which pattern comes from which mechanism</h3>
      <ul>
        <li><strong>Bands along the spiral</strong>, as in the banded snail <i>Cepaea nemoralis</i>: stable activator peaks (activator–inhibitor with a far-reaching inhibitor).</li>
        <li><strong>Stripes parallel to the growth lines</strong>, like the flames of <i>Nautilus</i>: oscillations synchronised between neighbouring cells (activator–inhibitor with a long-lived inhibitor). Their irregular, branching outline comes from the differences between cells.</li>
        <li><strong>Oblique lines, zigzags and triangles</strong>, as in <i>Oliva</i> and many cone shells: travelling waves, their annihilation and branching and, for the triangles, global control (activator–substrate).</li>
      </ul>
      <p>A small change in a single constant can turn one type into another. The same mechanism, with slightly different rates, explains very different shells.</p>

      <h3>Seeing the antagonist at work</h3>
      <p>The pigment only shows the activator, but the antagonist is what shapes it. The <em>margin profile</em> plots, for one moment of growth, the activator and the inhibitor (or substrate) along the margin, together with the pigment threshold. In a band pattern each activator peak sits on a broad cushion of inhibitor; in a wave pattern the substrate drops just behind each moving peak. Choose the moment by clicking on the space–time record in the advanced controls, or with the slider of the profile shown on the 3D view (<em>Graphs</em> menu).</p>

      <h3>A margin that grows</h3>
      <p>A logarithmic spiral turning at a constant rate means that the shell grows at a constant relative rate, so each whorl takes the same amount of time. But the margin also gets longer: with \\(W = 2\\) the perimeter of the aperture doubles in every whorl. There are two possibilities.</p>
      <ul>
        <li>If <strong>new cells are inserted</strong> into the margin as it grows, the pattern elements keep their real size and new stripes or bands appear between the old ones, as in many real shells.</li>
        <li>If the number of cells stays fixed, the cells simply become larger and the whole pattern widens with the shell, like the bands of <i>Cepaea</i>, which are already present near the apex and only broaden.</li>
      </ul>
      <p>The <em>Growing margin</em> option, in the advanced controls, chooses between the two.</p>

      <h3>From the record to the shell</h3>
      <p>The space–time record is wrapped onto Raup's surface: the position along the margin becomes the angle \\(\\varphi\\) around the aperture, and time becomes the coiling angle \\(\\theta\\). Fowler, Meinhardt and Prusinkiewicz (1992) joined the two models in this way. Pigment is laid down wherever the activator exceeds a threshold, so the edges of the pattern are sharp. Only the outer layer of the shell is pigmented, so the inside of the aperture is shown without pigment, with a light pearly sheen.</p>

      <h3>What the controls mean</h3>
      <ul>
        <li><strong>Pattern size</strong>: the number of cells along the margin. Diffusion acts between neighbouring cells, so with fewer cells each element covers a larger part of the shell.</li>
        <li><strong>Growth time</strong>: the time covered from the apex to the aperture. With more time, oscillations and waves complete more cycles and leave more stripes and lines.</li>
        <li><strong>Irregularity</strong>: how much the source density varies between cells. Low values give regular patterns; high values give irregular, branching ones.</li>
        <li><strong>Pigment amount</strong>: moves the threshold above which pigment is laid down. It makes the dark areas wider or narrower without changing the dynamics underneath.</li>
        <li><strong>Seed</strong>: chooses the random differences between cells. Each seed gives a different but equally valid individual, just as no two shells of the same species are identical.</li>
      </ul>
      <p>The advanced controls give access to every constant of the equations. Near certain values the pattern changes abruptly from one type to another: these are real thresholds of the model, not errors. If a combination forms no pattern at all, because the activator dies out or the margin stays uniform, the app says so instead of showing an empty shell.</p>

      <h3>Limits of the models</h3>
      <p>These are minimal models. The real molecules have not been identified in any mollusc, and the margin is treated as a closed ring of equivalent cells. Ermentrout, Campbell and Oster (1986) proposed instead that the pattern is controlled by nerves in the mantle, an idea that leads to very similar dynamics of local excitation and lateral inhibition. The presets reproduce the type of pattern of each species, not a fit to real specimens. Even so, the models capture something real: a few rules, with different rates, explain the whole range from bands and flames to zigzags and triangles, including details such as lines that branch or annihilate when they meet, which are seen on real shells.</p>

      <h3>References</h3>
      ${MEIN_REFS}`,
    'info.app': `
      <h3>Author</h3>
      <p><strong>Alberto González Casarrubios</strong>, Universidad Complutense de Madrid. For questions, suggestions or errors, write to <a href="mailto:albert23@ucm.es">albert23@ucm.es</a>.</p>

      <h3>How to cite</h3>
      <p>González Casarrubios, A. (2026). <i>Theoretical Shells: Form and Colour</i>. <a href="https://albertogonzalezcasarrubios.github.io/aplicaciones-varias/shells-morphology/" target="_blank" rel="noopener">albertogonzalezcasarrubios.github.io/aplicaciones-varias/shells-morphology</a></p>

      <h3>Source code</h3>
      <p>The source code and its technical documentation are on <a href="https://github.com/AlbertoGonzalezCasarrubios/aplicaciones-varias/tree/main/shells-morphology" target="_blank" rel="noopener">GitHub</a>.</p>

      <h3>License</h3>
      <p>This work is licensed under <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener">Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)</a>. You may share and adapt it as long as you give appropriate credit, but not for commercial purposes.</p>`,
  },

  es: {
    'doc.title': 'Conchas teóricas: forma y color',
    'brand.subtitle': 'Modelo de enrollamiento de Raup · modelos de pigmentación de Meinhardt',
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
    'tb.graphs': 'Gráficos',
    'tb.graphs.hint': 'Mostrar gráficos sobre la vista 3D',
    'graphs.morpho': 'Posición en el morfoespacio (W – D)',
    'graphs.profile': 'Activador e inhibidor en el borde',
    'graphs.profile.empty': 'Elige un patrón en la pestaña Pigmento para ver el activador y el inhibidor o el sustrato a lo largo del borde.',
    'graphs.time': 'Instante del crecimiento que muestra el perfil',
    'tab.shape': 'Forma · Raup',
    'tab.pigment': 'Pigmento · Meinhardt',
    'tab.label': 'Secciones',
    'pig.theory': 'Teoría →',
    'pig.none': 'Color sólido',
    'pig.mode': 'Controles',
    'pig.mode.simple': 'Simple',
    'pig.mode.advanced': 'Avanzado',
    'pig.profile': 'Perfil del borde',
    'pig.profile.a': 'Activador a',
    'pig.profile.h': 'Inhibidor h',
    'pig.profile.b': 'Sustrato b',
    'pig.profile.threshold': 'umbral de pigmento',
    'pig.profile.time': 'tiempo',
    'pig.profile.hint': 'Concentraciones a lo largo del borde de la apertura en un instante, cada una relativa a su máximo. Pincha o arrastra sobre el registro espacio-tiempo para elegir el instante. Se deposita pigmento donde el activador supera el umbral.',
    'pig.state.extinct': 'Sin patrón: con estos valores el activador se extingue y la concha queda sin pigmento. Prueba un preset o una de las recetas de abajo.',
    'pig.state.uniform': 'Sin patrón: con estos valores el borde queda uniforme. Prueba un preset o una de las recetas de abajo.',
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
    'pig.recipes': '<strong>Cómo cambiar de tipo de patrón</strong><ul><li><b>Bandas a lo largo de la espiral</b>: activador-inhibidor con un inhibidor de largo alcance (D<sub>h</sub> ≫ D<sub>a</sub>) más rápido que el activador (r<sub>h</sub> &gt; r<sub>a</sub>).</li><li><b>Rayas paralelas al borde</b>: activador-inhibidor con D<sub>h</sub> ≈ 0 (a la izquierda del todo) y un inhibidor de vida más larga (r<sub>h</sub> &lt; r<sub>a</sub>).</li><li><b>Líneas oblicuas y triángulos</b>: activador-sustrato con un sustrato que se recupera despacio (b<sub>b</sub> pequeño); control global g &gt; 0 para los triángulos.</li></ul>',
    'pig.params': 'Controles del patrón',
    'pig.advanced': 'Avanzado: constantes del modelo',
    'pig.advanced.hint': 'Todas las constantes de las ecuaciones. Abarcan varios órdenes de magnitud, así que sus sliders son logarítmicos; la posición de la izquierda del todo es 0 y anula ese término. Cerca de algunos valores el patrón salta de un tipo a otro: son umbrales reales del modelo. Al cambiar de modelo se cargan constantes que funcionan con él.',
    'eq.mein.note': 'x: posición a lo largo del borde (en células) · t: tiempo · s: densidad de fuente de cada célula',
    'pig.seed': 'Semilla',
    'pig.newSeed': 'Nueva semilla',
    'pig.insertion': 'Borde que crece (inserción de células)',
    'pig.insertion.desc': 'Activado: al crecer la concha se añaden células al borde, así que los elementos del patrón mantienen su tamaño real y aparecen rayas nuevas entre las antiguas. Desactivado: el borde tiene siempre las mismas células y todo el patrón simplemente crece con la concha.',
    'pig.save': 'Guardar patrón PNG',
    'pig.note': 'La concha empieza en un color liso. Elige un patrón para pintarla: cada uno se calcula con las ecuaciones de Meinhardt, no está dibujado. «Color sólido» vuelve a la concha lisa.',
    'info.page.raup': 'Raup · forma',
    'info.page.meinhardt': 'Meinhardt · pigmento',
    'info.page.app': 'Créditos',
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
    loading: 'Cargando Three.js…',
    'info.title': 'Información',
    'info.close': 'Cerrar',
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
      Da: { name: 'Difusión del activador', desc: 'Lo rápido que el activador pasa a las células vecinas' },
      'D2.AI': { name: 'Difusión del inhibidor', desc: 'Alcance de la inhibición: con valores altos, bandas estables; cerca de 0, oscilaciones y rayas' },
      'D2.AS': { name: 'Difusión del sustrato', desc: 'Lo rápido que el sustrato vuelve a las células agotadas' },
      ra: { name: 'Decaimiento del activador', desc: 'Con valores altos el activador dura menos; también marca la escala de tiempo del patrón' },
      'r2.AI': { name: 'Decaimiento del inhibidor', desc: 'Si es menor que el del activador, el inhibidor dura más y el borde oscila' },
      'r2.AS': { name: 'Decaimiento del sustrato', desc: 'Pérdida de sustrato aparte de la que consume la reacción' },
      kappa: { name: 'Saturación', desc: 'Limita la autocatálisis: picos más anchos y planos' },
      ba: { name: 'Producción basal del activador', desc: 'Un poco de activador en todas partes, para que la activación pueda reiniciarse' },
      'b2.AI': { name: 'Producción basal del inhibidor', desc: 'Un poco de inhibidor en todas partes: dificulta que empiece la activación' },
      'b2.AS': { name: 'Producción de sustrato', desc: 'Lo rápido que se repone el sustrato: con valores bajos se recupera despacio y las ondas quedan más separadas' },
      noise: { name: 'Ruido entre células' },
      globalCtl: { name: 'Control global', desc: 'Intensidad de la señal, parecida a una hormona, que dispara ondas nuevas cuando baja la actividad total' },
      pT: { name: 'Tiempo de crecimiento', desc: 'Tiempo simulado del ápice a la apertura: más tiempo, más rayas en la dirección de crecimiento' },
      pSize: { name: 'Tamaño del patrón', desc: 'Fija el número de células a lo largo del borde: un patrón mayor significa menos células' },
      pNoise: { name: 'Irregularidad', desc: 'Diferencias entre células (σ): de patrones regulares a irregulares' },
      pAmount: { name: 'Cantidad de pigmento', desc: 'Baja o sube el umbral a partir del cual se deposita pigmento; no cambia la simulación' },
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

      <h3>Crecer sin cambiar de forma</h3>
      <p>Un caracol, un ammonite o una almeja nunca rehacen la parte de la concha que ya han construido: solo añaden material nuevo en el borde de la apertura. Si cada incremento tiene las mismas proporciones que el anterior, la concha se hace más grande pero conserva su forma. Es el crecimiento <strong>gnomónico</strong> o autosemejante, y la curva que crece así es la <strong>espiral logarítmica</strong>: en cada vuelta, la distancia al centro se multiplica por el mismo factor. Por eso un caracol joven parece una copia a escala de un adulto.</p>
      <p>En los años 60, el paleontólogo David M. Raup convirtió este principio en un programa de ordenador capaz de dibujar una concha enrollada a partir de solo cuatro números. Así pudo estudiar no solo las conchas que existen, sino todas las que <em>podrían</em> existir.</p>

      <h3>Los cuatro parámetros</h3>
      <p>Imagina la apertura como una curva cerrada (aquí, una elipse) situada en un plano que contiene el eje de enrollamiento. A medida que el animal crece, esa curva gira alrededor del eje, aumenta de tamaño y se desliza a lo largo de él. Cuatro números describen ese movimiento:</p>
      <ul>
        <li><strong>\\(W\\): tasa de expansión de la espiral.</strong> Cuánto crece la apertura en una vuelta completa: con \\(W = 2\\), cada vuelta mide el doble que la anterior. Con valores bajos (entre 1,2 y 3, aproximadamente) salen muchas vueltas apretadas, como en la mayoría de caracoles y ammonites. Con valores muy altos (de cientos a miles), la concha es casi toda apertura y apenas recorre una fracción de vuelta, como en las almejas.</li>
        <li><strong>\\(D\\): distancia al eje.</strong> La distancia del eje al borde interno de la apertura dividida entre la distancia a su borde externo. Con \\(D = 0\\), el borde interno toca el eje y las vueltas lo cierran por completo (no hay ombligo). Al aumentar \\(D\\) se abre un hueco a lo largo del eje, el ombligo, hasta que el tubo se enrolla suelto, como un cuerno de carnero.</li>
        <li><strong>\\(T\\): tasa de traslación.</strong> Cuánto se desplaza la apertura a lo largo del eje en comparación con lo que se aleja de él. Con \\(T = 0\\), todas las vueltas quedan en un mismo plano: son las conchas planispirales, como el nautilus, los ammonites o <i>Planorbis</i>. Con valores pequeños, la espira es baja, como en el caracol de jardín o en <i>Trochus</i>; con valores grandes, alta y esbelta, como en <i>Turritella</i>.</li>
        <li><strong>\\(S\\): forma de la apertura.</strong> La razón entre el semieje axial y el radial de la elipse. \\(S = 1\\) es un círculo; con \\(S > 1\\), la apertura es más alta que ancha, y con \\(S < 1\\), aplanada.</li>
      </ul>
      <p>Para dibujar una concha hacen falta dos ajustes más, aunque no cambian sus proporciones. Uno es el <strong>sentido de enrollamiento</strong>. La mayoría de los caracoles son <em>dextrales</em>: con el ápice hacia arriba y la apertura de frente, la apertura queda a la derecha. Las conchas <em>sinistrales</em>, como las de <i>Physa</i>, son su imagen especular. El otro es el <strong>número de vueltas</strong> \\(N\\), que solo indica qué parte de la espiral se dibuja.</p>

      <h3>La ecuación</h3>
      <p>Cada punto de la concha se sitúa con dos ángulos. \\(\\theta\\) indica en qué punto de la espiral está: \\(\\theta = 0\\) es la apertura final, y los valores negativos retroceden hacia el ápice. \\(\\varphi\\) indica en qué posición del contorno de la apertura se encuentra. Tras una vuelta completa (\\(\\Delta\\theta = 2\\pi\\)), todas las longitudes se han multiplicado por \\(W\\), así que en el ángulo \\(\\theta\\) el factor de escala es \\(W^{\\theta/2\\pi}\\):</p>
      ${GENERAL_TEX}
      ${DEFS_TEX}
      <p>El paréntesis contiene la apertura: una elipse de semieje radial \\(a\\) y semieje axial \\(b = S\\,a\\), con el centro a una distancia \\(r_c\\) del eje. Los factores \\(\\cos\\theta\\) y \\(\\sin\\theta\\) la hacen girar alrededor del eje, el término \\(-T\\,r_c\\) la desplaza a lo largo de él y el factor de delante la hace crecer. \\(\\varepsilon\\) vale \\(-1\\) en las conchas dextrales y \\(+1\\) en las sinistrales.</p>
      <p>Con esta normalización, el borde externo de la apertura final queda a distancia 1 del eje y el interno a distancia \\(D\\), tal como lo definió Raup. El ápice está en el origen, al que la espiral se acerca sin llegar nunca (\\(\\theta \\to -\\infty\\)).</p>

      <h3>Cómo leer el dibujo</h3>
      <p>En el modo de líneas, la propia malla muestra la geometría. Las líneas que siguen la espiral (\\(\\varphi\\) constante) recorren el camino de un mismo punto de la apertura mientras la concha crece, como los cordones espirales de muchos caracoles. Las que rodean el tubo (\\(\\theta\\) constante) son <strong>líneas de crecimiento</strong>: las posiciones sucesivas de la apertura, como las finas líneas que se ven en las conchas reales.</p>
      <p>Los botones de vista dan las orientaciones estándar en malacología: <em>apertural</em> (de frente a la apertura, con el ápice arriba), <em>dorsal</em> o abapertural (desde el lado opuesto), <em>apical</em> (desde el ápice, mirando a lo largo del eje), <em>umbilical</em> (desde abajo) y <em>perfil</em> (de lado, con la apertura de canto).</p>

      <h3>El morfoespacio teórico</h3>
      <p>Cada combinación de \\(W, D, T\\) y \\(S\\) es un punto de un espacio de conchas posibles: el <strong>morfoespacio teórico</strong>. Raup lo representó como un cubo cuyos ejes son \\(W\\), \\(D\\) y \\(T\\). En las conchas planispirales hay un límite importante en el plano \\(W\\)–\\(D\\): las vueltas sucesivas justo se tocan cuando \\(D = 1/W\\). Por debajo de esa curva, cada vuelta se solapa con la anterior; por encima, las vueltas se separan y el tubo se enrolla suelto. Es una forma rara: aparece en algunos grupos fósiles, en unos pocos caracoles y en el cefalópodo actual <i>Spirula</i>.</p>
      <p>Cuando Raup situó conchas reales en este espacio, vio que solo ocupan unas pocas regiones pequeñas. La mayoría de los gasterópodos tienen \\(W\\) bajo y \\(D\\) pequeño; los ammonoideos, \\(W\\) bajo y un intervalo de \\(D\\) más amplio, y los bivalvos y braquiópodos, \\(W\\) muy alto. La mayor parte del espacio está vacía. Algunas de las formas ausentes serían mecánicamente débiles o poco prácticas para vivir; otras no pueden construirse con el modo de crecer de un grupo concreto, y otras, sencillamente, nunca evolucionaron. El morfoespacio convierte esta pregunta en algo que se puede medir y comparar.</p>
      <p>El panel <em>Morfoespacio</em> de la barra lateral muestra dónde está la concha actual, y también puede verse sobre la vista 3D desde el menú <em>Gráficos</em>. Haz clic o arrastra sobre él para moverte a otro punto.</p>

      <h3>Bivalvos</h3>
      <p>La misma ecuación produce las valvas de almejas y berberechos. Cada valva es una espiral logarítmica con una \\(W\\) muy alta (aproximadamente entre \\(10^2\\) y \\(10^4\\), o más), una \\(D\\) pequeña y una \\(T\\) pequeña, de modo que solo recorre parte de una vuelta. El umbo es el ápice. Con una \\(W\\) mayor la valva es más plana; con una \\(W\\) menor, el umbo es prominente y curvado.</p>
      <p>En los bivalvos equivalvos, la segunda valva es la imagen especular de la primera respecto al plano en el que se juntan las dos (la comisura). Eso es lo que dibuja el botón <em>Valva especular</em>:</p>
      ${MIRROR_TEX}
      <p>Esta construcción no sirve para las ostras ni las vieiras, cuyas dos valvas son distintas, ni para los braquiópodos: aunque se parecen a las almejas, sus valvas son dorsal y ventral, no izquierda y derecha, y no son imágenes especulares una de otra.</p>

      <h3>Qué deja fuera el modelo</h3>
      <p>El modelo de Raup es deliberadamente mínimo. Supone que la apertura conserva la misma forma y orientación durante toda la vida, así que ignora los cambios de proporción con la edad (alometría). Supone también que la apertura está en un plano que contiene el eje y que el crecimiento es perfectamente regular. No incluye la ornamentación (costillas, espinas, várices, quillas), el labio engrosado de los caracoles adultos, las estructuras internas, como los septos de ammonites y nautilos, ni la charnela de los bivalvos. Su valor no está en reproducir con detalle una especie, sino en mostrar cuánta diversidad de conchas se explica con unas pocas reglas de crecimiento.</p>

      <h3>Referencias</h3>
      ${REFS}`,
    'info.meinhardt': `
      <h3>Un patrón que registra su propia historia</h3>
      <p>Un molusco solo puede añadir pigmento donde añade concha: en el borde de la apertura, donde el manto segrega material nuevo. Una vez depositado, el pigmento ya no cambia; la concha simplemente sigue creciendo más allá. Por eso un patrón de concha es un <strong>registro en el tiempo de un proceso unidimensional</strong>. La dirección a lo largo del borde es el espacio (\\(x\\)), y la dirección de crecimiento es el tiempo. Recorrer una concha desde el ápice hasta la apertura es como ver, fotograma a fotograma, lo que ocurrió en el borde durante toda la vida del animal.</p>
      <p>Esta fue la idea central del trabajo de Hans Meinhardt, y por eso la pestaña <em>Pigmento</em> muestra un <strong>registro espacio-tiempo</strong>: una imagen plana cuyo eje horizontal es el borde y cuyo eje vertical es el tiempo. Después, esa imagen se envuelve sobre la concha 3D.</p>

      <h3>Activación local e inhibición de largo alcance</h3>
      <p>¿Cómo pueden unas células que solo se relacionan con sus vecinas formar un patrón regular? Alan Turing (1952) demostró que dos sustancias que reaccionan y difunden pueden romper por sí solas un estado uniforme. Gierer y Meinhardt (1972) identificaron los ingredientes esenciales: un <strong>activador</strong> que estimula su propia producción (autocatálisis) y un <strong>antagonista</strong> que actúa a mayor distancia.</p>
      <p>Un pequeño exceso de activador en un punto, debido al azar, crece porque el activador se amplifica a sí mismo. El antagonista llega más lejos y frena la activación en los alrededores. El resultado es un pico de activación rodeado de una zona inhibida, y el borde se llena de picos separados por distancias bastante regulares. Ninguna célula «conoce» el patrón: surge de las interacciones. El antagonismo puede funcionar de dos maneras, y cada una da lugar a una familia distinta de patrones.</p>

      <h3>Modelo activador-inhibidor</h3>
      ${AI_TEX}
      <p>El activador \\(a\\) estimula su propia producción (el término \\(a^2\\)) y también la de un inhibidor \\(h\\), que lo frena (\\(h\\) en el denominador). Cada sustancia se degrada a su propio ritmo (\\(r_a\\), \\(r_h\\)) y pasa a las células vecinas por difusión (\\(D_a\\), \\(D_h\\)). El resto de términos:</p>
      <ul>
        <li>\\(s\\), la <strong>densidad de fuente</strong>: la capacidad de cada célula para llevar a cabo la reacción. Varía ligeramente de una célula a otra, y esas pequeñas diferencias son la semilla del patrón.</li>
        <li>\\(b_a\\) y \\(b_h\\): pequeñas producciones basales. \\(b_a\\) mantiene un poco de activador en todas partes, para que la activación pueda volver a empezar después de apagarse.</li>
        <li>\\(\\kappa\\): saturación. La producción de activador no puede crecer sin límite, así que los picos se vuelven más anchos y planos.</li>
      </ul>
      <p>El tipo de patrón depende sobre todo de lo rápido y lo lejos que actúa el inhibidor en comparación con el activador:</p>
      <ul>
        <li>Si el inhibidor llega mucho más lejos que el activador (\\(D_h \\gg D_a\\)) y reacciona deprisa (\\(r_h > r_a\\)), los picos son <strong>estables</strong>. Cada punto activo del borde sigue activo mucho tiempo y dibuja una <strong>banda en la dirección de crecimiento</strong>.</li>
        <li>Si el inhibidor apenas difunde pero dura más que el activador (\\(r_h < r_a\\)), cada brote de activación acumula el inhibidor que después lo apaga, y la célula <strong>oscila</strong>. Las células vecinas se arrastran unas a otras hasta sincronizarse, se encienden y se apagan a la vez, y cada brote dibuja una <strong>raya paralela al borde</strong>, es decir, paralela a las líneas de crecimiento.</li>
      </ul>

      <h3>Modelo activador-sustrato</h3>
      ${AS_TEX}
      <p>Aquí el antagonista no es un inhibidor, sino un <strong>sustrato</strong> \\(b\\) que el activador necesita y <strong>consume</strong>. El sustrato se produce en todas partes a un ritmo \\(b_b\\) y difunde (\\(D_b\\)). Donde la activación es alta, el sustrato se agota y la activación no puede mantenerse. Pasa entonces a las células vecinas, que aún tienen sustrato, y la célula que queda atrás se vuelve <strong>refractaria</strong>: necesita tiempo para reponer su sustrato antes de poder activarse de nuevo.</p>
      <p>Así, la activación recorre el borde como una <strong>onda</strong>, y a medida que la concha crece, la onda en movimiento deja una <strong>línea oblicua</strong>. Cuando dos ondas que avanzan en sentidos opuestos se encuentran, cada una choca con la estela agotada de la otra y las dos <strong>desaparecen</strong>, cerrando una V. Donde el sustrato se ha recuperado puede surgir espontáneamente una onda nueva que se divide en dos ondas que se alejan, y eso abre una V invertida.</p>

      <h3>Control global: los triángulos de <i>Oliva porphyria</i></h3>
      <p>Las ondas que se aniquilan y se ramifican dan zigzags, pero no los grandes triángulos de <i>Oliva porphyria</i>, en los que aparecen líneas nuevas en muchos puntos a la vez. Meinhardt y Klingler (1987) los explicaron con una sustancia adicional compartida por todo el animal, como una hormona. Esa sustancia mide la actividad total del borde: cuando muchas ondas se aniquilan y la actividad cae, la señal baja y facilita que surjan ondas nuevas en todas partes. Esta app usa una versión simplificada del mecanismo, que actúa sobre la producción basal de activador:</p>
      ${GLOBAL_TEX}
      <p>\\(c\\) sigue con retraso al activador medio \\(\\langle a \\rangle\\), y \\(g\\) fija la intensidad del control. Con \\(g = 0\\) no hay señal global.</p>

      <h3>Qué patrón sale de cada mecanismo</h3>
      <ul>
        <li><strong>Bandas a lo largo de la espiral</strong>, como en el caracol <i>Cepaea nemoralis</i>: picos de activador estables (activador-inhibidor con un inhibidor de largo alcance).</li>
        <li><strong>Rayas paralelas a las líneas de crecimiento</strong>, como las llamas del <i>Nautilus</i>: oscilaciones sincronizadas entre células vecinas (activador-inhibidor con un inhibidor de vida larga). Su contorno irregular y ramificado se debe a las diferencias entre células.</li>
        <li><strong>Líneas oblicuas, zigzags y triángulos</strong>, como en <i>Oliva</i> y en muchos conos: ondas viajeras, sus choques y ramificaciones y, en el caso de los triángulos, el control global (activador-sustrato).</li>
      </ul>
      <p>Un pequeño cambio en una sola constante puede convertir un tipo de patrón en otro. El mismo mecanismo, con ritmos algo distintos, explica conchas muy diferentes.</p>

      <h3>Ver el antagonista en acción</h3>
      <p>El pigmento solo refleja el activador, pero quien le da forma es el antagonista. El <em>perfil del borde</em> representa, en un instante del crecimiento, el activador y el inhibidor (o el sustrato) a lo largo del borde, junto con el umbral de pigmento. En un patrón de bandas, cada pico de activador descansa sobre un colchón ancho de inhibidor; en un patrón de ondas, el sustrato cae justo detrás de cada pico en movimiento. Elige el instante haciendo clic sobre el registro espacio-tiempo en los controles avanzados, o con el slider del perfil que puede mostrarse sobre la vista 3D (menú <em>Gráficos</em>).</p>

      <h3>Un borde que crece</h3>
      <p>Una espiral logarítmica que gira a ritmo constante implica que la concha crece con una tasa relativa constante, así que cada vuelta dura lo mismo. Pero el borde también se alarga: con \\(W = 2\\), el perímetro de la apertura se duplica en cada vuelta. Hay dos posibilidades:</p>
      <ul>
        <li>Si se <strong>insertan células nuevas</strong> en el borde a medida que crece, los elementos del patrón mantienen su tamaño real y aparecen rayas o bandas nuevas entre las antiguas, como en muchas conchas reales.</li>
        <li>Si el número de células no cambia, las células simplemente se hacen más grandes y todo el patrón se ensancha con la concha, como las bandas de <i>Cepaea</i>, que ya existen cerca del ápice y solo se ensanchan.</li>
      </ul>
      <p>La opción <em>Borde que crece</em>, en los controles avanzados, elige entre las dos.</p>

      <h3>Del registro a la concha</h3>
      <p>El registro espacio-tiempo se envuelve sobre la superficie de Raup: la posición a lo largo del borde pasa a ser el ángulo \\(\\varphi\\) alrededor de la apertura, y el tiempo, el ángulo de enrollamiento \\(\\theta\\). Fowler, Meinhardt y Prusinkiewicz (1992) unieron así los dos modelos. Se deposita pigmento allí donde el activador supera un umbral, por lo que los bordes del patrón son nítidos. Solo se pigmenta la capa externa de la concha, así que el interior de la apertura aparece sin pigmento, con un ligero brillo nacarado.</p>

      <h3>Qué significa cada control</h3>
      <ul>
        <li><strong>Tamaño del patrón</strong>: el número de células a lo largo del borde. La difusión actúa entre células vecinas, así que con menos células cada elemento ocupa una parte mayor de la concha.</li>
        <li><strong>Tiempo de crecimiento</strong>: el tiempo que transcurre desde el ápice hasta la apertura. Con más tiempo, las oscilaciones y las ondas completan más ciclos y dejan más rayas y líneas.</li>
        <li><strong>Irregularidad</strong>: cuánto varía la densidad de fuente entre células. Con valores bajos salen patrones regulares; con valores altos, irregulares y ramificados.</li>
        <li><strong>Cantidad de pigmento</strong>: desplaza el umbral a partir del cual se deposita pigmento. Ensancha o estrecha las zonas oscuras sin cambiar la dinámica que hay debajo.</li>
        <li><strong>Semilla</strong>: elige las diferencias al azar entre células. Cada semilla da un individuo distinto pero igual de válido, igual que no hay dos conchas idénticas de la misma especie.</li>
      </ul>
      <p>Los controles avanzados dan acceso a todas las constantes de las ecuaciones. Cerca de ciertos valores, el patrón cambia de golpe de un tipo a otro: son umbrales reales del modelo, no errores. Si una combinación no forma ningún patrón, porque el activador se extingue o el borde queda uniforme, la app lo indica en lugar de mostrar una concha vacía.</p>

      <h3>Límites de los modelos</h3>
      <p>Son modelos mínimos. Las moléculas reales no se han identificado en ningún molusco, y el borde se trata como un anillo cerrado de células equivalentes. Ermentrout, Campbell y Oster (1986) propusieron, en cambio, que el patrón lo controlan los nervios del manto, una idea que conduce a una dinámica muy parecida de excitación local e inhibición lateral. Los presets reproducen el tipo de patrón de cada especie, no un ajuste a ejemplares reales. Aun así, los modelos captan algo real: unas pocas reglas, con distintos ritmos, explican toda la gama, desde bandas y llamas hasta zigzags y triángulos, incluidos detalles que se observan en las conchas, como líneas que se ramifican o que se aniquilan al encontrarse.</p>

      <h3>Referencias</h3>
      ${MEIN_REFS}`,
    'info.app': `
      <h3>Autor</h3>
      <p><strong>Alberto González Casarrubios</strong>, Universidad Complutense de Madrid. Para dudas, sugerencias o errores, escribe a <a href="mailto:albert23@ucm.es">albert23@ucm.es</a>.</p>

      <h3>Cómo citar</h3>
      <p>González Casarrubios, A. (2026). <i>Conchas teóricas: forma y color</i>. <a href="https://albertogonzalezcasarrubios.github.io/aplicaciones-varias/shells-morphology/" target="_blank" rel="noopener">albertogonzalezcasarrubios.github.io/aplicaciones-varias/shells-morphology</a></p>

      <h3>Código fuente</h3>
      <p>El código fuente y su documentación técnica están en <a href="https://github.com/AlbertoGonzalezCasarrubios/aplicaciones-varias/tree/main/shells-morphology" target="_blank" rel="noopener">GitHub</a>.</p>

      <h3>Licencia</h3>
      <p>Esta obra está bajo una licencia <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener">Creative Commons Atribución-NoComercial 4.0 Internacional (CC BY-NC 4.0)</a>. Puedes compartirla y adaptarla siempre que reconozcas la autoría, pero no con fines comerciales.</p>`,
  },
};

export { GENERAL_TEX, DEFS_TEX, MIRROR_TEX, AI_TEX, AS_TEX, GLOBAL_TEX };

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
