# Arquitectura

Notas técnicas para quien quiera entender, modificar o ampliar la app. El fundamento teórico y el uso están en el [README](README.md).

## Tecnologías

Es una página estática: HTML, CSS y JavaScript con módulos ES, sin compilación ni `npm install`.

- **Three.js 0.160** (WebGL), cargado desde jsDelivr mediante un *import map* en `index.html`. Se usan también los addons `OrbitControls`, `RoomEnvironment`, `LineSegments2` / `LineMaterial` y `STLExporter`.
- **MathJax 3** para las fórmulas, también desde jsDelivr.
- Fuentes Inter y JetBrains Mono desde Google Fonts.

## Estructura

```
index.html      Página, import map de Three.js y configuración de MathJax
favicon.svg     Icono (ammonite generado con una espiral logarítmica)
css/styles.css  Estilos: tema claro/oscuro automático, responsive
js/raup.js      Matemática: malla paramétrica, UV, líneas, valva especular, normalización
js/meinhardt.js Pigmentación: modelos de reacción-difusión de Meinhardt (función pura)
js/pigment-worker.js  Web Worker que ejecuta meinhardt.js fuera del hilo principal
js/presets.js   Valores de los presets de forma y de pigmentación
js/i18n.js      Textos en inglés y español, incluido el panel About
js/main.js      Escena, interfaz, vistas, gizmo, morfoespacio, fórmulas, exportación y URL
LICENSE         CC BY-NC 4.0
```

## Geometría (`js/raup.js`)

`buildShell(params)` es una función pura: recibe los parámetros y devuelve arrays tipados listos para la GPU.

1. **Rejilla θ × φ.** θ va de −2πN a 0 con `segPerTurn` pasos por vuelta; φ recorre la apertura con `segPhi` pasos. Cada punto se calcula con la ecuación de Raup (factor de crecimiento `g = W^(θ/2π)`).
2. **Valva especular.** Si `mirror` está activo, se duplican los vértices reflejados (y → −y) y se invierte el orden de los triángulos de la copia para que las normales sigan apuntando hacia fuera.
3. **Normalización.** La concha se centra y se escala para que su mayor dimensión mida `size`. Así la cámara nunca tiene que reencuadrar. Se usa siempre la concha completa, aunque la animación de crecimiento muestre solo una parte, para que la escala no cambie mientras crece.
4. **Triángulos.** Cada celda de la rejilla son dos triángulos. φ es cerrado (la apertura es una curva cerrada), así que no hay costura.
5. **Líneas.** Las líneas espirales son φ constante y las de crecimiento son θ constante (las posiciones sucesivas de la apertura). Los anillos se cuentan desde la apertura hacia el ápice para que la apertura final siempre tenga el suyo.
6. **Colores por vértice** para las bandas de crecimiento del modo sólido.
7. **Coordenadas de textura.** u = φ/2π (alrededor de la apertura) y v = posición en θ (0 en el ápice, 1 en la apertura). La columna φ = 2π repite la φ = 0 para que la textura no dé la vuelta en el último triángulo; `main.js` promedia después las normales de esa costura para que no se vea al iluminar.

Devuelve `positions`, `colors`, `indices`, `lineIndices`, la posición del eje de enrollamiento, los valores derivados (r_c, a, b) y estadísticas.

### Convención de ejes

La ecuación usa un sistema dextrógiro (x, y, z) con z como eje de enrollamiento. Three.js usa Y hacia arriba, así que la correspondencia es:

```
X = x      Y = z      Z = −y
```

Con esta correspondencia, el parámetro interno `hand` (+1 dextral, −1 sinistral) equivale a −ε en la ecuación. El gizmo de ejes dibuja x, y, z del sistema matemático, no de Three.js.

### Densidad con W alto

En los bivalvos (W de 10² a 10⁴), casi toda la valva está en la última fracción de vuelta. Para que la malla y las líneas de crecimiento no queden escasas, `main.js` multiplica `segPerTurn` y `ringsPerTurn` por `max(1, log10 W)`.

## Pigmentación (`js/meinhardt.js`)

`simulatePattern(params, geometry)` es una función pura que devuelve `{ values, state }`: una matriz `rows × width` de activador entre 0 y 1 (la fila 0 es el ápice) y un diagnóstico `state` (`'pattern'`, `'uniform'` o `'extinct'`).

- **Modelos.** Activador-inhibidor y activador-sustrato de Meinhardt, con saturación κ. El segundo admite un control global: una señal `c` que sigue la actividad media del borde y aumenta la producción basal cuando la actividad cae (`b_a + g / (1 + 40c)`), una versión simplificada del mecanismo de Meinhardt y Klingler (1987) para los triángulos.
- **Borde periódico** de hasta 256 células, con laplaciano discreto (Δx = 1).
- **Integración.** Euler explícito con paso `dt = min(0.5, 0.4/D_max, 0.4/r_max)`, estable para la difusión. Los valores se limitan para que parámetros extremos no desborden.
- **Tiempo.** Cada fila recibe el mismo tiempo (`T / rows`): una espiral logarítmica recorrida a ritmo angular constante equivale a un crecimiento con tasa relativa constante.
- **Inserción de células.** Opcional: el borde tiene `256 · W^(θ/2π)` células (mínimo 8). Cada célula nueva duplica a una vecina elegida al azar, con su propia densidad de fuente. Cada fila se remuestrea a la anchura de la textura.
- **Ruido.** La densidad de fuente de cada célula es `r_a · (1 ± noise)`, con un generador pseudoaleatorio con semilla (mulberry32): la misma semilla da siempre el mismo patrón.
- **Normalización.** Escala robusta entre los percentiles 2 y 99,5, ignorando el primer cuarto de filas (el transitorio inicial del ápice), para que un pico aislado no apague el resto. Si el activador se extingue (`hi < 1e-4`) o el borde queda prácticamente uniforme (`(hi − lo)/hi < 5 %`), no se reescala: amplificar diferencias minúsculas fabricaría un patrón falso. La interfaz muestra entonces un aviso.

En `main.js`, el resultado se colorea con un **umbral de pigmentación**, como en las simulaciones de Meinhardt: pigmento donde el activador supera `1 − cantidad`, con una transición corta (*smoothstep* de semiancho `PIGMENT_EDGE = 0.12`) para que los bordes sean nítidos sin dientes. Como el remuestreo de células a texels es lineal y el umbral se aplica después, los bordes caen con precisión por debajo de una célula. La textura es una `DataTexture` de 1024 × 2048. La misma imagen se dibuja en el lienzo espacio-tiempo de la pestaña. La simulación se repite solo cuando cambian sus parámetros o, con inserción de células, W o N; cambiar los colores solo vuelve a pintar. El cálculo va en un *Web Worker* de tipo módulo; si el navegador no lo admite, se hace en el hilo principal.

Con el patrón activo, el material sólido usa la textura en lugar del color y de las bandas por vértice; al desactivarlo vuelve el color sólido.

- **Flujo de la pestaña.** Entrar en la pestaña de pigmento activa el patrón (y pasa del modo líneas al sólido). Una galería muestra la opción de color sólido y cada preset con una miniatura real, calculada una sola vez en un *worker* aparte.
- **Vista simple y avanzada.** Son excluyentes: la avanzada muestra las mismas magnitudes que la simple más el modelo, sus constantes y la inserción de células, así que desde ahí se controla todo. Al cambiar de modelo se cargan las constantes de su preset de referencia (`MODEL_REFERENCE` en `presets.js`), manteniendo colores, tamaño y cantidad.
- **Controles simples y avanzados.** Los simples son magnitudes reales, no multiplicadores ocultos: el *tamaño del patrón* fija las células del borde (`nMax = 256 / tamaño`), el *tiempo de crecimiento* es `T`, la *irregularidad* es `noise` y la *cantidad de pigmento* solo desplaza el umbral del coloreado (sin volver a simular). Las constantes de las ecuaciones están en el desplegable avanzado, con sliders logarítmicos (`log: true` en `createParam`); con `zero: true`, la posición más a la izquierda vale exactamente 0. Al arrastrar un slider logarítmico, el valor se redondea a lo que se muestra (dos cifras significativas), así que el valor visible es siempre el real y un patrón se puede reproducir escribiendo sus números. La vista avanzada incluye recetas para pasar de un tipo de patrón a otro.
- **Cálculos obsoletos.** Si llega un cálculo nuevo mientras el *worker* sigue ocupado, se termina y se crea otro: al arrastrar un slider solo importa el último valor.
- **Exterior e interior.** `raup.js` ordena los vértices de cada triángulo para que las caras frontales miren siempre hacia fuera del tubo, también en conchas dextrales y en la valva especular, porque ambas invierten la orientación. Así el exterior (`FrontSide`) lleva el color o el patrón, y el interior (`BackSide`) un `MeshPhysicalMaterial` claro con algo de iridiscencia, como el nácar.
- **Ecuaciones.** El panel *Equation* tiene dos vistas, Raup y Meinhardt. La de Meinhardt muestra las ecuaciones del modelo activo y las mismas con los valores actuales, omitiendo los términos nulos.

## Renderizado (`js/main.js`)

- **Modos.** *Lines* dibuja solo las líneas; *Solid*, la superficie con `MeshStandardMaterial`, luz direccional con sombras suaves, luz hemisférica y un mapa de entorno (`RoomEnvironment`); *Both*, las dos cosas.
- **Líneas con grosor.** Las líneas nativas de WebGL miden siempre 1 px, así que se usa `LineSegments2` con `LineMaterial`, que admite grosor en píxeles.
- **Eliminación de líneas ocultas.** En el modo *Lines* se dibuja la superficie con `colorWrite: false`: solo escribe en el búfer de profundidad y tapa las líneas traseras. Un `polygonOffset` empuja la superficie un poco hacia atrás para que las líneas visibles no parpadeen.
- **Gizmo de ejes.** Es una segunda escena con cámara ortográfica que copia la orientación de la cámara principal y se dibuja en una esquina con `setScissor` / `setViewport`.
- **Vistas estándar.** La transición interpola la posición de la cámara en coordenadas esféricas (acimut y elevación por separado). Así la orientación es continua incluso al llegar a las vistas apical y umbilical, que miran a lo largo del eje vertical. Antes de empezar se consume la inercia pendiente de `OrbitControls` para que la cámara no gire al terminar.
- **Encuadre en pantallas verticales.** En móvil se amplía el campo de visión vertical para conservar el encuadre horizontal.
- **Reconstrucción.** Al mover cualquier control se marca la malla como sucia y se reconstruye en el siguiente fotograma, una sola vez aunque cambien varios valores.

## Interfaz

- **Parámetros.** `createParam` genera cada control (slider y casilla numérica sincronizados). W tiene escala lineal (1–10) o logarítmica (1–10⁴), y pasa sola a la logarítmica cuando su valor supera 10.
- **Morfoespacio.** Es un `<canvas>` 2D con eje W logarítmico, la curva D = 1/W y regiones aproximadas. Solo se redibuja cuando su panel está abierto.
- **Fórmulas.** MathJax se configura con `startup.typeset: false` y cada fórmula se compone cuando su panel se hace visible, mediante una cola de promesas para que no se solapen dos composiciones.
- **Idiomas.** `js/i18n.js` contiene todos los textos. En el HTML, los atributos `data-i18n`, `data-i18n-html` y `data-i18n-title` indican qué traducir; el resto (parámetros, presets, HUD, morfoespacio) se traduce desde `main.js`. La página se abre siempre en inglés.
- **Estado en la URL.** La forma actual se guarda en el *hash* (`#W=2.4&D=0.08&T=1.6&S=1&N=4.5&h=1&v=0&m=lines`) con `history.replaceState`, así que copiar la dirección comparte la concha. Si el patrón está activo se añaden `pg=1` y sus parámetros (`pm`, `pDa`, `pD2`, …, `ps` para la semilla, `pi` para la inserción y `pcb`/`pcp` para los colores).
- **Pestañas.** La barra lateral tiene dos pestañas (Forma y Pigmento) y el diálogo About tres páginas (Raup, Meinhardt y App). Cada página se compone con MathJax la primera vez que se muestra.
- **Pantalla completa y ocultar info.** La pantalla completa usa la Fullscreen API sobre el contenedor del visor. El modo *Hide info* añade la clase `clean` al `<body>`, que oculta por CSS todo menos el lienzo y un botón para volver.

## Exportación

- **PNG.** Se renderiza un fotograma y se lee el lienzo con `toDataURL`.
- **STL.** `STLExporter` en binario, escalado para que la concha mida 80 mm. La apertura queda abierta, así que la malla no es estanca; algunos programas de impresión 3D pueden pedir repararla.

## Ejecución local

Los módulos ES no funcionan abriendo el archivo con `file://`, así que hay que servir la carpeta:

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

## Publicación

La app vive en la carpeta `shells-morphology/` del repositorio [aplicaciones-varias](https://github.com/AlbertoGonzalezCasarrubios/aplicaciones-varias), y GitHub Pages la publica directamente desde la rama `main` en https://albertogonzalezcasarrubios.github.io/aplicaciones-varias/shells-morphology/. Todas las rutas son relativas, así que funciona en cualquier subcarpeta. Para actualizarla basta con reemplazar el contenido de esa carpeta.

El icono se enlaza como `favicon.svg?v=N`; si se cambia el dibujo, conviene subir el número para que los navegadores no sigan mostrando el antiguo desde su caché.

## Licencias de terceros

Three.js (MIT) y MathJax (Apache-2.0) se cargan desde CDN y mantienen sus propias licencias.
