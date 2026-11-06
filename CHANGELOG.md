# Changelog

All notable changes to this project are documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [semantic versioning](https://semver.org/).

## [1.0.0] - 2026-11-06

First release in its own repository. The app was previously published as `shells-morphology/` in [aplicaciones-varias](https://github.com/AlbertoGonzalezCasarrubios/aplicaciones-varias); that address now redirects here.

### Shape
- Raup's coiling model with W, D, T, S, N and dextral or sinistral coiling, with the equation shown in general form and with the current values.
- Mirror valve for equivalve bivalves, and presets for gastropods, cephalopods and a bivalve.
- Line, solid and combined render modes; the six standard views of malacology; growth animation.

### Morphospace
- Interactive W–D morphospace with the contact curve D = 1/W and the approximate regions of the main groups, drawn as a section of Raup's W–D–T cube at the current T.
- Group names load a typical shell of each group; the W axis can span 1–10 or 1–10⁴.

### Colour
- Meinhardt's activator–inhibitor and activator–substrate models, with global control and cell insertion.
- Presets for *Nautilus*, *Cepaea nemoralis* and *Oliva porphyria*; simple and advanced controls.
- Space–time record in time or unrolled with the true proportions of the shell; margin profile of the activator and the inhibitor or substrate.
- Pattern cells spaced by arc length along elliptical apertures.

### Export
- PNG of the current view, plate of standard views, PDF sheet with optional equations, closed solids for 3D printing (STL, 3MF) and a coloured 3D model (GLB).

### Project
- English and Spanish interface, explanations and documentation.
- Automated test suite (`npm test`) with continuous integration.
- Licences: MIT for the code and CC BY 4.0 for texts and images.

[1.0.0]: https://github.com/AlbertoGonzalezCasarrubios/coiling-shells/releases/tag/v1.0.0
