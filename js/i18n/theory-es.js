/**
 * Long pages of the About window in Spanish: the theory of each model, the
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
  ribs: 'Costillas axiales',
  cords: 'Cordones espirales',
  net: 'Retícula y nódulos',
  keel: 'Quilla y espinas',
  margin: 'línea gruesa: borde de la apertura',
  growth: 'crecimiento',
  periphery: 'periferia',
  alt: 'Esquema de un trozo de vuelta visto desde fuera, con el crecimiento hacia la derecha y el borde de la apertura a la derecha: las costillas axiales son paralelas al borde, los cordones espirales van a lo largo de la vuelta, la retícula los combina con nódulos en los cruces, y la quilla es un cordón fuerte con una fila de espinas.',
});

export default {
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
      <li><strong>\\(T\\): tasa de traslación.</strong> Cuánto se desplaza la apertura a lo largo del eje en comparación con lo que se aleja de él. Con \\(T = 0\\), todas las vueltas quedan en un mismo plano: son las conchas planispirales, como el nautilus, los ammonites o <i>Planorbis</i>. Con valores pequeños, la espira es baja, como en el caracol de jardín; con valores intermedios, cónica, como en <i>Trochus</i> o <i>Peringia</i>; con valores grandes, alta y esbelta, como en <i>Turritella</i>.</li>
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
    <p>Ese panel es un <strong>corte</strong> plano del cubo de Raup: muestra \\(W\\) y \\(D\\) con el valor actual de \\(T\\). Al moverte por él solo cambian \\(W\\) y \\(D\\); \\(T\\), \\(S\\) y \\(N\\) se mantienen. Esto importa porque los grupos se distinguen sobre todo por \\(T\\): gasterópodos y ammonoideos se solapan en el plano \\(W\\)–\\(D\\), pero los ammonoideos son planispirales (\\(T = 0\\)) y la mayoría de los gasterópodos no. Un caracol llevado a la región de los ammonoideos conserva su espira, así que no se convierte en un ammonite. El panel atenúa las regiones de los grupos que no existen con el \\(T\\) actual, y al pinchar en el nombre de un grupo se carga una concha típica de ese grupo, con todos sus parámetros. La curva de contacto \\(D = 1/W\\) es exacta para \\(T = 0\\), sea cual sea la forma de la apertura \\(S\\); con \\(T > 0\\) las vueltas también se separan a lo largo del eje, así que pueden quedar separadas por debajo de la curva.</p>

    <h3>Bivalvos</h3>
    <p>La misma ecuación produce las valvas de almejas y berberechos. Cada valva es una espiral logarítmica con una \\(W\\) muy alta (aproximadamente entre \\(10^2\\) y \\(10^4\\), o más), una \\(D\\) pequeña y una \\(T\\) pequeña, de modo que solo recorre parte de una vuelta. El umbo es el ápice. Con una \\(W\\) mayor la valva es más plana; con una \\(W\\) menor, el umbo es prominente y curvado.</p>
    <p>En los bivalvos equivalvos, la segunda valva es la imagen especular de la primera respecto al plano en el que se juntan las dos (la comisura). Eso es lo que dibuja el botón <em>Valva especular</em>:</p>
    ${MIRROR_TEX}
    <p>Esta construcción no sirve para las ostras ni las vieiras, cuyas dos valvas son distintas, ni para los braquiópodos: aunque se parecen a las almejas, sus valvas son dorsal y ventral, no izquierda y derecha, y no son imágenes especulares una de otra.</p>

    <h3>Qué deja fuera el modelo</h3>
    <p>El modelo de Raup es deliberadamente mínimo. Supone que la apertura conserva la misma forma y orientación durante toda la vida, así que ignora los cambios de proporción con la edad (alometría). Supone también que la apertura está en un plano que contiene el eje y que el crecimiento es perfectamente regular. El modelo básico no incluye la ornamentación (costillas, espinas, várices, quillas; la pestaña <em>Ornamento</em> los añade, y se explican en su propia página), el labio engrosado de los caracoles adultos, las estructuras internas, como los septos de ammonites y nautilos, ni la charnela de los bivalvos. Su valor no está en reproducir con detalle una especie, sino en mostrar cuánta diversidad de conchas se explica con unas pocas reglas de crecimiento.</p>

    <h3>Referencias</h3>
    ${REFS}`,
  'info.ornament': `
    <p>Las conchas no son solo tubos enrollados: muchas tienen costillas, cordones, quillas o espinas. Este relieve, igual que el dibujo de color, se forma en el borde de la apertura mientras la concha crece, y después queda fijo.</p>

    <h3>Antes de empezar: cómo orientarse</h3>
    <p>Todo el relieve se describe respecto al <strong>borde de la apertura</strong>, que es donde el animal fabrica concha nueva. Imagina un trozo de una vuelta visto desde fuera y estirado: el crecimiento avanza hacia la derecha y el borde de la apertura es la línea gruesa de la derecha.</p>
    ${ORN_FIGURE}
    <ul>
      <li>La <strong>sutura</strong> es la línea donde una vuelta se apoya en la anterior; el <strong>ápice</strong> es la punta de la concha.</li>
      <li>La <strong>periferia</strong> es la parte más saliente de la vuelta, la que queda más lejos del eje.</li>
      <li>El <strong>hombro</strong> es el ángulo que forman algunas vueltas justo por debajo de la sutura.</li>
    </ul>

    <h3>Tipos de ornamentación</h3>
    <ul>
      <li><strong>Costillas axiales.</strong> Son paralelas al borde de la apertura, así que cruzan cada vuelta de sutura a sutura, como las líneas de crecimiento. Cada costilla es un momento en que el animal hizo un borde más grueso o más abierto, como en <i>Epitonium</i> o en muchos ammonites. Cuando hay pocas por vuelta, fuertes y abruptas por el lado de la apertura, se llaman <strong>várices</strong>: son restos de bordes antiguos.</li>
      <li><strong>Cordones espirales.</strong> Son perpendiculares al borde, así que recorren la vuelta a lo largo, paralelos a la sutura. Cada cordón es un punto del borde que fabrica siempre más concha que sus vecinos, como en <i>Turritella</i>. En los bivalvos, los cordones son las costillas radiales que van del umbo al borde, como en un berberecho.</li>
      <li><strong>Retícula y nódulos.</strong> Si hay costillas y cordones a la vez, forman una cuadrícula (<i>Cancellaria</i>). A veces el relieve solo sube donde se cruzan, y quedan <strong>nódulos</strong>, bultos en filas (<i>Cerithium</i>).</li>
      <li><strong>Quilla.</strong> Un solo cordón fuerte y afilado, a menudo en la periferia.</li>
      <li><strong>Espinas.</strong> Puntas que sobresalen a intervalos a lo largo de la vuelta, normalmente sobre las costillas o en el hombro.</li>
    </ul>
    <p>En los textos técnicos, las costillas axiales se llaman <em>comarginales</em> (siguen el borde) y los cordones, <em>antimarginales</em> (lo cortan).</p>

    <h3>Cómo lo dibuja la app</h3>
    <p>La pestaña <em>Ornamento</em> parte de la concha lisa de Raup y empuja su superficie hacia fuera allí donde hay relieve. La altura del relieve se mide en proporción al radio de la apertura, así que crece con la concha: una costilla de la última vuelta es mucho mayor que una de las primeras, igual que en una concha real.</p>
    <table class="keys plain">
      <tr><td>Costillas axiales</td><td><em>Costillas por vuelta</em>, <em>Altura</em>; en avanzado, <em>Anchura</em> (1 = ondulación suave) y <em>Asimetría</em> (para várices).</td></tr>
      <tr><td>Cordones espirales</td><td><em>Cordones</em>, <em>Altura</em>; en avanzado, <em>Anchura</em>. La casilla <em>Nódulos</em> deja el relieve solo en los cruces con las costillas.</td></tr>
      <tr><td>Espinas</td><td><em>Espinas por vuelta</em>, <em>Longitud</em>; en avanzado, <em>Base</em>, <em>Posición</em> (0 = periferia) y dos filas simétricas.</td></tr>
      <tr><td>Quilla</td><td>En avanzado: <em>Altura</em>, <em>Anchura</em> y <em>Posición</em>.</td></tr>
      <tr><td>Cambio con el crecimiento</td><td>En avanzado. Por debajo de 0, el relieve se va borrando hacia la apertura (muchas conchas son lisas de adultas); por encima de 0, aparece tarde.</td></tr>
    </table>
    <p>Las espinas no aparecen donde la concha aún es diminuta, porque allí serían motas: faltan en las primeras vueltas y en la parte de la concha que no llega a una quinta parte de su tamaño final. Por eso un bivalvo, que tiene una sola vuelta, las lleva en la parte exterior de su valva, como la almeja espinosa <i>Pitar lupanaria</i>.</p>

    <h3>La fórmula</h3>
    <p>Para quien quiera el detalle: cada punto \\(\\mathbf{P}\\) de la superficie de Raup se desplaza a lo largo de la normal \\(\\mathbf{n}\\), la dirección perpendicular a la superficie hacia fuera. El factor \\(W^{\\theta/2\\pi}\\,a\\) es el radio de la apertura en ese punto de la espiral (véase la página de Raup), y \\(\\delta\\) es la altura del relieve en unidades de ese radio:</p>
    \\[ \\mathbf{P}^{*}(\\theta,\\varphi) = \\mathbf{P}(\\theta,\\varphi) + W^{\\theta/2\\pi}\\,a\\,\\delta(\\theta,\\varphi)\\,\\mathbf{n}(\\varphi) \\]
    \\[ \\delta = f(s)\\,\\bigl[\\,h_r R(\\theta) + h_c C(u) + h_k K(u) + h_s \\Sigma(\\theta,u)\\,\\bigr] \\]
    <p>\\(\\theta\\) es la posición a lo largo de la espiral, y \\(u\\) la posición alrededor de la apertura, medida como fracción de su contorno (0 en la periferia). Cada término es un tipo de relieve, con su altura \\(h\\):</p>
    <ul>
      <li>\\(R(\\theta)\\): las costillas, \\(n_r\\) por vuelta. Cada una es un bulto suave (con forma de \\(\\cos^2\\)) que ocupa una fracción \\(w_r\\) del espacio entre costillas; la asimetría \\(k\\) lo hace abrupto por delante y suave por detrás.</li>
      <li>\\(C(u)\\): los cordones, \\(n_c\\) alrededor de la apertura, con anchura \\(w_c\\). Con nódulos, costillas y cordones se multiplican, \\((h_r + h_c)\\,R\\,C\\), así que el relieve solo sube donde coinciden los dos.</li>
      <li>\\(K(u)\\): la quilla, un cordón en la posición \\(u_k\\).</li>
      <li>\\(\\Sigma(\\theta,u)\\): las espinas, conos de longitud \\(h_s\\), \\(n_s\\) por vuelta, en una fila en \\(u_s\\) o en dos en \\(\\pm u_s\\).</li>
      <li>\\(f(s) = 1 + c\\,(2s-1)\\), limitado entre 0 y 2, con \\(s\\) la fracción de crecimiento (0 en el ápice, 1 en la apertura): es el <em>cambio con el crecimiento</em> \\(c\\).</li>
    </ul>
    <p>Esta parte es <strong>descriptiva</strong>, como el modelo de Raup: reproduce la forma del relieve sin explicar por qué aparece (Fowler, Meinhardt y Prusinkiewicz, 1992; Cortie, 1993). También hereda los límites de Raup. La apertura conserva siempre la misma forma, así que no se pueden dibujar conchas con un canal largo, como <i>Murex</i>, y quedan fuera de los ejemplos. Las espinas salen perpendiculares a la superficie, mientras que las reales a menudo se curvan hacia atrás o son canales abiertos.</p>

    <h3 id="mech-theory">¿Por qué ese número de cordones? Una explicación mecánica</h3>
    <p>¿Por qué una concha tiene nueve cordones y no veinte? Moulton, Goriely y Chirat (2012) propusieron una respuesta mecánica. Quien fabrica la concha es el <strong>borde del manto</strong>, una tira de tejido blanda que recorre el borde de la apertura y está pegada a la concha recién hecha. Si el manto crece un poco más deprisa que la concha, le sobra longitud; como está pegado, no puede estirarse sin más y se <strong>arruga en ondas</strong>, como una alfombra empujada contra la pared. Cada onda deja un cordón en la concha.</p>
    <p>¿Cuántas ondas? Hay dos costes que compiten:</p>
    <ul>
      <li><strong>Doblar el manto</strong> cuesta, y cuesta más cuantas más ondas haya, porque cada una es más cerrada.</li>
      <li><strong>Despegarlo de la concha</strong> también cuesta, y cuesta más cuantas menos ondas haya, porque cada una es más larga y más alta y lo separa más.</li>
    </ul>
    <p>El número de ondas que aparece es el que hace mínima la suma de los dos: el compromiso. En la app, el control <em>Unión / flexión</em> \\(\\Lambda\\) dice cuánto se sujeta el manto frente a lo rígido que es: con más sujeción o un manto más flexible salen <strong>más cordones y más finos</strong>. El control <em>Empuje del crecimiento</em> \\(\\eta\\) dice cuánto le sobra al manto: por debajo de 1 no llega para arrugarse y la concha queda lisa; por encima, las ondas crecen.</p>
    <p>En fórmulas, el manto es una varilla elástica de rigidez a flexión \\(B\\) sobre una base elástica de rigidez \\(k\\) (una base de Winkler). El empuje necesario para arrugarse en ondas de número de onda \\(q\\) es</p>
    \\[ P(q) = B\\,q^2 + \\frac{k}{q^2}, \\qquad P_c = 2\\sqrt{kB}, \\qquad q^{*} = \\left(\\frac{k}{B}\\right)^{1/4}. \\]
    <p>El primer término es el coste de doblar y el segundo, el de despegar. Alrededor de un borde de longitud \\(L_0\\) caben \\(n = qL_0/2\\pi\\) ondas. Con \\(\\Lambda = kL_0^4/B\\) y \\(\\eta = P/P_c\\):</p>
    \\[ \\frac{P(n)}{P_c} = \\frac{1}{2}\\left[\\left(\\frac{n}{n^{*}}\\right)^2 + \\left(\\frac{n^{*}}{n}\\right)^2\\right], \\qquad n^{*} = \\frac{\\Lambda^{1/4}}{2\\pi}. \\]
    <ul>
      <li>Con \\(\\eta < 1\\) no hay ninguna onda posible y la concha es lisa.</li>
      <li>Justo por encima de 1, aparece primero la onda más barata: \\(n^{*}\\) crestas, redondeado a un número entero. Su altura crece como \\(\\sqrt{\\eta - 1}\\); la teoría no da la constante, y la app usa \\(0{,}08\\,a\\sqrt{\\eta - 1}\\).</li>
      <li>Como \\(n^{*}\\) crece con \\(L_0\\), una apertura que crece admite cada vez más ondas, lo que encaja con que muchas conchas añadan cordones nuevos entre los antiguos.</li>
    </ul>
    <p>El panel <em>¿Por qué ese número de cordones?</em>, en los controles avanzados de la pestaña de ornamento, dibuja la curva \\(P(n)/P_c\\). La línea discontinua es el empuje elegido; la banda sombreada, los números de ondas que ese empuje puede producir, y el punto, el que aparece primero. El botón hace crecer esos cordones en la concha con un perfil suave y ondulado (anchura 1), que es la forma de una arruga.</p>

    <h3>Costillas y espinas</h3>
    <p>Las mismas ideas sirven para el resto del relieve. Las costillas axiales pueden ser una oscilación en el tiempo: la unión elástica frena al manto mientras crece, el borde se pasa y retrocede, y cada ciclo deja una costilla (Moulton, Goriely y Chirat, 2015, para los ammonites). Las espinas aparecen cuando el exceso de crecimiento se concentra en unos pocos puntos del borde, que se doblan hacia fuera; eso explica que grupos sin parentesco tengan espinas tan parecidas (Chirat, Moulton y Goriely, 2013). En la app, costillas y espinas se dibujan con el modelo descriptivo; solo los cordones tienen un modelo mecánico interactivo, porque su teoría es la más sencilla.</p>

    <h3>Qué deja fuera el modelo mecánico</h3>
    <p>Es un modelo simplificado: el manto es una tira uniforme sobre una unión uniforme, y solo describe el momento en que empiezan las arrugas. Los mantos reales varían de grosor y rigidez a lo largo del borde, las arrugas grandes interaccionan entre sí y la fabricación del carbonato cálcico tiene sus propias reglas. El modelo explica por qué deberían aparecer cordones regulares y qué fija su número, no la forma exacta de una concha concreta.</p>

    <h3>Referencias</h3>
    ${ORN_REFS}`,
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
    <p>Las ondas viajeras dibujan líneas oblicuas, y cuando dos se encuentran mueren las dos. Si no pasara nada más, las ondas se acabarían. En <i>Oliva porphyria</i> no se acaban: las líneas se <strong>ramifican</strong>, es decir, una línea suelta de pronto otra en sentido contrario, y las dos abren un triángulo. Las ramas aparecen en muchas líneas en el mismo momento, algo que ninguna señal local podría coordinar a lo largo de todo el borde.</p>
    <p>Meinhardt y Klingler (1987) lo explicaron con una sustancia compartida por todo el animal, como una hormona \\(R\\), que fabrican las células activas. Su concentración mide, por tanto, cuántas ondas hay. En su modelo cada célula oscila, porque el inhibidor dura más que el activador, y la hormona frena la eliminación del inhibidor, cuyo decaimiento pasa a ser \\(r_h/R\\):</p>
    ${HORMONE_TEX}
    <p>Mientras hay muchas ondas, \\(R\\) está alta y el inhibidor decae despacio: cada célula se enciende una vez y se apaga, y las ondas avanzan como siempre. Cuando los choques han dejado pocas ondas, \\(R\\) baja, el inhibidor se elimina deprisa y las células activas en ese momento <strong>se quedan encendidas</strong> en vez de apagarse. Cuando sus vecinas se han recuperado, la activación vuelve hacia ellas: una onda hacia atrás, es decir, una rama. Como \\(R\\) es igual en todas partes, ocurre en muchas líneas a la vez. Las ondas nuevas hacen subir \\(R\\) y todo vuelve a la normalidad. Así la hormona mantiene más o menos constante el número de ondas, y el decaimiento del inhibidor \\(r_h\\) fija ese número.</p>
    <p>En la app es el <em>Control global</em> \\(g\\) del modelo activador-inhibidor, y su valor es lo rápido que la hormona sigue a la actividad; con \\(g = 0\\) no hay hormona y las ecuaciones son las de siempre. El preset <i>Oliva porphyria</i> parte de las constantes de Fowler, Meinhardt y Prusinkiewicz (1992), con un decaimiento del inhibidor algo más rápido y más células, para que zonas de triángulos pequeños se alternen con otros grandes, como en la concha real. La inserción de células mantiene su tamaño a medida que crece la concha. Sin la hormona, las mismas constantes no forman ningún patrón. La concha real tiene además un fondo de retícula fina y más oscura que el modelo deja fuera, y su forma alargada queda fuera del modelo de Raup.</p>

    <h3>Triángulos blancos sobre fondo oscuro: <i>Conus marmoreus</i></h3>
    <p>El cono marmóreo tiene el patrón contrario: triángulos blancos sobre una red oscura. Meinhardt y Klingler (1987) lo explicaron con la misma hormona, ahora en el modelo activador-sustrato, donde frena la <strong>producción de sustrato</strong>, que pasa a ser \\(b_b/R\\):</p>
    ${GLOBAL_TEX}
    <p>Cuando los choques han dejado pocas ondas, \\(R\\) baja y hay más sustrato. Las células activas pasan entonces a una <strong>activación estable</strong>, mucho más baja que el pico de una onda pero por encima del umbral de pigmento, así que la región entre dos ramas queda <strong>pigmentada</strong>. Las ondas siguen su camino, y las células que dejan atrás esperan, sin pigmento, hasta la siguiente ramificación: son los triángulos blancos. Tienen que quedar activadas muchas células antes de que \\(R\\) suba lo bastante para volver a las ondas, y por eso las zonas oscuras son anchas. En la app es el <em>Control global</em> del modelo activador-sustrato, y el preset <i>Conus marmoreus</i> usa las constantes del artículo, con algo menos de saturación. Su umbral es bajo, mucho pigmento, para que se vea la activación estable. Con menos ondas y menos saturación, el mismo mecanismo da en cambio líneas oblicuas y uves (las constantes que se cargan al cambiar a este modelo).</p>

    <h3>Qué patrón sale de cada mecanismo</h3>
    <ul>
      <li><strong>Bandas a lo largo de la espiral</strong>, como en el caracol <i>Cepaea nemoralis</i>: picos de activador estables (activador-inhibidor con un inhibidor de largo alcance).</li>
      <li><strong>Rayas paralelas a las líneas de crecimiento</strong>, como las llamas del <i>Nautilus</i>: oscilaciones sincronizadas entre células vecinas (activador-inhibidor con un inhibidor de vida larga). Su contorno irregular y ramificado se debe a las diferencias entre células.</li>
      <li><strong>Puntos en filas espirales</strong>, como en los <i>Naticarius</i>: las dos cosas a la vez. El inhibidor mantiene separados los picos a lo largo del borde, como en las bandas, y dura más que el activador, así que cada pico se enciende y se apaga en su sitio, como en las llamas.</li>
      <li><strong>Líneas oblicuas y uves</strong>, como en muchos conos y volutas: ondas viajeras que se aniquilan al encontrarse (activador-sustrato).</li>
      <li><strong>Líneas que se ramifican en triángulos</strong>, como en <i>Oliva porphyria</i>: ondas viajeras y una hormona que, cuando quedan pocas ondas, las hace ramificarse en muchas líneas a la vez (activador-inhibidor con control global).</li>
      <li><strong>Triángulos blancos sobre fondo oscuro</strong>, como en <i>Conus marmoreus</i>: la misma ramificación, pero las células entre ramas quedan en una activación estable, baja y pigmentada (activador-sustrato con control global).</li>
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
    <p>El registro espacio-tiempo se envuelve sobre la superficie de Raup: la posición a lo largo del borde pasa a ser el ángulo \\(\\varphi\\) alrededor de la apertura, y el tiempo, el ángulo de enrollamiento \\(\\theta\\). Fowler, Meinhardt y Prusinkiewicz (1992) unieron así los dos modelos. Las células se reparten por igual a lo largo de la longitud real del borde, también en las aperturas elípticas. Como cada vuelta dura lo mismo pero es \\(W\\) veces mayor que la anterior, el registro y la concha tienen proporciones distintas: el registro da a todas las vueltas la misma altura, mientras que en la concha las primeras son diminutas. La vista <em>Concha desenrollada</em> vuelve a dibujar el registro con las proporciones de la concha, como un abanico que se abre desde el ápice. Se deposita pigmento allí donde el activador supera un umbral, por lo que los bordes del patrón son nítidos. Solo se pigmenta la capa externa de la concha, así que el interior de la apertura aparece sin pigmento, con un ligero brillo nacarado.</p>

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
  'info.controls': `
    <h3>Vista 3D</h3>
    <table class="keys">
      <tr><td>Arrastrar</td><td>Girar alrededor de la concha. Con el giro libre (el botón del globo, abajo a la derecha) gira la propia concha, en cualquier dirección.</td></tr>
      <tr><td>Rueda · pellizco</td><td>Acercar y alejar.</td></tr>
      <tr><td>Arrastrar con botón derecho · dos dedos</td><td>Desplazar la vista.</td></tr>
      <tr><td>3/4 · Apertural · Dorsal…</td><td>Las vistas estándar de la malacología. Con el giro libre, además vuelven a enderezar la concha.</td></tr>
      <tr><td>↕ · ↔ · globo</td><td>Eje de enrollamiento vertical, horizontal (conchas planispirales vistas de frente) o giro libre.</td></tr>
    </table>
    <h3>Teclado</h3>
    <table class="keys">
      <tr><td><kbd>Ctrl</kbd> <kbd>Z</kbd> · <kbd>⌘</kbd> <kbd>Z</kbd></td><td>Deshacer el último cambio (también la flecha de la barra de herramientas).</td></tr>
      <tr><td><kbd>F</kbd></td><td>Pantalla completa.</td></tr>
      <tr><td><kbd>H</kbd></td><td>Ocultar o mostrar los paneles, para ver solo la concha.</td></tr>
      <tr><td><kbd>Esc</kbd></td><td>Volver a mostrar los paneles o cerrar una ventana.</td></tr>
    </table>
    <h3>Barra de herramientas</h3>
    <table class="keys">
      <tr><td>Líneas · Sólido · Ambos</td><td>Cómo se dibuja la concha.</td></tr>
      <tr><td>Ecuación</td><td>Las ecuaciones del modelo, en forma general y con los valores actuales.</td></tr>
      <tr><td>Ejes</td><td>Los ejes x, y, z de la esquina.</td></tr>
      <tr><td>Apariencia</td><td>Colores, fondo, resolución de la malla, líneas y eje de enrollamiento.</td></tr>
      <tr><td>Gráficos</td><td>El morfoespacio y el perfil del pigmento sobre la vista 3D.</td></tr>
    </table>
    <h3>Deslizadores</h3>
    <p>Arrastra un deslizador o escribe un valor en su casilla. Las flechas del teclado mueven paso a paso el deslizador seleccionado. Cada cambio se guarda en la dirección de la página, así que al copiar el enlace se comparte exactamente lo que se ve.</p>`,
  'info.app': `
    <h3>Autor</h3>
    <p><strong>Alberto González Casarrubios</strong>, Universidad Complutense de Madrid. Para dudas, sugerencias o errores, escribe a <a href="mailto:albert23@ucm.es">albert23@ucm.es</a>.</p>

    <h3>Cómo citar</h3>
    <p>González Casarrubios, A. (2026). <i>Conchas en espiral: forma y color</i>. <a href="https://albertogonzalezcasarrubios.github.io/coiling-shells/" target="_blank" rel="noopener">albertogonzalezcasarrubios.github.io/coiling-shells</a></p>

    <h3>Código fuente</h3>
    <p>El código fuente y su documentación técnica están en <a href="https://github.com/AlbertoGonzalezCasarrubios/coiling-shells" target="_blank" rel="noopener">GitHub</a>.</p>

    <h3>Licencia</h3>
    <p>El código fuente se publica con la <a href="https://opensource.org/license/mit" target="_blank" rel="noopener">licencia MIT</a>. Los textos, explicaciones e imágenes están bajo una licencia <a href="https://creativecommons.org/licenses/by/4.0/deed.es" target="_blank" rel="noopener">Creative Commons Atribución 4.0 Internacional (CC BY 4.0)</a>. Puedes usar, compartir y adaptar ambos libremente, también con fines comerciales, siempre que reconozcas la autoría.</p>`,
};
