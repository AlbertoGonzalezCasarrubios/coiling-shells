# Conchas de Raup

Explorador 3D interactivo del **modelo geométrico de enrollamiento de conchas de David M. Raup** (1962, 1966). Mueve los cuatro parámetros clásicos (W, D, T, S) y la concha se regenera en tiempo real.

Es una aplicación estática (HTML + CSS + JavaScript con módulos ES): no necesita compilación ni `npm install`. Three.js y MathJax se cargan desde jsDelivr.

## El modelo

Una curva generadora (una elipse, la apertura) recorre una espiral logarítmica alrededor de un eje fijo y se escala en un factor W en cada vuelta completa:

```
P(θ, φ) = W^(θ/2π) · ( (r_c + a·cos φ)·cos θ,
                        (r_c + a·cos φ)·sin θ,
                        −T·r_c + b·sin φ )

r_c = (1 + D) / 2      a = (1 − D) / 2      b = S · a
θ ∈ [−2πN, 0],  φ ∈ [0, 2π)
```

| Parámetro | Significado | Rango en la app |
|---|---|---|
| **W** | Tasa de expansión de la espiral: cuánto crece la apertura por vuelta | 1.0 – 10 |
| **D** | Distancia de la curva generadora al eje (r interno / r externo): tamaño del ombligo | 0 – 0.9 |
| **T** | Tasa de traslación: desplazamiento a lo largo del eje por unidad de desplazamiento radial | 0 – 10 |
| **S** | Forma de la curva generadora: razón entre el semieje axial y el radial de la elipse | 0.5 – 2.0 |
| N | Número de vueltas representadas (parámetro auxiliar, no forma parte del modelo de Raup) | 1 – 20 |

Con esta normalización, en la apertura final el borde interno está a distancia D del eje y el externo a distancia 1, que es la definición de D de Raup. La geometría se centra y escala para que la cámara no tenga que reencuadrarse al cambiar los parámetros.

### Presets

Los valores son aproximaciones dentro del morfoespacio de Raup, no medidas de ejemplares concretos.

| Preset | W | D | T | S |
|---|---|---|---|---|
| Caracol de jardín (*Cornu aspersum*) | 2.4 | 0.08 | 1.6 | 1.0 |
| Nautilus (*N. pompilius*) | 3.2 | 0.02 | 0 | 0.85 |
| Ammonite evoluto (*Dactylioceras*) | 1.9 | 0.45 | 0 | 0.9 |
| Turritella | 1.3 | 0.1 | 6.5 | 1.0 |
| Trompo (*Trochus*) | 1.8 | 0 | 2.5 | 0.8 |
| Planorbis | 2.1 | 0.3 | 0.15 | 1.0 |
| Physa (sinistral) | 3.5 | 0.05 | 2.2 | 1.4 |

## Funcionalidades

- **Modo Líneas** (por defecto): malla de líneas espirales y de crecimiento, con color, densidad y opacidad ajustables. Las líneas traseras se ocultan mediante un *depth pre-pass* invisible.
- **Modo Sólido**: `MeshStandardMaterial` con luz direccional, luz hemisférica, mapa de entorno y sombras suaves, con bandas de crecimiento opcionales.
- **Modo Ambos**: superficie sólida con las líneas encima.
- Fórmula con MathJax que muestra en vivo los valores sustituidos.
- OrbitControls (rotar, zoom, panear), autorrotación, eje de enrollamiento y exportación a PNG.
- El estado queda en la URL (`#W=2.4&D=0.08&T=1.6&S=1&N=4.5&h=1&m=lines`), así que se puede compartir un enlace a una forma concreta.

## Estructura

```
index.html                    Página, import map de Three.js y configuración de MathJax
css/styles.css                Estilos (tema claro/oscuro automático, responsive)
js/raup.js                    Matemática: malla paramétrica, líneas y normalización
js/presets.js                 Valores de los presets
js/main.js                    Escena Three.js, UI, fórmula en vivo y estado en la URL
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

## Referencias

- Raup, D. M. (1962). Computer as aid in describing form in gastropod shells. *Science*, 138, 150–152.
- Raup, D. M. (1966). Geometric analysis of shell coiling: general problems. *Journal of Paleontology*, 40, 1178–1190.
- Raup, D. M., & Michelson, A. (1965). Theoretical morphology of the coiled shell. *Science*, 147, 1294–1295.
