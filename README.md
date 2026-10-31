# Theoretical Shell Morphology · Morfología teórica de conchas

Interactive 3D explorer of the **theoretical morphology of coiled shells**, based on **David M. Raup's shell-coiling model** (1962, 1966). The interface opens in English and can be switched entirely to Spanish (EN / ES button).

Explorador 3D interactivo de la **morfología teórica de conchas enrolladas**, basado en el **modelo de enrollamiento de David M. Raup** (1962, 1966). Mueve los cuatro parámetros clásicos (W, D, T, S) y la concha se regenera en tiempo real. La interfaz se abre en inglés y se puede pasar entera a español con el botón EN / ES.

Es una aplicación estática (HTML + CSS + JavaScript con módulos ES): no necesita compilación ni `npm install`. Three.js y MathJax se cargan desde jsDelivr.

## El modelo

Una curva generadora (una elipse, la apertura) recorre una espiral logarítmica alrededor de un eje fijo y se escala en un factor W en cada vuelta completa. En un sistema dextrógiro con z como eje de enrollamiento:

```
P(θ, φ) = W^(θ/2π) · ( (r_c + a·cos φ)·cos θ,
                     ε·(r_c + a·cos φ)·sin θ,
                       −T·r_c + b·sin φ )

r_c = (1 + D) / 2      a = (1 − D) / 2      b = S · a
θ ∈ [−2πN, 0],  φ ∈ [0, 2π),  ε = −1 dextral, +1 sinistral
```

| Parámetro | Significado | Rango en la app |
|---|---|---|
| **W** | Tasa de expansión de la espiral: cuánto crece la apertura por vuelta | 1 – 10⁴ (slider logarítmico) |
| **D** | Distancia de la curva generadora al eje (r interno / r externo): tamaño del ombligo | 0 – 0.9 |
| **T** | Tasa de traslación: desplazamiento a lo largo del eje por unidad de desplazamiento radial | 0 – 10 |
| **S** | Forma de la curva generadora: razón entre el semieje axial y el radial de la elipse | 0.5 – 2.0 |
| N | Número de vueltas representadas (auxiliar, no forma parte del modelo de Raup) | 0.25 – 20 |

En la apertura final el borde interno está a distancia D del eje y el externo a distancia 1, que es la definición de D de Raup. La geometría se centra y escala para que la cámara no tenga que reencuadrarse al cambiar los parámetros.

### Bivalvos

Las mismas ecuaciones generan las valvas de los bivalvos (Raup, 1966): cada valva es una espiral logarítmica con **W muy alto** (≈10²–10⁴), D bajo y T pequeño, que solo completa una fracción de vuelta. La segunda valva es aproximadamente la imagen especular respecto al plano de la apertura (la comisura), `P' = (x, −y, z)`, y es lo que dibuja el botón **Mirror valve / Valva especular**. El modelo no representa la charnela, las conchas inequivalvas (ostras, vieiras) ni los braquiópodos, cuyas dos valvas son distintas.

### Presets

Los valores son aproximaciones dentro del morfoespacio de Raup, no medidas de ejemplares concretos.

| Grupo | Preset | W | D | T | S | Valva especular |
|---|---|---|---|---|---|---|
| Gasterópodos | Caracol de jardín (*Cornu aspersum*) | 2.4 | 0.08 | 1.6 | 1.0 | |
| | Turritella | 1.3 | 0.1 | 6.5 | 1.0 | |
| | Trompo (*Trochus*) | 1.8 | 0 | 2.5 | 0.8 | |
| | Planorbis | 2.1 | 0.3 | 0.15 | 1.0 | |
| | Physa (sinistral) | 3.5 | 0.05 | 2.2 | 1.4 | |
| Cefalópodos | Nautilus (*N. pompilius*) | 3.2 | 0.02 | 0 | 0.85 | |
| | Ammonite evoluto (*Dactylioceras*) | 1.9 | 0.45 | 0 | 0.9 | |
| Bivalvos | Almeja (*Venus*) | 1000 | 0 | 0.35 | 1.1 | ✓ |

## Funcionalidades

- **Modos de render**: *Líneas* (por defecto; líneas espirales y de crecimiento con eliminación de líneas ocultas), *Sólido* (`MeshStandardMaterial` con luz direccional, hemisférica, mapa de entorno y sombras suaves) y *Ambos*.
- **Vistas estándar** con transición suave: 3/4, apertural, dorsal, apical, umbilical y perfil.
- **Indicador de ejes x, y, z** en la esquina (ocultable), coherente con el sistema de la ecuación.
- **Ecuación** (general y con los valores actuales) en un panel desplegable con MathJax.
- **Panel de información** con el fundamento teórico, la ecuación, los bivalvos y el funcionamiento de la app.
- **Morfoespacio W – D** interactivo con la curva D = 1/W y las regiones aproximadas de ammonoideos, gasterópodos y bivalvos; clic o arrastre para elegir W y D.
- **Animación de crecimiento** desde el ápice hasta la apertura.
- **Apariencia** en un cajón desplegable: paletas de color predefinidas (claro y oscuro) para restaurar los colores, colores personalizados, resolución de la malla, número de líneas, grosor de línea (px), opacidad, bandas de crecimiento, eje de enrollamiento y autorrotación.
- **Exportación** a PNG y a STL (80 mm, para impresión 3D o CAD; la apertura queda abierta, así que la malla no es estanca).
- **Bilingüe** EN / ES; la página siempre se abre en inglés.
- **Estado en la URL** (`#W=2.4&D=0.08&T=1.6&S=1&N=4.5&h=1&v=0&m=lines`) para compartir un enlace a una forma concreta.

## Estructura

```
index.html                    Página, import map de Three.js y configuración de MathJax
css/styles.css                Estilos (tema claro/oscuro automático, responsive)
js/raup.js                    Matemática: malla paramétrica, líneas, valva especular, normalización
js/presets.js                 Valores de los presets
js/i18n.js                    Textos en inglés y español (incluido el panel de información)
js/main.js                    Escena Three.js, UI, vistas, gizmo, morfoespacio, fórmulas y URL
.github/workflows/deploy.yml  Despliegue automático en GitHub Pages
```

## Ejecución local

Los módulos ES no funcionan abriendo el archivo con `file://`, así que hay que servir la carpeta con cualquier servidor estático:

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

## Despliegue en GitHub Pages

1. Crea un repositorio en GitHub y súbelo:
   ```bash
   git remote add origin https://github.com/<usuario>/<repo>.git
   git push -u origin main
   ```
2. En GitHub, ve a **Settings → Pages → Build and deployment → Source** y elige **GitHub Actions**.
3. Cada push a `main` ejecuta `.github/workflows/deploy.yml` y publica la web en `https://<usuario>.github.io/<repo>/`.

Como todas las rutas son relativas, la app funciona en cualquier subruta sin configurar nada más.

## Contacto

Para cualquier duda o comentario: **Alberto González Casarrubios** (Universidad Complutense de Madrid) · [albert23@ucm.es](mailto:albert23@ucm.es)

## Licencia

© 2026 Alberto González Casarrubios. Esta obra está bajo una licencia [Creative Commons Atribución-NoComercial 4.0 Internacional (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/): se puede compartir y adaptar reconociendo la autoría, pero no con fines comerciales. El texto completo está en [LICENSE](LICENSE).

Three.js (MIT) y MathJax (Apache-2.0) se cargan desde CDN y mantienen sus propias licencias.

## Referencias

- Raup, D. M. (1961). The geometry of coiling in gastropods. *PNAS*, 47, 602–609.
- Raup, D. M. (1962). Computer as aid in describing form in gastropod shells. *Science*, 138, 150–152.
- Raup, D. M., & Michelson, A. (1965). Theoretical morphology of the coiled shell. *Science*, 147, 1294–1295.
- Raup, D. M. (1966). Geometric analysis of shell coiling: general problems. *Journal of Paleontology*, 40, 1178–1190.
