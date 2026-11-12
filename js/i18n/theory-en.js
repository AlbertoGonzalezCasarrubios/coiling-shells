/**
 * Long pages of the About window in English: the theory of each model, the
 * controls and the credits (HTML with TeX, typeset by MathJax when shown).
 */
import {
  GENERAL_TEX,
  DEFS_TEX,
  MIRROR_TEX,
  ORN_REFS,
  REFS,
  AI_TEX,
  AS_TEX,
  GLOBAL_TEX,
  HORMONE_TEX,
  MEIN_REFS,
  ornamentFigure,
} from './tex.js';

/** Sketch of the kinds of ornament, with the labels of this language. */
const ORN_FIGURE = ornamentFigure({
  ribs: 'Axial ribs',
  cords: 'Spiral cords',
  net: 'Reticulation, nodules',
  keel: 'Keel and spines',
  margin: 'thick line: margin of the aperture',
  growth: 'growth',
  periphery: 'periphery',
  alt: 'Sketch of a piece of whorl seen from outside, with growth to the right and the margin of the aperture on the right: axial ribs run parallel to the margin, spiral cords run along the whorl, a reticulation combines them with nodules where they cross, and a keel is a strong cord with a row of spines.',
});

export default {
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
      <li><strong>\\(T\\) — translation rate.</strong> How far the aperture slides along the axis compared with how far it moves away from it. With \\(T = 0\\) all the whorls lie in one plane (planispiral shells such as the nautilus, ammonites or <i>Planorbis</i>). Small values give low spires, as in the garden snail; intermediate values give conical spires, as in <i>Trochus</i> or <i>Peringia</i>; large values give tall, slender spires, as in <i>Turritella</i>.</li>
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
    <p>That panel is a flat <strong>section</strong> of Raup's cube: it shows \\(W\\) and \\(D\\) at the current value of \\(T\\). Moving through it changes only \\(W\\) and \\(D\\); \\(T\\), \\(S\\) and \\(N\\) stay as they are. This matters because the groups differ above all in \\(T\\): gastropods and ammonoids overlap in the \\(W\\)–\\(D\\) plane, but ammonoids are planispiral (\\(T = 0\\)) and most gastropods are not. A snail moved into the ammonoid region keeps its spire, so it does not become an ammonite. The panel fades the regions of groups that do not exist at the current \\(T\\), and clicking a group's name loads a typical shell of that group, with all its parameters. The contact curve \\(D = 1/W\\) is exact for \\(T = 0\\) whatever the aperture shape \\(S\\); with \\(T > 0\\) the whorls also move apart along the axis, so they can be separate below the curve.</p>

    <h3>Bivalves</h3>
    <p>The same equation produces the valves of clams and cockles. Each valve is a logarithmic spiral with a very high \\(W\\) (roughly \\(10^2\\) to \\(10^4\\) or more), a small \\(D\\) and a small \\(T\\), so it completes only part of a turn. The beak, or umbo, is the apex. A higher \\(W\\) gives a flatter valve; a lower \\(W\\) gives a prominent, curled umbo.</p>
    <p>In equivalve bivalves the second valve is the mirror image of the first across the plane where the two valves meet (the commissure). This is what the <em>Mirror valve</em> button draws:</p>
    ${MIRROR_TEX}
    <p>The mirror construction does not apply to oysters and scallops, whose two valves are different, or to brachiopods: although they look like clams, their two valves are dorsal and ventral rather than left and right, and are not mirror images of each other.</p>

    <h3>What the model leaves out</h3>
    <p>Raup's model is deliberately minimal. It assumes that the aperture keeps the same shape and orientation throughout life, so it ignores changes of proportion with age (allometry). It also assumes that the aperture lies in a plane containing the axis and that growth is perfectly regular. The basic model does not include ornament (ribs, spines, varices, keels; the <em>Ornament</em> tab adds them, explained on their own page), the thickened lip of adult snails, internal structures such as the septa of ammonites and nautiloids, or the hinge of bivalves. Its value is not in reproducing one species in detail, but in showing how much of the diversity of shells follows from a few simple rules of growth.</p>

    <h3>References</h3>
    ${REFS}`,
  'info.ornament': `
    <p>Shells are not only coiled tubes: many carry ribs, cords, keels or spines. This relief, like the colour pattern, is made at the margin of the aperture while the shell grows, and then stays fixed.</p>

    <h3>First, finding your way around</h3>
    <p>All relief is described relative to the <strong>margin of the aperture</strong>, where the animal makes new shell. Picture a piece of a whorl seen from outside and laid flat: growth runs to the right, and the margin of the aperture is the thick line on the right.</p>
    ${ORN_FIGURE}
    <ul>
      <li>The <strong>suture</strong> is the line where one whorl rests on the previous one; the <strong>apex</strong> is the tip of the shell.</li>
      <li>The <strong>periphery</strong> is the most prominent part of the whorl, the one farthest from the axis.</li>
      <li>The <strong>shoulder</strong> is the angle that some whorls make just below the suture.</li>
    </ul>

    <h3>Kinds of ornament</h3>
    <ul>
      <li><strong>Axial ribs.</strong> They run parallel to the margin of the aperture, so they cross each whorl from suture to suture, like the growth lines. Each rib is a moment when the animal made a thicker or flared margin, as in <i>Epitonium</i> or many ammonites. When there are only a few per whorl, strong and steep on the side of the aperture, they are called <strong>varices</strong>: the remains of old margins.</li>
      <li><strong>Spiral cords.</strong> They run perpendicular to the margin, so along the whorl, parallel to the suture. Each cord is a point of the margin that always makes more shell than its neighbours, as in <i>Turritella</i>. In bivalves the cords are the radial ribs running from the umbo to the edge, as in a cockle.</li>
      <li><strong>Reticulation and nodules.</strong> With ribs and cords together they form a grid (<i>Cancellaria</i>). Sometimes the relief only rises where they cross, leaving <strong>nodules</strong>, bumps in rows (<i>Cerithium</i>).</li>
      <li><strong>Keel.</strong> A single strong, sharp cord, often on the periphery.</li>
      <li><strong>Spines.</strong> Points that stand out at intervals along the whorl, usually on the ribs or on the shoulder.</li>
    </ul>
    <p>In technical texts, axial ribs are called <em>commarginal</em> (they follow the margin) and cords <em>antimarginal</em> (they cut across it).</p>

    <h3>How the app draws it</h3>
    <p>The <em>Ornament</em> tab starts from Raup's smooth shell and pushes its surface outwards wherever there is relief. The height of the relief is measured relative to the radius of the aperture, so it grows with the shell: a rib on the last whorl is much larger than one on the first whorls, as in a real shell.</p>
    <table class="keys plain">
      <tr><td>Axial ribs</td><td><em>Ribs per whorl</em>, <em>Height</em>; in advanced, <em>Width</em> (1 = a smooth wave) and <em>Asymmetry</em> (for varices).</td></tr>
      <tr><td>Spiral cords</td><td><em>Cords</em>, <em>Height</em>; in advanced, <em>Width</em>. The <em>Nodules</em> box keeps the relief only where they cross the ribs.</td></tr>
      <tr><td>Spines</td><td><em>Spines per whorl</em>, <em>Length</em>; in advanced, <em>Base</em>, <em>Position</em> (0 = periphery) and two symmetric rows.</td></tr>
      <tr><td>Keel</td><td>In advanced: <em>Height</em>, <em>Width</em> and <em>Position</em>.</td></tr>
      <tr><td>Change with growth</td><td>In advanced. Below 0, the relief fades towards the aperture (many shells are smooth when adult); above 0, it appears late.</td></tr>
    </table>
    <p>Spines are left out where the shell is still tiny, because there they would be specks: they are missing on the first whorls and on the part of the shell below a fifth of its final size. This is why a bivalve, which has a single whorl, carries them on the outer part of its valve, as in the spiny venus <i>Pitar lupanaria</i>.</p>

    <h3>The formula</h3>
    <p>For those who want the details: each point \\(\\mathbf{P}\\) of Raup's surface is moved along the normal \\(\\mathbf{n}\\), the direction perpendicular to the surface and pointing outwards. The factor \\(W^{\\theta/2\\pi}\\,a\\) is the radius of the aperture at that point of the spiral (see the Raup page), and \\(\\delta\\) is the height of the relief in units of that radius:</p>
    \\[ \\mathbf{P}^{*}(\\theta,\\varphi) = \\mathbf{P}(\\theta,\\varphi) + W^{\\theta/2\\pi}\\,a\\,\\delta(\\theta,\\varphi)\\,\\mathbf{n}(\\varphi) \\]
    \\[ \\delta = f(s)\\,\\bigl[\\,h_r R(\\theta) + h_c C(u) + h_k K(u) + h_s \\Sigma(\\theta,u)\\,\\bigr] \\]
    <p>\\(\\theta\\) is the position along the spiral, and \\(u\\) the position around the aperture, measured as a fraction of its outline (0 at the periphery). Each term is one kind of relief, with its height \\(h\\):</p>
    <ul>
      <li>\\(R(\\theta)\\): the ribs, \\(n_r\\) per whorl. Each is a smooth bump (shaped as \\(\\cos^2\\)) covering a fraction \\(w_r\\) of the space between ribs; the asymmetry \\(k\\) makes it steep in front and gentle behind.</li>
      <li>\\(C(u)\\): the cords, \\(n_c\\) around the aperture, of width \\(w_c\\). With nodules, ribs and cords multiply, \\((h_r + h_c)\\,R\\,C\\), so the relief only rises where both coincide.</li>
      <li>\\(K(u)\\): the keel, one cord at position \\(u_k\\).</li>
      <li>\\(\\Sigma(\\theta,u)\\): the spines, cones of length \\(h_s\\), \\(n_s\\) per whorl, in one row at \\(u_s\\) or two at \\(\\pm u_s\\).</li>
      <li>\\(f(s) = 1 + c\\,(2s-1)\\), limited between 0 and 2, with \\(s\\) the fraction of growth (0 at the apex, 1 at the aperture): this is the <em>change with growth</em> \\(c\\).</li>
    </ul>
    <p>This part is <strong>descriptive</strong>, like Raup's model: it reproduces the form of the relief without explaining why it appears (Fowler, Meinhardt &amp; Prusinkiewicz, 1992; Cortie, 1993). It also inherits Raup's limits. The aperture always keeps the same shape, so shells with a long canal, such as <i>Murex</i>, cannot be drawn and are left out of the examples. Spines stand perpendicular to the surface, while real ones often curve back or are open gutters.</p>

    <h3 id="mech-theory">Why this number of cords? A mechanical explanation</h3>
    <p>Why should a shell have nine cords and not twenty? Moulton, Goriely &amp; Chirat (2012) proposed a mechanical answer. The shell is made by the <strong>edge of the mantle</strong>, a soft strip of tissue that runs along the margin of the aperture and is attached to the freshly made shell. If the mantle grows a little faster than the shell, it has length to spare; since it is attached, it cannot simply stretch out, and it <strong>wrinkles into waves</strong>, like a rug pushed against a wall. Each wave leaves a cord on the shell.</p>
    <p>How many waves? Two costs compete:</p>
    <ul>
      <li><strong>Bending the mantle</strong> costs, and costs more the more waves there are, because each one is tighter.</li>
      <li><strong>Pulling it away from the shell</strong> also costs, and costs more the fewer waves there are, because each one is longer and taller and lifts it further.</li>
    </ul>
    <p>The number of waves that appears is the one that makes the sum of both smallest: the compromise. In the app, the <em>Attachment / bending</em> control \\(\\Lambda\\) says how firmly the mantle is held compared with how stiff it is: a firmer hold or a more flexible mantle gives <strong>more, finer cords</strong>. The <em>Push of growth</em> control \\(\\eta\\) says how much length the mantle has to spare: below 1 it is not enough to wrinkle and the shell stays smooth; above 1, the waves grow.</p>
    <p>In formulas, the mantle is an elastic rod of bending stiffness \\(B\\) on an elastic foundation of stiffness \\(k\\) (a Winkler foundation). The push needed to wrinkle into waves of wavenumber \\(q\\) is</p>
    \\[ P(q) = B\\,q^2 + \\frac{k}{q^2}, \\qquad P_c = 2\\sqrt{kB}, \\qquad q^{*} = \\left(\\frac{k}{B}\\right)^{1/4}. \\]
    <p>The first term is the cost of bending and the second the cost of pulling away. Around a margin of length \\(L_0\\) there is room for \\(n = qL_0/2\\pi\\) waves. With \\(\\Lambda = kL_0^4/B\\) and \\(\\eta = P/P_c\\):</p>
    \\[ \\frac{P(n)}{P_c} = \\frac{1}{2}\\left[\\left(\\frac{n}{n^{*}}\\right)^2 + \\left(\\frac{n^{*}}{n}\\right)^2\\right], \\qquad n^{*} = \\frac{\\Lambda^{1/4}}{2\\pi}. \\]
    <ul>
      <li>With \\(\\eta < 1\\) no wave is possible and the shell is smooth.</li>
      <li>Just above 1, the cheapest wave appears first: \\(n^{*}\\) crests, rounded to a whole number. Its height grows as \\(\\sqrt{\\eta - 1}\\); the theory does not give the constant, and the app uses \\(0.08\\,a\\sqrt{\\eta - 1}\\).</li>
      <li>Because \\(n^{*}\\) grows with \\(L_0\\), a growing aperture has room for more and more waves, which fits the way many shells add new cords between the old ones.</li>
    </ul>
    <p>The panel <em>Why this number of cords?</em>, in the advanced controls of the ornament tab, draws the curve \\(P(n)/P_c\\). The dashed line is the chosen push; the shaded band, the numbers of waves that push can produce, and the dot, the one that appears first. The button grows those cords on the shell with a smooth, wavy profile (width 1), which is the shape of a wrinkle.</p>

    <h3>Ribs and spines</h3>
    <p>The same ideas apply to the rest of the relief. Axial ribs can be an oscillation in time: the elastic attachment holds the mantle back while it grows, the margin overshoots and recoils, and each cycle leaves a rib (Moulton, Goriely &amp; Chirat, 2015, for ammonites). Spines appear when the excess growth is concentrated at a few points of the margin, which bend outwards; this explains why unrelated groups have such similar spines (Chirat, Moulton &amp; Goriely, 2013). In the app, ribs and spines are drawn with the descriptive model; only the cords have an interactive mechanical model, because their theory is the simplest.</p>

    <h3>What the mechanical model leaves out</h3>
    <p>It is a simplified model: the mantle is a uniform strip on a uniform attachment, and it only describes the moment the wrinkles start. Real mantles vary in thickness and stiffness along the margin, large wrinkles interact with each other, and the making of calcium carbonate has its own rules. The model explains why regular cords should appear and what sets their number, not the exact shape of a particular shell.</p>

    <h3>References</h3>
    ${ORN_REFS}`,
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
    <p>Travelling waves draw oblique lines, and when two of them meet both die. If nothing else happened, the waves would run out. On <i>Oliva porphyria</i> they do not: lines keep <strong>branching</strong>, that is, a line suddenly sends out a second one in the opposite direction, and the two open a triangle. Branches appear on many lines at the same moment, which no local signal could coordinate along the whole margin.</p>
    <p>Meinhardt and Klingler (1987) explained it with a substance shared by the whole animal, like a hormone \\(R\\), made by the active cells. Its concentration therefore measures how many waves there are. In their model each cell oscillates, because the inhibitor outlives the activator, and the hormone slows the removal of the inhibitor, whose decay becomes \\(r_h/R\\):</p>
    ${HORMONE_TEX}
    <p>While there are many waves, \\(R\\) is high and the inhibitor decays slowly: each cell fires once and is switched off, and the waves travel as usual. When collisions have left few waves, \\(R\\) falls, the inhibitor is removed quickly, and the cells that are active at that moment <strong>stay active</strong> instead of switching off. When their neighbours have recovered, the activation spreads back towards them: a backward wave, that is, a branch. As \\(R\\) is the same everywhere, this happens on many lines at once. The new waves raise \\(R\\) again and everything returns to normal. In this way the hormone keeps the number of waves about constant, and the inhibitor decay \\(r_h\\) sets that number.</p>
    <p>In the app this is the <em>Global control</em> \\(g\\) of the activator–inhibitor model, and its value is how fast the hormone follows the activity; with \\(g = 0\\) there is no hormone and the equations are the usual ones. The <i>Oliva porphyria</i> preset starts from the constants of Fowler, Meinhardt and Prusinkiewicz (1992), with a somewhat faster inhibitor decay and more cells, so that areas of small triangles alternate with large ones, as on the real shell. Cell insertion keeps their size as the shell grows. Without the hormone, the same constants give no pattern at all. The real shell also has a background of fine, darker reticulation that the model leaves out, and its elongated shape is beyond Raup's model.</p>

    <h3>White triangles on a dark background: <i>Conus marmoreus</i></h3>
    <p>The marble cone has the opposite pattern: white triangles on a dark net. Meinhardt and Klingler (1987) explained it with the same hormone, now in the activator–substrate model, where it slows the <strong>production of substrate</strong>, which becomes \\(b_b/R\\):</p>
    ${GLOBAL_TEX}
    <p>When collisions have left few waves, \\(R\\) falls and there is more substrate. The active cells then switch to a <strong>steady activation</strong>, much lower than the peak of a wave but above the pigment threshold, so the region between two branches stays <strong>pigmented</strong>. The waves move on, and the cells they leave behind wait, unpigmented, until the next branching: these are the white triangles. Many cells have to stay activated before \\(R\\) rises enough to return to waves, and that is why the dark areas are wide. In the app this is the <em>Global control</em> of the activator–substrate model, and the <i>Conus marmoreus</i> preset uses the constants of the paper, with somewhat less saturation. Its threshold is low, a large pigment amount, so that the steady activation shows. With fewer waves and weaker saturation, the same mechanism gives oblique lines and V shapes instead (the constants loaded when you switch to this model).</p>

    <h3>Which pattern comes from which mechanism</h3>
    <ul>
      <li><strong>Bands along the spiral</strong>, as in the banded snail <i>Cepaea nemoralis</i>: stable activator peaks (activator–inhibitor with a far-reaching inhibitor).</li>
      <li><strong>Stripes parallel to the growth lines</strong>, like the flames of <i>Nautilus</i>: oscillations synchronised between neighbouring cells (activator–inhibitor with a long-lived inhibitor). Their irregular, branching outline comes from the differences between cells.</li>
      <li><strong>Spots in spiral rows</strong>, as in the moon snails <i>Naticarius</i>: both at once. The inhibitor keeps the peaks apart along the margin, as in the bands, and outlives the activator, so each peak switches on and off in place, as in the flames.</li>
      <li><strong>Oblique lines and V shapes</strong>, as in many cone and volute shells: travelling waves that annihilate when they meet (activator–substrate).</li>
      <li><strong>Lines that branch into triangles</strong>, as in <i>Oliva porphyria</i>: travelling waves plus a hormone that, when few waves are left, makes them branch on many lines at once (activator–inhibitor with global control).</li>
      <li><strong>White triangles on a dark background</strong>, as in <i>Conus marmoreus</i>: the same branching, but the cells between branches stay in a low, pigmented steady activation (activator–substrate with global control).</li>
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
    <p>The space–time record is wrapped onto Raup's surface: the position along the margin becomes the angle \\(\\varphi\\) around the aperture, and time becomes the coiling angle \\(\\theta\\). Fowler, Meinhardt and Prusinkiewicz (1992) joined the two models in this way. The cells are spaced evenly along the real length of the margin, also in elliptical apertures. Because each whorl takes the same time but is \\(W\\) times larger than the one before, the record and the shell have different proportions: the record gives every whorl the same height, while on the shell the early whorls are tiny. The <em>Unrolled shell</em> view redraws the record with the proportions of the shell, as a fan that opens from the apex. Pigment is laid down wherever the activator exceeds a threshold, so the edges of the pattern are sharp. Only the outer layer of the shell is pigmented, so the inside of the aperture is shown without pigment, with a light pearly sheen.</p>

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
  'info.controls': `
    <h3>3D view</h3>
    <table class="keys">
      <tr><td>Drag</td><td>Turn around the shell. In free rotation (the globe button, bottom right) it turns the shell itself, in any direction.</td></tr>
      <tr><td>Wheel · pinch</td><td>Zoom in and out.</td></tr>
      <tr><td>Right-drag · two fingers</td><td>Move the view.</td></tr>
      <tr><td>3/4 · Apertural · Dorsal…</td><td>The standard views of malacology. In free rotation they also set the shell upright again.</td></tr>
      <tr><td>↕ · ↔ · globe</td><td>Coiling axis vertical, horizontal (planispiral shells seen face-on) or free rotation.</td></tr>
    </table>
    <h3>Keyboard</h3>
    <table class="keys">
      <tr><td><kbd>Ctrl</kbd> <kbd>Z</kbd> · <kbd>⌘</kbd> <kbd>Z</kbd></td><td>Undo the last change (also the arrow button in the toolbar).</td></tr>
      <tr><td><kbd>F</kbd></td><td>Full screen.</td></tr>
      <tr><td><kbd>H</kbd></td><td>Hide or show the panels, to see only the shell.</td></tr>
      <tr><td><kbd>Esc</kbd></td><td>Show the panels again, or close a window.</td></tr>
    </table>
    <h3>Toolbar</h3>
    <table class="keys">
      <tr><td>Lines · Solid · Both</td><td>How the shell is drawn.</td></tr>
      <tr><td>Equation</td><td>The model equations, in general form and with the current values.</td></tr>
      <tr><td>Axes</td><td>The x, y, z axes in the corner.</td></tr>
      <tr><td>Appearance</td><td>Colours, background, mesh resolution, lines and coiling axis.</td></tr>
      <tr><td>Graphs</td><td>The morphospace and the pigment profile over the 3D view.</td></tr>
    </table>
    <h3>Sliders</h3>
    <p>Drag a slider or type a value in its box. The arrow keys move a focused slider step by step. Every change is stored in the page address, so copying the link shares exactly what is on screen.</p>`,
  'info.app': `
    <h3>Author</h3>
    <p><strong>Alberto González Casarrubios</strong>, Universidad Complutense de Madrid. For questions, suggestions or errors, write to <a href="mailto:albert23@ucm.es">albert23@ucm.es</a>.</p>

    <h3>How to cite</h3>
    <p>González Casarrubios, A. (2026). <i>Theoretical Shells: Form and Colour</i>. <a href="https://albertogonzalezcasarrubios.github.io/coiling-shells/" target="_blank" rel="noopener">albertogonzalezcasarrubios.github.io/coiling-shells</a></p>

    <h3>Source code</h3>
    <p>The source code and its technical documentation are on <a href="https://github.com/AlbertoGonzalezCasarrubios/coiling-shells" target="_blank" rel="noopener">GitHub</a>.</p>

    <h3>License</h3>
    <p>The source code is released under the <a href="https://opensource.org/license/mit" target="_blank" rel="noopener">MIT License</a>. The texts, explanations and images are licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">Creative Commons Attribution 4.0 International (CC BY 4.0)</a>. You may use, share and adapt both freely, including for commercial purposes, as long as you give appropriate credit.</p>`,
};
