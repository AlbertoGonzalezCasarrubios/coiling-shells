# Contributing

Thank you for your interest in this project. Bug reports, ideas, corrections to the explanations and code contributions are all welcome.

## Reporting problems and asking for help

- **Bugs:** open an [issue](https://github.com/AlbertoGonzalezCasarrubios/coiling-shells/issues/new/choose) with the *Bug report* template. Please include your browser and operating system, the steps to reproduce the problem and, if possible, the link to the shell (the page address stores the current parameters).
- **Ideas and scientific corrections:** use the *Feature request* template, or open a blank issue. Corrections to the models or the explanations are especially valuable; please cite your source.
- **Questions:** open an issue or write to albert23@ucm.es.

## Contributing code

1. Fork the repository and create a branch from `main`.
2. Serve the folder locally (`python3 -m http.server 8000`) and check your change in the browser, in English and Spanish, and in light and dark themes.
3. Run the tests with `npm test` (Node.js ≥ 20, no dependencies). Add or update tests for any change in the pure modules (`js/raup.js`, `js/meinhardt.js`, `js/morphospace.js`, `js/export3d.js`).
4. Open a pull request that describes what changes and why.

### Conventions

- The app is a static site: no build step and no runtime dependencies beyond the CDN libraries already used.
- Code and comments are in English. Every user-facing string goes in `js/i18n.js`, in both English and Spanish (the tests check that both languages have the same keys).
- Keep the scientific modules pure (no DOM, no Three.js), so they can run in the Web Worker and in the tests.
- [ARCHITECTURE.md](ARCHITECTURE.md) explains how the app is organised.

## Support and maintenance

The project is maintained by Alberto González Casarrubios (Universidad Complutense de Madrid) on a best-effort basis. Issues are usually answered within a couple of weeks.

## Code of conduct

Everyone taking part in this project is expected to follow the [code of conduct](CODE_OF_CONDUCT.md).
