# Ideas for future work

*Coiling Shells: Form and Colour* is complete as it is, but there is room to take it further. These are ideas that anyone who wants to can pick up. They are not promises: nobody is working on them at the moment. If you take one on, open an issue first so that others know, and read [ARCHITECTURE.md](ARCHITECTURE.md) to see how the program is organised and tested.

## 1. A shared database for the challenge and the classroom

The challenge (*Reto*) runs entirely in the browser: scores are not saved anywhere, so players cannot compare their results and a teacher cannot collect them.

What could be added:

- a leaderboard, so the challenge becomes a competition;
- class sessions: the teacher creates a session with a short code, the students join it, and the teacher sees everyone's results live or afterwards (for example, to discuss in class which shells were hardest to match and why);
- export of a session's results to CSV.

Things to keep in mind:

- The app is a static site on GitHub Pages, so a database needs an external backend (for example Supabase or Firebase) or a small server of its own.
- Many players will be school students, often minors: collect as little personal data as possible (an alias rather than a name), and comply with data protection law (GDPR in Europe).
- The app must keep working without a connection, as it does now; the database should be an optional extra.
- The challenge logic is in `js/model/challenge.js` (pure, tested in Node) and its interface in `js/ui/challenge.js`.

## 2. Siphonal canals, slits and apertures that are not ellipses

Raup's model sweeps an ellipse along the spiral. Many real shells have apertures that are not ellipses:

- **siphonal canals**: the base of the aperture drawn out into a tube (spindle shells, murexes) or cut into a notch (whelks, dog whelks, helmet shells);
- **slits and holes**: the slit band of *Pleurotomaria* and the row of holes of abalones (*Haliotis*);
- **narrow, straight apertures**: cones (*Conus*), cowries (*Cypraea*) and olives (*Oliva*), where the aperture is a long slit;
- **flared lips**: the wing of conchs (*Strombus*), which grows only at the end of growth.

**Work already done.** The `canal-sifonal` branch has an unfinished attempt. Below, the ellipse is replaced by the outline of a real aperture (columella, canal along the axis, shoulder), with parameters for length, width, shoulder, opening, narrowing, bend and a notch. Long canals look right, but short canals and notches are not yet realistic, so the branch has not been merged. The same branch also adds spines in several rows, which work well and could be merged on their own.

**Possible approach.** Make the generating curve a general closed outline (for example a spline or a Fourier series) instead of an ellipse, as Fowler, Meinhardt and Prusinkiewicz (1992) did. A canal, a slit or a cone's aperture is then just another outline. Parts that change during growth, such as the flared lip of conchs, need the outline to depend on θ as well. The orientation of the aperture matters too: in Raup's model it lies in a plane that contains the axis, while in real shells it is tilted. Contreras-Figueroa and Aragón (2023) place the aperture with the Frenet frame of the spiral and add two angles, a tilt and a turn, which could be added here as well.

## 3. From a photo of a shell to the parameters

A user takes a photo of a real shell, and the app finds the parameters (W, D, T, S, the number of whorls, and perhaps the ornament and the pattern) that make the most similar shell.

Possible approaches:

- **Measuring by hand.** Contreras-Figueroa and Aragón (2023) give a standard way to obtain each parameter of their model from two measurements on apertural and apical photographs, and publish it as a Mathematica notebook. Adapted to W, D, T and S, it would let a user click a few points on a photo, and it is the natural baseline for any automatic method.
- **Render and compare.** Render the model, compare it with the photo (silhouette, edges, or features from an image model) and adjust the parameters with an optimiser (for example CMA-ES, or gradient descent with a differentiable renderer). The app already renders any shell from standard views, which helps.
- **A trained model.** The app can generate as many synthetic images with known parameters as needed, which is the training data a network needs to predict the parameters from an image. It could then be refined with real photos.
- **A multimodal AI model.** Send the photo to a vision-capable AI model and ask it for a first estimate of the parameters, then refine it with render and compare.

Things to keep in mind:

- The shell must be photographed from a known view (the apertural view is the standard one); otherwise the orientation has to be estimated too.
- Shape is the easiest part. Ornament and, above all, the pigmentation pattern are much harder.
- A model that runs on an external service needs a backend and has a cost. If it runs in the browser, the photo never leaves the user's device, which matters in schools.
- This would also make a good teaching tool: students photograph shells from a collection and see where they fall in Raup's morphospace.

## References

- Contreras-Figueroa, G., & Aragón, J. L. (2023). A mathematical model for mollusc shells based on parametric surfaces and the construction of theoretical morphospaces. *Diversity*, 15, 431. https://doi.org/10.3390/d15030431

## Other ideas

Smaller ideas are welcome as issues on GitHub.
