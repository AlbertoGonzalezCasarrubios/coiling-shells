# Conchas en espiral: introducción divulgativa

[← Volver al README en español](README.es.md)

**▶ Abrir la app: https://albertogonzalezcasarrubios.github.io/coiling-shells/**

Esta es una introducción divulgativa, sin tecnicismos, a la app y a los dos modelos en los que se basa. La descripción completa del repositorio está en el [README en español](README.es.md) y en el [README en inglés](../README.md).

> *"The basic form of many coiled gastropod shells can be defined by four parameters. A digital computer with automatic plotting equipment can be used to make graphical reconstructions of a shell from any given values of the four parameters."*
>
> — David M. Raup, *Science* (1962)

> *«La forma básica de muchas conchas enrolladas de gasterópodos puede definirse mediante cuatro parámetros. Un ordenador digital con un trazador automático puede usarse para reconstruir gráficamente una concha a partir de cualquier valor de esos cuatro parámetros.»*

En 1962 los ordenadores ocupaban habitaciones enteras y los dibujos salían, línea a línea, de trazadores con plumilla. Aun así, David M. Raup vio en ellos una forma nueva de hacer paleontología: en lugar de limitarse a describir las conchas que existen, generar todas las que *podrían* existir y preguntarse por qué la naturaleza solo ha producido algunas. Esta app es una versión interactiva de aquella idea: mueve sus cuatro parámetros y la concha se reconstruye al instante. Después puedes añadirle **costillas, cordones y espinas**, y pintarla con los patrones de pigmentación de **Hans Meinhardt**, que explican cómo surgen las rayas, bandas y triángulos de las conchas reales. Si prefieres ir paso a paso, el botón **Crea tu propia concha** te guía por todo el proceso.

La interfaz se abre en inglés y se puede pasar entera al español con el botón **EN / ES**.

## La idea: crecer sin cambiar de forma

Caracoles, ammonites, nautilos, almejas o braquiópodos crecen añadiendo material en el borde de la apertura, sin rehacer lo que ya tienen y sin cambiar su forma global. A este crecimiento autosemejante se le llama **gnomónico**, y su consecuencia geométrica es que la concha sigue una **espiral logarítmica**: cada vuelta es una copia ampliada de la anterior.

Raup describió la concha como una curva (la apertura, aquí una elipse) que gira alrededor de un eje mientras crece y, en su caso, se desplaza a lo largo de él. Bastan cuatro números para fijar la forma.

## Los cuatro parámetros

| Parámetro | Qué controla | Qué verás al moverlo |
|---|---|---|
| **W** · expansión de la espiral | Cuánto crece la apertura en cada vuelta | Valores bajos (≈1,2–2): muchas vueltas apretadas. Valores altos: la última vuelta lo domina todo. Valores enormes (10²–10⁴): bivalvos |
| **D** · distancia al eje | Lo lejos que pasa la apertura del eje de enrollamiento | D = 0: las vueltas tocan el eje, sin ombligo. D grande: un ombligo amplio y vueltas sueltas |
| **T** · traslación | Cuánto baja la apertura a lo largo del eje mientras crece | T = 0: concha plana (planispiral), como un nautilo o un ammonite. T alto: una espira alta, como Turritella |
| **S** · forma de la apertura | La proporción de la elipse que forma la apertura | S < 1: apertura ancha y baja. S > 1: apertura alta y estrecha |

Además, puedes elegir el **número de vueltas** dibujadas (N) y el **sentido** del enrollamiento: **dextral** (la mayoría de los caracoles, que giran en sentido horario vistos desde el ápice) o **sinistral**.

### La ecuación

En un sistema de ejes con z como eje de enrollamiento, cada punto de la concha es:

```
P(θ, φ) = W^(θ/2π) · ( (r_c + a·cos φ)·cos θ,
                     ε·(r_c + a·cos φ)·sin θ,
                       −T·r_c + b·sin φ )

r_c = (1 + D) / 2      a = (1 − D) / 2      b = S · a
```

- **θ** es el ángulo de giro alrededor del eje: tras una vuelta completa (2π) todo se ha multiplicado por W. Va de −2πN (el ápice) a 0 (la apertura final).
- **φ** recorre el contorno de la apertura.
- **r_c**, **a** y **b** son el centro y los semiejes de la elipse: así, en la apertura final el borde interno queda a distancia D del eje y el externo a distancia 1, que es justo como Raup definió D.
- **ε** vale −1 en conchas dextrales y +1 en sinistrales.

## El morfoespacio

Cada combinación de W, D, T y S es un punto en un espacio de conchas posibles: el **morfoespacio teórico**. El gran hallazgo de Raup fue que las conchas reales solo ocupan unas pocas regiones de ese espacio. Por ejemplo, en las conchas planas (T = 0) las vueltas solo se tocan si D ≤ 1/W; por encima de esa curva quedan separadas, una forma rarísima en la naturaleza. ¿Por qué está vacío el resto del espacio? Por restricciones funcionales, de desarrollo o simplemente históricas: es una de las preguntas que abrió la **morfología teórica**.

En la app, el panel **Morphospace W – D** dibuja este plano con la curva D = 1/W y las regiones aproximadas de ammonoideos, gasterópodos y bivalvos. Puedes pinchar en él para saltar a cualquier punto.

## También bivalvos

Las mismas ecuaciones generan las valvas de almejas, berberechos o mejillones (Raup, 1966). Cada valva es una espiral logarítmica con una **W enorme** (≈10²–10⁴), D bajo y T pequeño, que no llega a completar ni una vuelta: el umbo (el «pico» de la valva) es el ápice de la espiral. La segunda valva es, aproximadamente, la imagen especular de la primera respecto al plano por el que cierran las dos (la comisura). El botón **Mirror valve / Valva especular** la dibuja.

El modelo es una simplificación: no incluye la charnela, y no sirve para conchas con dos valvas distintas, como ostras, vieiras o braquiópodos. Las costillas radiales de un berberecho sí se pueden añadir como relieve (ver la sección siguiente).

## El relieve: costillas, cordones y espinas

Muchas conchas no son lisas. Igual que el color, el relieve se construye en el borde de la apertura y queda fijo en la concha:

- Las **costillas** cruzan las vueltas, como las líneas de crecimiento: cada una es un momento en que el animal fabricó un labio más grueso. Unas pocas costillas fuertes son **várices**, restos de labios antiguos.
- Los **cordones** recorren las vueltas, paralelos a la sutura: cada uno es un punto del borde que siempre segrega más. En los bivalvos son las costillas radiales del berberecho.
- Costillas y cordones juntos forman una **retícula**, y donde se cruzan pueden levantarse **nódulos**. Una **quilla** es un solo cordón muy marcado, y las **espinas** son puntas que sobresalen.

La pestaña **Ornamento** añade este relieve a la superficie de Raup, empujando la curva generatriz hacia fuera en proporción al tamaño de la apertura, así que el relieve crece con la concha. Sus ejemplos cargan la forma y el relieve de conchas reales: escalaria (*Epitonium clathrus*), *Turritella*, *Calliostoma*, *Cancellaria*, *Cerithium*, la concha sol *Astraea*, dos ammonites (uno con costillas y otro con espinas), un berberecho y una almeja espinosa (*Pitar lupanaria*). *Murex* no está: su largo canal sifonal no es un tubo enrollado y el modelo de Raup no lo puede dibujar.

Esta parte describe la ornamentación, pero no la explica. Para los cordones hay además una explicación mecánica (Moulton, Goriely y Chirat, 2012): el borde del manto es una tira elástica pegada a la concha que acaba de fabricar. Si crece un poco más deprisa que la concha, se arruga en ondas, como una alfombra empujada contra la pared, y cada onda deja un cordón. Doblar la tira cuesta (prefiere pocas ondas anchas) y despegarla también (prefiere muchas estrechas): el equilibrio fija cuántos cordones salen. En el modo avanzado de la pestaña hay un panel que lo muestra, y la ventana *Info* lo explica con detalle.

## El color: los patrones de Meinhardt

Un molusco solo añade pigmento donde la concha crece, en el borde de la apertura, y lo que pasa ahí queda grabado a medida que crece. Por eso, como mostró **Hans Meinhardt**, el dibujo de una concha es el **registro en el tiempo de un proceso que ocurre en una línea**: a lo largo del borde está el espacio, y en la dirección de crecimiento, el tiempo.

Ese proceso es una **reacción-difusión**, la idea que Alan Turing propuso en 1952 y que Gierer y Meinhardt desarrollaron en 1972: una sustancia **activadora** que se estimula a sí misma y un **antagonista** que difunde más deprisa y la frena. De la competición entre ambos surgen patrones regulares sin que nadie los dibuje. La app ofrece los dos modelos de Meinhardt:

- **Activador-inhibidor.** Si el inhibidor actúa rápido y llega lejos, los picos de activador son estables y dibujan **bandas a lo largo de la espiral** (como en *Cepaea nemoralis*). Si el inhibidor dura más que el activador, el sistema **oscila** y dibuja **rayas paralelas al borde** (como las llamas del *Nautilus*). Si pasan las dos cosas a la vez, cada pico se queda en su sitio pero se enciende y se apaga, y deja **filas de puntos** (como en los *Naticarius*).
- **Activador-sustrato.** La activación consume un sustrato que tarda en recuperarse, así que cada célula queda un tiempo **refractaria**. La activación avanza entonces como **ondas** que dibujan líneas oblicuas; cuando dos ondas chocan se aniquilan y forman una V. Meinhardt y Klingler (1987) explicaron los **triángulos** de *Oliva porphyria* con un **control global**: una hormona común a todo el animal que cuenta cuántas ondas hay. Cuando quedan pocas, las células activas se quedan encendidas y lanzan ondas hacia atrás, y muchas líneas se ramifican a la vez. La app lo incluye en el modelo activador-inhibidor, con un preset de *Oliva porphyria*. En el modelo activador-sustrato la misma hormona da el patrón contrario, triángulos blancos sobre una red oscura, como en *Conus marmoreus*, que también tiene su preset.

El pigmento se deposita en la capa externa de la concha, así que la app solo pinta el exterior: el interior de la apertura se ve claro, con un ligero brillo nacarado. Como en las simulaciones de Meinhardt, se deposita pigmento donde el activador supera un umbral, lo que da bordes nítidos; la *cantidad de pigmento* sube o baja ese umbral.

Además, el borde se alarga a medida que la concha crece. Con la **inserción de células**, se añaden células nuevas al borde y los elementos del patrón mantienen su tamaño, intercalándose rayas nuevas; sin ella, el patrón crece a la vez que la concha.

### Cómo cambiar de un tipo de patrón a otro

Cada tipo de patrón vive en su propia región del espacio de parámetros, y entre una región y otra el cambio es brusco: son **bifurcaciones** del modelo. No falta ningún parámetro, pero hay que saber qué tocar. El panel avanzado incluye estas recetas:

- **Bandas a lo largo de la espiral**: activador-inhibidor con un inhibidor de largo alcance (D<sub>h</sub> ≫ D<sub>a</sub>) y más rápido que el activador (r<sub>h</sub> > r<sub>a</sub>).
- **Rayas paralelas al borde**: activador-inhibidor con D<sub>h</sub> ≈ 0 y un inhibidor de vida más larga (r<sub>h</sub> < r<sub>a</sub>).
- **Líneas oblicuas y uves**: activador-sustrato sin saturación y con un sustrato que se recupera despacio; un control global débil mantiene las ondas.
- **Líneas que se ramifican en triángulos**: activador-inhibidor con un inhibidor de vida larga, apenas acoplamiento entre células y control global (la hormona de *Oliva*).
- **Triángulos blancos sobre fondo oscuro**: activador-sustrato con mucha saturación, control global y mucho pigmento (*Conus marmoreus*).

Al cambiar de modelo se cargan constantes que funcionan con él: las de un modelo no sirven para el otro (por ejemplo, sin producción de sustrato no hay patrón). Si una combinación de valores no forma patrón, la app lo indica en lugar de mostrar una concha en blanco. Un preset fija también la semilla, la inserción de células, el tiempo, la irregularidad, el tamaño, la cantidad de pigmento y los colores; con exactamente los mismos valores se obtiene exactamente el mismo patrón.

Unir la geometría de Raup con la pigmentación de Meinhardt no es una ocurrencia de esta app: es lo que hicieron Fowler, Meinhardt y Prusinkiewicz en 1992. El registro espacio-tiempo se envuelve sobre la concha: el borde da la vuelta a la apertura y el tiempo avanza con el enrollamiento.

## Cómo usar la app

Si quieres ponerte a prueba, el botón **Reto: imita la concha** te enseña una concha real con el nombre oculto y te pide que la imites moviendo los controles; una pista te dice qué cambiar y, al acertar, descubres de qué especie se trata. Los niveles van añadiendo parámetros, así que es una buena forma de aprender qué hace cada uno.

Si es tu primera vez, el botón **Crea tu propia concha** (arriba de la barra lateral) abre una ventana que recorre cinco pasos con controles sencillos: forma, ornamento, color, aspecto y exportación. La concha se ve en grande a la izquierda y puedes girarla mientras la cambias. Al final puedes ponerle nombre y descargar un fondo de pantalla del tamaño de tu pantalla o la ficha en PDF. Todo lo que hagas ahí se queda en la app, así que después puedes seguir afinándolo con los controles completos:

1. **Elige un preset** (caracol, Turritella, nautilo, ammonite, almeja…) para partir de una forma real.
2. **Mueve W, D, T y S** y observa cómo cambia la concha. W tiene dos escalas: **Lin** (1–10, para afinar caracoles y ammonites) y **Log** (1–10⁴, para bivalvos); pasa sola a Log cuando W supera 10.
3. **Explora el morfoespacio** en el panel desplegable: pincha o arrastra para elegir W y D. Es un corte del cubo W–D–T de Raup con el T actual: T, S y N no cambian, y las regiones de los grupos que no existen con ese T aparecen atenuadas. Pincha en el nombre de un grupo para cargar una concha típica, y cambia el eje W entre 1–10 (caracoles y cefalópodos en detalle) y 1–10⁴ (con los bivalvos).
4. **Cambia el modo de dibujo**: *Líneas* (malla de líneas, por defecto), *Sólido* (superficie con luces y sombras) o *Ambos*. Con relieve, la malla de líneas lo dibuja como una ilustración: líneas sobre las crestas de costillas y cordones, y cada espina perfilada.
5. **Usa las vistas estándar** de la malacología: 3/4, apertural (de frente a la apertura), dorsal, apical (desde el ápice), umbilical (desde la base) y perfil. Con el ratón puedes rotar (arrastrar), hacer zoom (rueda) y desplazar (clic derecho). Los tres botones de la derecha cambian la orientación: eje vertical, eje horizontal (para ver de frente un nautilus o un ammonites) o giro libre, para girar la concha como si la tuvieras en la mano.
6. **Pulsa *Animate growth*** para ver crecer la concha desde el ápice hasta la apertura.
7. **Abre *Equation*** para ver la fórmula general y la misma fórmula con los valores actuales, y ***About*** para la explicación detallada de los dos modelos.
8. **Añade relieve** en la pestaña **Ornamento**: elige un ejemplo o cambia el número y la altura de costillas, cordones y espinas, cada uno en su sección plegable (se abren solas las que tiene la concha). El modo **Avanzado** añade anchuras, asimetría, quilla, cambio con el crecimiento y el modelo mecánico de los cordones. **Quitar ornamentación** vuelve a la concha lisa.
9. **Píntala** en la pestaña **Pigmento · Meinhardt**: al entrar, las líneas desaparecen y la concha se ve sólida, en un color liso. Tú eliges el patrón en la galería, que muestra cada uno (Nautilus, Cepaea y Naticarius) con su miniatura; la opción **Solid colour** vuelve a la concha lisa. En la vista **Simple**, los controles cambian el patrón de forma gradual: **tamaño del patrón**, **tiempo de crecimiento**, **irregularidad**, **cantidad de pigmento** y la **semilla** (otra variación del mismo patrón). La vista **Advanced** muestra además el modelo y todas sus constantes, así que desde ahí se controla todo, y el **perfil del borde**: el activador y el inhibidor (o el sustrato) a lo largo del borde en el instante que elijas pinchando en el registro espacio-tiempo, con el umbral de pigmentación. El registro espacio-tiempo se puede ver **en el tiempo** (el diagrama de Meinhardt, con la misma altura para cada vuelta) o como **concha desenrollada** (con las proporciones reales: un abanico que se abre desde el ápice). Las ecuaciones de Meinhardt, con los valores actuales, están en *Equation*.
10. **Muestra gráficos sobre la vista 3D** desde el menú **Gráficos** (desactivados por defecto): la posición de la concha en el morfoespacio W – D, en la que también puedes pinchar, y el perfil del activador y el inhibidor (o el sustrato) a lo largo del borde, con un slider para elegir el instante del crecimiento.
11. **Para ver solo la concha**, usa *Pantalla completa* y *Ocultar info*. Si algo no te convence, la flecha de **deshacer** de la barra (o Ctrl+Z / ⌘Z) vuelve al paso anterior.
12. **Exporta** tu concha desde **Exportar…**, poniéndole un nombre si quieres:
    - una **imagen** de la vista actual (PNG, JPG o TIFF), a la resolución de la pantalla, doble o cuádruple, o a un tamaño fijo como 16:9 4K o el de un móvil, para fondos de pantalla;
    - una **lámina de vistas estándar**: las seis orientaciones de la malacología (apertural, dorsal, apical, umbilical, perfil y 3/4), sin perspectiva y rotuladas, también a esos tamaños;
    - una **ficha en PDF** (A4) con la lámina, los parámetros y la ornamentación, la posición en el morfoespacio y un enlace que reabre la concha, sobre blanco o sobre el color de fondo; si tiene patrón, otra página con el registro espacio-tiempo (con sus ejes), el perfil del activador y el inhibidor a lo largo del borde y las constantes; y, de forma opcional, las ecuaciones completas del modelo, en forma general y con los valores actuales;
    - un modelo para **impresión 3D** en **STL** o **3MF**: un sólido cerrado con pared de grosor real, en milímetros, listo para el programa de laminado; eliges el tamaño y el grosor de la pared;
    - un **modelo 3D con color** (GLB) para visores 3D, Blender o realidad aumentada;

    El eje de enrollamiento se puede incluir en la imagen, la lámina y el PDF aunque esté oculto en la vista. Si la concha está en modo **Lines**, lo exportado no lleva color: el PDF omite la pigmentación y el GLB contiene solo las líneas.
    - el **registro espacio-tiempo** del patrón como imagen.

    También puedes copiar la dirección de la página, que guarda la concha actual.

En el menú **Apariencia** de la barra superior puedes cambiar colores, resolución, grosor y densidad de las líneas, mostrar el eje de enrollamiento y su grosor, o volver a las paletas **Claro** y **Oscuro** si pierdes los colores. La página **Info → Controles** reúne todos los controles.

| Tecla | Acción |
|---|---|
| Ctrl+Z / ⌘Z | Deshacer el último cambio |
| F | Pantalla completa |
| H | Ocultar / mostrar toda la información |
| Esc | Salir de pantalla completa o volver a mostrar la información |

## Presets

Los valores son aproximaciones dentro del morfoespacio de Raup, no medidas de ejemplares concretos.

| Grupo | Preset | W | D | T | S | Valva especular |
|---|---|---|---|---|---|---|
| Gasterópodos | Caracol de jardín (*Cornu aspersum*) | 2.4 | 0.08 | 1.6 | 1.0 | |
| | Turritella | 1.3 | 0.1 | 6.5 | 1.0 | |
| | Trompo (*Trochus*) | 1.45 | 0 | 3.0 | 0.6 | |
| | Planorbis | 2.1 | 0.3 | 0.15 | 1.0 | |
| | Physa (sinistral) | 2.6 | 0 | 3.0 | 1.5 | |
| | *Peringia ulvae* | 1.8 | 0 | 3.8 | 1.2 | |
| Cefalópodos | Nautilus (*N. pompilius*) | 3.2 | 0.02 | 0 | 0.85 | |
| | Ammonite evoluto (*Dactylioceras*) | 1.9 | 0.45 | 0 | 0.9 | |
| Bivalvos | Almeja (*Venus*) | 1000 | 0 | 0.35 | 1.1 | ✓ |

### Conchas ornamentadas

Cada ejemplo de la pestaña Ornamento carga la forma y el relieve a la vez.

| Ejemplo | Forma | Relieve |
|---|---|---|
| Escalaria (*Epitonium clathrus*) | espira alta de vueltas redondas | costillas laminares |
| *Turritella* | la del preset | cordones espirales |
| Trompo (*Calliostoma*) | la de *Trochus* | quilla y cordones finos |
| *Cancellaria* | oval | retícula |
| *Cerithium* | espira alta | filas de nódulos |
| Concha sol (*Astraea*) | cono bajo | espinas en la periferia |
| Ammonites con costillas (*Dactylioceras*) | la del preset | costillas |
| Ammonites con costillas y espinas | planispiral | costillas y dos filas de espinas |
| Berberecho (*Cerastoderma*) | la de la almeja | costillas radiales |

### Patrones de pigmentación

Aproximaciones a los tipos de patrón de cada especie, no ajustes a ejemplares reales.

| Patrón | Modelo | Mecanismo | Inserción de células |
|---|---|---|---|
| *Nautilus*: rayas en llama | Activador-inhibidor | Oscilación (inhibidor de vida larga) | Sí |
| *Cepaea nemoralis*: bandas espirales | Activador-inhibidor | Picos estables (inhibición de largo alcance) | No |
| *Naticarius*: puntos en filas espirales | Activador-inhibidor | Picos en su sitio que se encienden y se apagan (inhibición de alcance medio y vida larga) | Sí |
| *Oliva porphyria*: triángulos que se ramifican | Activador-inhibidor con control global | Ondas viajeras que se ramifican cuando una hormona indica que quedan pocas | Sí |
| *Conus marmoreus*: triángulos blancos sobre red oscura | Activador-sustrato con control global | Las mismas ramas, con las células entre ellas en una activación baja y pigmentada | Sí |

## Para desarrolladores

Los detalles técnicos (estructura del código, cómo se construye la malla, convenciones de ejes, renderizado, exportación y tests) están en [ARCHITECTURE.md](ARCHITECTURE.md), en inglés.

## Contacto

Para cualquier duda o comentario: **Alberto González Casarrubios** (Universidad Complutense de Madrid) · [albert23@ucm.es](mailto:albert23@ucm.es)

## Licencia

© 2026 Alberto González Casarrubios. El código fuente se publica con la [licencia MIT](../LICENSE). Los textos, explicaciones e imágenes están bajo una licencia [Creative Commons Atribución 4.0 Internacional (CC BY 4.0)](LICENSE-CONTENT.md). Puedes usar, compartir y adaptar ambos libremente, también con fines comerciales, siempre que reconozcas la autoría.

## Cómo citar

Si usas la app en un trabajo, una clase o una publicación, puedes citarla así:

> González Casarrubios, A. (2026). *Coiling Shells: Form and Colour* (versión 1.3.0) [Software]. https://github.com/AlbertoGonzalezCasarrubios/coiling-shells

Los datos de cita también están en [CITATION.cff](../CITATION.cff).

## Referencias

- Raup, D. M. (1961). The geometry of coiling in gastropods. *PNAS*, 47, 602–609.
- Raup, D. M. (1962). Computer as aid in describing form in gastropod shells. *Science*, 138, 150–152.
- Raup, D. M., & Michelson, A. (1965). Theoretical morphology of the coiled shell. *Science*, 147, 1294–1295.
- Raup, D. M. (1966). Geometric analysis of shell coiling: general problems. *Journal of Paleontology*, 40, 1178–1190.
- Turing, A. M. (1952). The chemical basis of morphogenesis. *Philosophical Transactions of the Royal Society B*, 237, 37–72.
- Gierer, A., & Meinhardt, H. (1972). A theory of biological pattern formation. *Kybernetik*, 12, 30–39.
- Meinhardt, H., & Klingler, M. (1987). A model for pattern formation on the shells of molluscs. *Journal of Theoretical Biology*, 126, 63–89.
- Fowler, D. R., Meinhardt, H., & Prusinkiewicz, P. (1992). Modeling seashells. *Computer Graphics (SIGGRAPH '92)*, 26(2), 379–387.
- Meinhardt, H. (2009). *The Algorithmic Beauty of Sea Shells* (4.ª ed.). Springer.
