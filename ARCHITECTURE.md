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
js/raup.js      Matemática: malla paramétrica, líneas, valva especular, normalización
js/presets.js   Valores de los presets
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

Devuelve `positions`, `colors`, `indices`, `lineIndices`, la posición del eje de enrollamiento, los valores derivados (r_c, a, b) y estadísticas.

### Convención de ejes

La ecuación usa un sistema dextrógiro (x, y, z) con z como eje de enrollamiento. Three.js usa Y hacia arriba, así que la correspondencia es:

```
X = x      Y = z      Z = −y
```

Con esta correspondencia, el parámetro interno `hand` (+1 dextral, −1 sinistral) equivale a −ε en la ecuación. El gizmo de ejes dibuja x, y, z del sistema matemático, no de Three.js.

### Densidad con W alto

En los bivalvos (W de 10² a 10⁴), casi toda la valva está en la última fracción de vuelta. Para que la malla y las líneas de crecimiento no queden escasas, `main.js` multiplica `segPerTurn` y `ringsPerTurn` por `max(1, log10 W)`.

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
- **Estado en la URL.** La forma actual se guarda en el *hash* (`#W=2.4&D=0.08&T=1.6&S=1&N=4.5&h=1&v=0&m=lines`) con `history.replaceState`, así que copiar la dirección comparte la concha.
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
