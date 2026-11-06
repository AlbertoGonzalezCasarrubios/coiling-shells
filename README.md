# Theoretical Shells: Form and Colour

[![Tests](https://github.com/AlbertoGonzalezCasarrubios/coiling-shells/actions/workflows/tests.yml/badge.svg)](https://github.com/AlbertoGonzalezCasarrubios/coiling-shells/actions/workflows/tests.yml)
[![License: MIT](https://img.shields.io/badge/code-MIT-blue.svg)](LICENSE)
[![Content: CC BY 4.0](https://img.shields.io/badge/content-CC%20BY%204.0-lightgrey.svg)](LICENSE-CONTENT.md)
[![Live app](https://img.shields.io/badge/app-live-2a9d8f.svg)](https://albertogonzalezcasarrubios.github.io/coiling-shells/)

**English** · [Español](docs/README.es.md)

An interactive 3D explorer of the **theoretical morphology of coiled shells**. The shape comes from David M. Raup's shell-coiling model (1962, 1966). The colour pattern comes, optionally, from Hans Meinhardt's reaction–diffusion models of shell pigmentation. It runs entirely in the browser, with no installation.

**▶ Open the app: https://albertogonzalezcasarrubios.github.io/coiling-shells/**

![The app showing a banded snail shell coloured with Meinhardt's activator–inhibitor model, with the W–D morphospace and the activator and inhibitor profiles overlaid on the 3D view](docs/images/app.png)

## Statement of need

Raup's model is the classic example of a **theoretical morphospace**: four numbers generate the coiled shells of snails, ammonoids, nautiloids, bivalves and brachiopods, and the space they span shows which forms exist in nature and which do not. Meinhardt's models show how the stripes, bands and triangles on those shells can arise from simple local interactions along the growing margin. Both are standard material in palaeontology, evolutionary biology and pattern formation courses, but they are usually taught with static figures, or with code that students must install and run.

This app lets students, teachers and researchers:

- **change the parameters and see the shell rebuild instantly**, with the equation shown both in general form and with the current values;
- **place the shell in Raup's morphospace** and see why a region is occupied or empty;
- **grow a pigmentation pattern on that shell** and watch the activator and the inhibitor (or substrate) that produce it;
- **take the result out of the screen**: a plate of the standard malacological views, a PDF sheet with all the values and equations, or a closed, watertight solid ready for a 3D printer.

The interface and the explanations are available in English and Spanish.

## Features

**Shape (Raup).** Whorl expansion rate W, distance from the axis D, translation rate T, aperture shape S, number of whorls N, and dextral or sinistral coiling. A mirror valve is available for equivalve bivalves. The app includes presets for real forms (garden snail, *Turritella*, *Trochus*, *Planorbis*, *Physa*, *Nautilus*, an evolute ammonite and a clam). It has line, solid and combined render modes, the six standard views of malacology and a growth animation.

**Morphospace.** An interactive W–D plane with the contact curve D = 1/W and the approximate regions occupied by gastropods, ammonoids and nautiloids, and bivalves and brachiopods. The plane is drawn as a section of Raup's W–D–T cube at the current T: regions of groups that do not exist at that T are faded, and clicking a group's name loads a typical shell of that group.

**Colour (Meinhardt).** Activator–inhibitor and activator–substrate models, with optional global control and cell insertion along the growing margin. Presets reproduce the pattern types of *Nautilus*, *Cepaea nemoralis* and *Oliva porphyria*. Simple controls expose real quantities of the model (number of cells, growth time, cell-to-cell irregularity, pigment threshold); advanced controls expose every constant of the equations. The space–time record can be viewed in time (Meinhardt's diagram) or unrolled with the true proportions of the shell. A margin profile plots the activator and the inhibitor or substrate at any moment of growth.

**Export.** Six export options:

| Output | Content |
|---|---|
| PNG | The current view, at up to four times the screen resolution |
| Plate | The six standard views in orthographic projection, labelled |
| PDF | A4 sheet with the plate, the parameters, the morphospace, the pigmentation record and profile, and optionally the full equations with their values |
| STL, 3MF | A closed solid with a real wall thickness, in millimetres, for 3D printing |
| GLB | A coloured 3D model for viewers, Blender or augmented reality |
| Pattern | The space–time record as an image |

**Sharing.** The current shell and pattern are stored in the page address, so copying the link shares exactly what is on screen.

![Plate of the six standard views of a garden snail shell, drawn with lines](docs/images/standard-views.png)

## The models

**Raup's coiling model.** A generating curve, here an ellipse that represents the aperture, is swept around the coiling axis z. After one full revolution every linear dimension has been multiplied by W:

```
P(θ, φ) = W^(θ/2π) · ( (r_c + a·cos φ)·cos θ,
                      ε·(r_c + a·cos φ)·sin θ,
                        −T·r_c + b·sin φ )

r_c = (1 + D)/2,   a = (1 − D)/2,   b = S·a,   θ ∈ [−2πN, 0],   φ ∈ [0, 2π)
```

ε = −1 for dextral and +1 for sinistral shells. With this normalisation the final aperture has its outer edge at distance 1 from the axis and its inner edge at distance D, as in Raup's definition.

**Meinhardt's pigmentation models.** Pigment is laid down only at the growing margin, so a shell pattern is a time record of a one-dimensional reaction–diffusion process. For example, the activator–inhibitor model is:

```
∂a/∂t = s·(a²/(h·(1 + κa²)) + b_a) − r_a·a + D_a·∂²a/∂x²
∂h/∂t = s·a² − r_h·h + D_h·∂²h/∂x² + b_h
```

Here s is the source density of each cell. The activator–substrate model replaces the inhibitor with a substrate b that the activator consumes. The space–time record is wrapped onto Raup's surface, as in Fowler, Meinhardt and Prusinkiewicz (1992).

The *About* dialog in the app explains both models in detail, in English and Spanish.

## Getting started

**Online.** Open https://albertogonzalezcasarrubios.github.io/coiling-shells/ in a recent desktop or mobile browser with WebGL.

**Locally.** The app is a static site with no build step. ES modules do not load from `file://`, so serve the folder:

```bash
git clone https://github.com/AlbertoGonzalezCasarrubios/coiling-shells.git
cd coiling-shells
python3 -m http.server 8000      # or: npm run serve
# open http://localhost:8000
```

Three.js, MathJax and jsPDF are loaded from a CDN, so an internet connection is needed.

**Keyboard.** `F` fullscreen · `H` hide or show all panels · `Esc` leave fullscreen or show the panels again.

## Testing and validation

The test suite uses the built-in Node.js test runner and has no dependencies:

```bash
npm test          # requires Node.js ≥ 20
```

The tests check, among other things, that:

- successive planispiral whorls **touch exactly at D = 1/W** for any aperture shape, measured on the generated mesh;
- the pattern coordinate follows the **arc length** of the aperture, so cells are evenly spaced on elliptical apertures;
- every pigmentation preset forms a pattern. The same seed always gives the same pattern, and parameter sets that form no pattern are reported as such instead of being rescaled into a false one;
- bands of the activator–inhibitor model are stable in time, while the flame stripes oscillate;
- each shape preset lies in the morphospace region of its group;
- the printable solid is **closed and consistently oriented**, faces outwards, has exactly the requested size and rests on z = 0. This is checked for every preset and for extreme parameters, wall thicknesses and sizes;
- STL and 3MF files are well formed;
- English and Spanish strings are complete.

The tests run on every push through GitHub Actions. [ARCHITECTURE.md](ARCHITECTURE.md) lists what each test file covers and explains the implementation.

## Limitations

These are minimal models. Raup's model assumes a constant aperture shape and orientation (no allometry), and it has no ornament, internal structures or hinge. The morphospace regions are approximate outlines, not fits to measured data. Meinhardt's models treat the margin as a closed ring of equivalent cells, and the molecules involved have not been identified in any mollusc. The presets reproduce the type of form or pattern of each species, not particular specimens.

## Contributing

Bug reports, suggestions and contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and the [code of conduct](CODE_OF_CONDUCT.md).

## Citation

If you use this software in teaching or research, please cite it:

> González Casarrubios, A. (2026). *Theoretical Shells: Form and Colour* (version 1.0.0) [Computer software]. https://github.com/AlbertoGonzalezCasarrubios/coiling-shells

Citation metadata are in [CITATION.cff](CITATION.cff), which GitHub shows as *Cite this repository*.

## License

- **Source code:** [MIT License](LICENSE).
- **Texts, explanations and images:** [Creative Commons Attribution 4.0 International (CC BY 4.0)](LICENSE-CONTENT.md).
- **Third-party libraries:** Three.js (MIT), MathJax (Apache-2.0) and jsPDF (MIT) are loaded from a CDN under their own licences.

## Contact

Alberto González Casarrubios, Universidad Complutense de Madrid · [albert23@ucm.es](mailto:albert23@ucm.es)

## References

- Ermentrout, B., Campbell, J., & Oster, G. (1986). A model for shell patterns based on neural activity. *The Veliger*, 28, 369–388.
- Fowler, D. R., Meinhardt, H., & Prusinkiewicz, P. (1992). Modeling seashells. *Computer Graphics (SIGGRAPH '92)*, 26(2), 379–387.
- Gierer, A., & Meinhardt, H. (1972). A theory of biological pattern formation. *Kybernetik*, 12, 30–39.
- Meinhardt, H. (2009). *The Algorithmic Beauty of Sea Shells* (4th ed.). Springer.
- Meinhardt, H., & Klingler, M. (1987). A model for pattern formation on the shells of molluscs. *Journal of Theoretical Biology*, 126, 63–89.
- Raup, D. M. (1961). The geometry of coiling in gastropods. *Proceedings of the National Academy of Sciences*, 47, 602–609.
- Raup, D. M. (1962). Computer as aid in describing form in gastropod shells. *Science*, 138, 150–152.
- Raup, D. M. (1966). Geometric analysis of shell coiling: general problems. *Journal of Paleontology*, 40, 1178–1190.
- Raup, D. M. (1967). Geometric analysis of shell coiling: coiling in ammonoids. *Journal of Paleontology*, 41, 43–65.
- Raup, D. M., & Michelson, A. (1965). Theoretical morphology of the coiled shell. *Science*, 147, 1294–1295.
- Turing, A. M. (1952). The chemical basis of morphogenesis. *Philosophical Transactions of the Royal Society B*, 237, 37–72.
