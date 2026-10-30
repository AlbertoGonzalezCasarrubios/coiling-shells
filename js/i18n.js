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

export const STRINGS = {
  en: {
    'doc.title': "Raup's Shells",
    'brand.subtitle': 'Geometric model of shell coiling · Raup (1962, 1966)',
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
    'hint.controls': 'Drag: rotate · Wheel: zoom · Right-click: pan',
    'hud.stats': (v, t) => `${v.toLocaleString('en')} vertices · ${t.toLocaleString('en')} triangles`,
    loading: 'Loading Three.js…',
    'info.title': 'About this app',
    'info.close': 'Close',
    'refs.short': 'Raup (1962) <i>Science</i> 138 · Raup (1966) <i>J. Paleontology</i> 40',
    params: {
      W: { name: 'Whorl expansion rate', desc: 'Growth factor of the aperture per revolution (log scale)' },
      D: { name: 'Distance from axis', desc: 'Umbilicus size: inner / outer radius of the aperture' },
      T: { name: 'Translation rate', desc: 'Displacement along the axis per unit of radial growth' },
      S: { name: 'Aperture shape', desc: 'Ellipse semi-axis ratio (axial / radial)' },
      turns: { name: 'Number of whorls', desc: 'Revolutions from apex to aperture' },
      spiralLines: { name: 'Spiral lines' },
      ringsPerTurn: { name: 'Growth lines per whorl' },
      lineWidth: { name: 'Line width (px)' },
      lineOpacity: { name: 'Line opacity' },
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
      berberecho: 'Cockle (Cerastoderma)',
      mejillon: 'Mussel (Mytilus)',
    },
    'info.body': `
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

      <h3>How the app works</h3>
      <ul>
        <li>The surface is evaluated on a grid of \\(\\theta \\times \\varphi\\) points and each cell is split into two triangles. It is regenerated on every slider change.</li>
        <li>Lines of constant \\(\\varphi\\) are <em>spiral lines</em>; lines of constant \\(\\theta\\) are <em>growth lines</em>, the successive positions of the aperture.</li>
        <li>The shell is centred and scaled to a fixed size, so the coordinates are relative: only the shape matters, not the absolute size.</li>
        <li>In line mode, hidden lines are removed by drawing the surface into the depth buffer only.</li>
        <li>The axes gizmo shows the \\(x, y, z\\) frame of the equation (\\(z\\) = coiling axis). The view buttons use the standard orientations of malacology: apertural, dorsal (abapertural), apical, umbilical and profile.</li>
        <li>Built with Three.js (WebGL) and MathJax. The current shell is stored in the URL, so you can share a link to it.</li>
      </ul>

      <h3>References</h3>
      ${REFS}`,
  },

  es: {
    'doc.title': 'Conchas de Raup',
    'brand.subtitle': 'Modelo geométrico de enrollamiento · Raup (1962, 1966)',
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
    'hint.controls': 'Arrastrar: rotar · Rueda: zoom · Clic derecho: panear',
    'hud.stats': (v, t) => `${v.toLocaleString('es')} vértices · ${t.toLocaleString('es')} triángulos`,
    loading: 'Cargando Three.js…',
    'info.title': 'Acerca de esta app',
    'info.close': 'Cerrar',
    'refs.short': 'Raup (1962) <i>Science</i> 138 · Raup (1966) <i>J. Paleontology</i> 40',
    params: {
      W: { name: 'Expansión de la espiral', desc: 'Factor de crecimiento de la apertura por vuelta (escala log)' },
      D: { name: 'Distancia al eje', desc: 'Tamaño del ombligo: radio interno / externo de la apertura' },
      T: { name: 'Traslación vertical', desc: 'Desplazamiento a lo largo del eje por unidad de crecimiento radial' },
      S: { name: 'Forma de la apertura', desc: 'Razón de semiejes de la elipse (axial / radial)' },
      turns: { name: 'Número de vueltas', desc: 'Revoluciones desde el ápice hasta la apertura' },
      spiralLines: { name: 'Líneas espirales' },
      ringsPerTurn: { name: 'Líneas de crecimiento / vuelta' },
      lineWidth: { name: 'Grosor de línea (px)' },
      lineOpacity: { name: 'Opacidad de líneas' },
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
      berberecho: 'Berberecho (Cerastoderma)',
      mejillon: 'Mejillón (Mytilus)',
    },
    'info.body': `
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

      <h3>Cómo funciona la app</h3>
      <ul>
        <li>La superficie se evalúa en una rejilla de puntos \\(\\theta \\times \\varphi\\) y cada celda se divide en dos triángulos. Se regenera con cada cambio de los sliders.</li>
        <li>Las líneas de \\(\\varphi\\) constante son <em>líneas espirales</em>; las de \\(\\theta\\) constante son <em>líneas de crecimiento</em>, las posiciones sucesivas de la apertura.</li>
        <li>La concha se centra y escala a un tamaño fijo, así que las coordenadas son relativas: importa la forma, no el tamaño absoluto.</li>
        <li>En el modo líneas, las líneas ocultas se eliminan dibujando la superficie solo en el búfer de profundidad.</li>
        <li>El indicador de ejes muestra el sistema \\(x, y, z\\) de la ecuación (\\(z\\) = eje de enrollamiento). Los botones de vista usan las orientaciones estándar en malacología: apertural, dorsal (abapertural), apical, umbilical y perfil.</li>
        <li>Hecha con Three.js (WebGL) y MathJax. La concha actual se guarda en la URL, así que puedes compartir un enlace a ella.</li>
      </ul>

      <h3>Referencias</h3>
      ${REFS}`,
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
