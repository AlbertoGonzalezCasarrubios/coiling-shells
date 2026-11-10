/**
 * Long pages of the About window in Spanish: the theory of each model, the
 * controls and the credits (HTML with TeX, typeset by MathJax when shown).
 */
import { GENERAL_TEX, DEFS_TEX, MIRROR_TEX, ORN_REFS, REFS, AI_TEX, AS_TEX, GLOBAL_TEX, MEIN_REFS } from './tex.js';

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
    <blockquote class="quote">
      Las conchas no son solo tubos enrollados: muchas tienen costillas, cordones, quillas o espinas, y este relieve, como el dibujo de color, se forma en el borde que crece.
    </blockquote>

    <h3>Tipos de ornamentación</h3>
    <p>Toda la ornamentación se construye en el borde de la apertura, con el borde del manto, y después queda fija en la concha. Se describe por su dirección respecto a ese borde.</p>
    <ul>
      <li>Las <strong>costillas axiales</strong> (comarginales) son paralelas al borde, así que cruzan las vueltas, como las líneas de crecimiento. Cada una registra un momento en que el manto depositó un labio más grueso o más abierto, como en <i>Epitonium</i> o en muchos ammonites. Unas pocas costillas fuertes por vuelta, abruptas por el lado de la apertura, son <strong>várices</strong>: restos de labios antiguos.</li>
      <li>Los <strong>cordones espirales</strong> (antimarginales) son perpendiculares al borde, así que recorren las vueltas, paralelos a la sutura. Cada uno es un punto del borde que siempre segrega más, como en <i>Turritella</i>. En los bivalvos son las costillas radiales de un berberecho.</li>
      <li>Cuando hay de los dos forman un dibujo <strong>reticulado</strong> (<i>Cancellaria</i>), y donde se cruzan pueden elevarse en <strong>nódulos</strong> (<i>Cerithium</i>).</li>
      <li>Una <strong>quilla</strong> es un solo cordón fuerte, a menudo en la periferia. Las <strong>espinas</strong> son proyecciones largas, normalmente sobre las costillas o en el hombro.</li>
    </ul>

    <h3>El modelo descriptivo</h3>
    <p>La pestaña <em>Ornamento</em> añade el relieve a la superficie de Raup. En cada punto, la curva generatriz se desplaza hacia fuera a lo largo de su normal \\(\\mathbf{n}(\\varphi)\\), en una cantidad proporcional al tamaño de la apertura, así que la ornamentación crece con la concha igual que el resto de la apertura:</p>
    \\[ \\mathbf{P}^{*}(\\theta,\\varphi) = \\mathbf{P}(\\theta,\\varphi) + W^{\\theta/2\\pi}\\,a\\,\\delta(\\theta,\\varphi)\\,\\mathbf{n}(\\varphi) \\]
    \\[ \\delta = f(s)\\,\\bigl[\\,h_r R(\\theta) + h_c C(u) + h_k K(u) + h_s \\Sigma(\\theta,u)\\,\\bigr] \\]
    <ul>
      <li>\\(R\\): \\(n_r\\) costillas axiales por vuelta a lo largo de \\(\\theta\\), contadas desde la apertura final. Cada una es un relieve en \\(\\cos^2\\) que ocupa una fracción \\(w_r\\) del espaciado; la asimetría \\(k\\) la hace abrupta por el lado de la apertura y suave por detrás, como las várices.</li>
      <li>\\(C\\): \\(n_c\\) cordones espirales alrededor del borde, en la coordenada de longitud de arco \\(u\\), que va de 0 a 1 empezando en la periferia. Con <em>nódulos</em>, los dos perfiles se multiplican, \\((h_r + h_c)\\,R\\,C\\), y el relieve solo aparece donde se cruzan.</li>
      <li>\\(K\\): una quilla, un cordón en la posición \\(u_k\\).</li>
      <li>\\(\\Sigma\\): espinas, conos de longitud \\(h_s\\) colocados \\(n_s\\) veces por vuelta, en una fila en \\(u_s\\) o en dos filas en \\(\\pm u_s\\).</li>
      <li>\\(f(s) = 1 + c\\,(2s-1)\\), con \\(s\\) la fracción de crecimiento desde el ápice (0) hasta la apertura (1): con \\(c < 0\\), la ornamentación se desvanece al crecer, como en muchas conchas que se vuelven lisas de adultas.</li>
    </ul>
    <p>Esta parte es <strong>descriptiva</strong>, como el modelo de Raup: reproduce la forma de la ornamentación sin explicarla (Fowler, Meinhardt y Prusinkiewicz, 1992; Cortie, 1993). También hereda los límites de Raup. La apertura conserva una misma forma, así que las conchas con un canal sifonal largo, como <i>Murex</i>, no se pueden dibujar y quedan fuera de los ejemplos. Las espinas apuntan según la normal de la superficie, mientras que las reales a menudo se curvan hacia atrás o son canales abiertos.</p>

    <h3 id="mech-theory">Una explicación mecánica de los cordones</h3>
    <p>¿Por qué una concha tiene nueve cordones y no veinte? Moulton, Goriely y Chirat (2012) propusieron una respuesta mecánica. El borde del manto es una tira blanda y elástica que recorre el borde de la apertura y está unida a la concha que acaba de segregar. Si el manto crece un poco más deprisa que el borde que debe seguir, queda comprimido a lo largo, y una tira comprimida sobre un soporte elástico se pandea en ondas, como una alfombra empujada contra la pared. La concha registra esas ondas como cordones.</p>
    <p>En la versión más sencilla, el borde del manto es una varilla elástica de rigidez a flexión \\(B\\) sobre una base elástica de rigidez \\(k\\) (una base de Winkler). Una onda de número de onda \\(q\\) cuesta energía de flexión, que crece con \\(q^2\\), y energía de la base, que crece con \\(1/q^2\\). La compresión \\(P\\) necesaria para pandearse en esa onda es</p>
    \\[ P(q) = B\\,q^2 + \\frac{k}{q^2}, \\qquad P_c = 2\\sqrt{kB}, \\qquad q^{*} = \\left(\\frac{k}{B}\\right)^{1/4}. \\]
    <p>Alrededor de un borde de longitud \\(L_0\\), \\(q\\) corresponde a \\(n = qL_0/2\\pi\\) ondas. Con la razón de rigideces adimensional \\(\\Lambda = kL_0^4/B\\) y la carga \\(\\eta = P/P_c\\):</p>
    \\[ \\frac{P(n)}{P_c} = \\frac{1}{2}\\left[\\left(\\frac{n}{n^{*}}\\right)^2 + \\left(\\frac{n^{*}}{n}\\right)^2\\right], \\qquad n^{*} = \\frac{\\Lambda^{1/4}}{2\\pi}. \\]
    <ul>
      <li>Por debajo del umbral (\\(\\eta < 1\\)) no hay ninguna onda posible y la concha es lisa.</li>
      <li>Justo por encima, la primera onda que aparece es la de menor carga: \\(n^{*}\\) crestas, redondeado a un número entero. Su amplitud crece como \\(\\sqrt{\\eta - 1}\\), como en cualquier bifurcación supercrítica; la teoría lineal no da la constante, y la app usa \\(0{,}08\\,a\\sqrt{\\eta - 1}\\).</li>
      <li>Una unión más rígida o un manto más blando (\\(\\Lambda\\) mayor) dan más cordones y más finos. Como \\(n^{*}\\) crece con \\(L_0\\), una apertura que crece favorece más ondas; esto encaja con que muchas conchas añadan cordones entre los antiguos a medida que crecen.</li>
    </ul>
    <p>El panel <em>¿Por qué ese número de cordones?</em>, en los controles avanzados de la pestaña de ornamento, dibuja esta curva. La banda sombreada muestra los números de onda inestables con la carga elegida, y el punto marca el primero que aparece. El botón hace crecer esos cordones en la concha con un perfil suave y sinusoidal (\\(w_c = 1\\)), porque esa es la forma de un modo de pandeo.</p>

    <h3>Costillas y espinas</h3>
    <p>Las mismas ideas se extienden a los otros tipos de ornamentación. Las costillas axiales pueden surgir como una oscilación en el tiempo: la unión elástica frena al borde del manto mientras crece, así que la apertura se pasa y retrocede, y la concha registra cada ciclo como una costilla (Moulton, Goriely y Chirat, 2015, para los ammonites). Las espinas aparecen cuando el exceso de crecimiento se concentra en unos pocos puntos del borde, que se doblan fuera de la superficie; esto explica que las espinas de grupos sin parentesco se parezcan tanto (Chirat, Moulton y Goriely, 2013). En la app estas formas se dibujan con el modelo descriptivo; solo los cordones tienen un modelo mecánico interactivo, porque su teoría es la más sencilla.</p>

    <h3>Qué deja fuera el modelo mecánico</h3>
    <p>Es un modelo lineal y unidimensional: el manto es una varilla uniforme, la base es uniforme y solo se describe el comienzo del pandeo. Los mantos reales varían en grosor y rigidez a lo largo del borde, las ondas interaccionan cuando son grandes y la secreción del carbonato cálcico tiene sus propias reglas. El modelo explica por qué deberían aparecer cordones regulares y qué fija su número, no la forma detallada de una concha concreta.</p>

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
    <p>Las ondas que se aniquilan y se ramifican dan zigzags, pero no los grandes triángulos de <i>Oliva porphyria</i>, en los que aparecen líneas nuevas en muchos puntos a la vez. Meinhardt y Klingler (1987) los explicaron con una sustancia adicional compartida por todo el animal, como una hormona. Esa sustancia mide la actividad total del borde: cuando muchas ondas se aniquilan y la actividad cae, la señal baja y facilita que surjan ondas nuevas en todas partes. Esta app usa una versión simplificada del mecanismo, que actúa sobre la producción basal de activador:</p>
    ${GLOBAL_TEX}
    <p>\\(c\\) sigue con retraso al activador medio \\(\\langle a \\rangle\\), y \\(g\\) fija la intensidad del control. Con \\(g = 0\\) no hay señal global.</p>
    <p>Esta versión simplificada mantiene las ondas iniciando otras nuevas cuando la actividad baja, y dibuja líneas oblicuas y uves. No reproduce la red densa de triángulos superpuestos de una <i>Oliva porphyria</i> real, que necesita el modelo completo de Meinhardt y Klingler; por eso la app no ofrece un preset de <i>Oliva</i>. Al cambiar al modelo activador-sustrato en los controles avanzados se cargan constantes que dibujan ondas viajeras.</p>

    <h3>Qué patrón sale de cada mecanismo</h3>
    <ul>
      <li><strong>Bandas a lo largo de la espiral</strong>, como en el caracol <i>Cepaea nemoralis</i>: picos de activador estables (activador-inhibidor con un inhibidor de largo alcance).</li>
      <li><strong>Rayas paralelas a las líneas de crecimiento</strong>, como las llamas del <i>Nautilus</i>: oscilaciones sincronizadas entre células vecinas (activador-inhibidor con un inhibidor de vida larga). Su contorno irregular y ramificado se debe a las diferencias entre células.</li>
      <li><strong>Puntos en filas espirales</strong>, como en los <i>Naticarius</i>: las dos cosas a la vez. El inhibidor mantiene separados los picos a lo largo del borde, como en las bandas, y dura más que el activador, así que cada pico se enciende y se apaga en su sitio, como en las llamas.</li>
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
    <p>González Casarrubios, A. (2026). <i>Conchas teóricas: forma y color</i>. <a href="https://albertogonzalezcasarrubios.github.io/coiling-shells/" target="_blank" rel="noopener">albertogonzalezcasarrubios.github.io/coiling-shells</a></p>

    <h3>Código fuente</h3>
    <p>El código fuente y su documentación técnica están en <a href="https://github.com/AlbertoGonzalezCasarrubios/coiling-shells" target="_blank" rel="noopener">GitHub</a>.</p>

    <h3>Licencia</h3>
    <p>El código fuente se publica con la <a href="https://opensource.org/license/mit" target="_blank" rel="noopener">licencia MIT</a>. Los textos, explicaciones e imágenes están bajo una licencia <a href="https://creativecommons.org/licenses/by/4.0/deed.es" target="_blank" rel="noopener">Creative Commons Atribución 4.0 Internacional (CC BY 4.0)</a>. Puedes usar, compartir y adaptar ambos libremente, también con fines comerciales, siempre que reconozcas la autoría.</p>`,
};
