/**
 * PDF sheet: an A4 report with the plate of standard views, the parameters and
 * ornament, the position in the morphospace, a link that reopens the shell, the
 * pigmentation page and, optionally, the equations typeset by MathJax.
 *
 * jsPDF and the SVG build of MathJax are loaded only when a sheet is made. The
 * sheet reads the app through a context object (see pdfContext in export-dialog.js).
 */
import { $, formatW, f, sig, hexRgb, luminance } from './util.js';
import { t, tParam, tPattern, getLang } from '../i18n/i18n.js';
import { PATTERN_PRESETS } from '../model/presets.js';
import { hasOrnament } from '../model/ornament.js';

/** One line describing the relief in use, for the PDF ("" if the shell is smooth). */
function ornamentSummary(state) {
  const o = state,
    parts = [];
  if (!hasOrnament(o)) return '';
  if (o.ribN > 0 && o.ribH > 0) parts.push(t('ex.pdf.orn.ribs', o.ribN));
  if (o.cordN > 0 && o.cordH > 0) parts.push(t('ex.pdf.orn.cords', o.cordN));
  if (o.nodules && o.ribN > 0 && o.cordN > 0) parts.push(t('ex.pdf.orn.nodules'));
  if (o.keelH > 0) parts.push(t('ex.pdf.orn.keel'));
  if (o.spineN > 0 && o.spineH > 0) parts.push(t('ex.pdf.orn.spines', o.spineN));
  if (o.ornGrowth < 0) parts.push(t('ex.pdf.orn.fades'));
  else if (o.ornGrowth > 0) parts.push(t('ex.pdf.orn.late'));
  return `${t('ex.pdf.orn')}: ${parts.join(' · ')}`;
}

/** Rows of the PDF parameter table for the ornament terms in use. */
function ornamentRows(state) {
  const s = state,
    rows = [];
  if (!hasOrnament(s)) return rows;
  if (s.ribN > 0 && s.ribH > 0) rows.push([`${t('orn.ribs')} (n, h, w)`, `${s.ribN}, ${f(s.ribH, 2)}, ${f(s.ribW, 2)}`]);
  if (s.cordN > 0 && s.cordH > 0) rows.push([`${t('orn.cords')} (n, h, w)`, `${s.cordN}, ${f(s.cordH, 2)}, ${f(s.cordW, 2)}`]);
  if (s.nodules) rows.push([t('orn.nodules.short'), t('ex.yes')]);
  if (s.keelH > 0) rows.push([`${t('orn.keel')} (h, w, u)`, `${f(s.keelH, 2)}, ${f(s.keelW, 2)}, ${f(s.keelPos, 2)}`]);
  if (s.spineN > 0 && s.spineH > 0) rows.push([`${t('orn.spines')} (n, h, w)`, `${s.spineN}, ${f(s.spineH, 2)}, ${f(s.spineW, 2)}`]);
  if (s.ornGrowth) rows.push([t('orn.growth'), f(s.ornGrowth, 2)]);
  return rows;
}

let jsPDFPromise = null;
function loadJsPDF() {
  jsPDFPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js';
    s.onload = () => resolve(window.jspdf.jsPDF);
    s.onerror = () => {
      jsPDFPromise = null;
      reject(new Error('jsPDF'));
    };
    document.head.append(s);
  });
  return jsPDFPromise;
}

const LIGHT_COLORS = {
  '--surface': '#ffffff',
  '--surface-2': '#f1eee6',
  '--border': '#e3ddd0',
  '--text': '#1c2430',
  '--muted': '#6b7280',
  '--accent': '#115e59',
};

/**
 * Colours of the PDF sheet for a given page colour: the usual light palette on
 * light pages, light ink on dark ones. Graphs drawn on canvas use the same keys.
 */
function pdfPalette(page) {
  if (luminance(page) >= 0.5) {
    const white = page.toLowerCase() === '#ffffff';
    return { ...LIGHT_COLORS, '--surface': page, '--surface-2': white ? LIGHT_COLORS['--surface-2'] : mixHex(page, '#000000', 0.05) };
  }
  return {
    '--surface': page,
    '--surface-2': mixHex(page, '#ffffff', 0.07),
    '--border': mixHex(page, '#ffffff', 0.22),
    '--text': '#e8eaee',
    '--muted': '#a3abb5',
    '--accent': '#6cc7bb',
  };
}

const mixHex = (a, b, k) =>
  '#' +
  hexRgb(a)
    .map((c, i) =>
      Math.round(c + (hexRgb(b)[i] - c) * k)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');

/** Standard PDF fonts only cover Latin-1: arrows, dashes and Greek letters are replaced. */
function pdfSafe(text) {
  return (
    String(text)
      .replace(/[–—−]/g, '-')
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/…/g, '...')
      .replace(/←/g, '<-')
      .replace(/→/g, '->')
      .replace(/σ/g, 'sigma')
      .replace(/κ/g, 'kappa')
      .replace(/θ/g, 'theta')
      .replace(/φ/g, 'phi')
      .replace(/≈/g, '~')
      // eslint-disable-next-line no-control-regex -- keeps exactly the Latin-1 range of the standard PDF fonts
      .replace(/[^\x00-\xff]/g, '')
  );
}

export async function exportPDF(app) {
  const {
    state,
    pattern,
    lastBuild,
    patternCanvas,
    profileRow,
    PATTERN_CELLS,
    PATTERN_ROWS,
    colourShown,
    drawMorphoOn,
    drawProfileOn,
    fileStem,
    generalTeX,
    liveTeX,
    renderPlate,
    renderPlateSubset,
    shellName,
    writeHashNow,
  } = app;
  const jsPDF = await loadJsPDF();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setProperties({
    title: pdfSafe(`${shellName()} - ${t('doc.title')}`),
    author: 'Alberto González Casarrubios',
    creator: pdfSafe(t('doc.title')),
  });
  const rawText = doc.text.bind(doc);
  doc.text = (s, ...rest) => rawText(Array.isArray(s) ? s.map(pdfSafe) : pdfSafe(s), ...rest);
  const M = 15,
    W = 210 - 2 * M;
  const lang = getLang();
  // Background: white, the shell images on the current colour, or the whole sheet
  const bgMode = $('exPdfBg').value;
  const bgHex = $('bgColor').value;
  const imgBg = bgMode === 'white' ? '#ffffff' : bgHex;
  const pageBg = bgMode === 'page' ? hexRgb(bgHex) : null;
  const pal = pdfPalette(bgMode === 'page' ? bgHex : '#ffffff');
  const dark = hexRgb(pal['--text']),
    muted = hexRgb(pal['--muted']),
    accent = hexRgb(pal['--accent']);
  const rule = hexRgb(pal['--border']);

  const header = () => {
    if (pageBg) doc.setFillColor(...pageBg).rect(0, 0, 210, 297, 'F');
    doc
      .setFont('helvetica', 'normal')
      .setFontSize(8.5)
      .setTextColor(...muted);
    doc.text(t('doc.title'), M, 11);
    doc.text(new Date().toLocaleDateString(lang), 210 - M, 11, { align: 'right' });
    doc.setDrawColor(...rule).line(M, 13, 210 - M, 13);
  };
  const footer = () => {
    doc
      .setFont('helvetica', 'normal')
      .setFontSize(7.5)
      .setTextColor(...muted);
    doc.text(t('ex.pdf.cite'), M, 284, { maxWidth: W - 30 });
    doc.text('MIT · CC BY 4.0', 210 - M, 284, { align: 'right' });
  };
  const heading = (text, y, x = M) => {
    doc
      .setFont('helvetica', 'bold')
      .setFontSize(9)
      .setTextColor(...accent);
    doc.text(text.toUpperCase(), x, y);
  };
  const rowsTable = (rows, x, y, wName, wVal) => {
    doc.setFontSize(9.5);
    for (const [name, value] of rows) {
      doc.setFont('helvetica', 'normal').setTextColor(...dark);
      doc.text(name, x, y, { maxWidth: wName });
      doc.setFont('courier', 'bold');
      doc.text(String(value), x + wName + wVal, y, { align: 'right' });
      y += 5.6;
    }
    return y;
  };

  // Page 1: shape
  header();
  doc
    .setFont('helvetica', 'bold')
    .setFontSize(17)
    .setTextColor(...dark);
  doc.text(shellName(), M, 24);
  doc
    .setFont('helvetica', 'normal')
    .setFontSize(10)
    .setTextColor(...muted);
  doc.text(
    `W = ${formatW(state.W)}   D = ${f(state.D, 3)}   T = ${f(state.T, 2)}   S = ${f(state.S, 2)}   N = ${f(state.turns, 2)}   ·   ${t(state.hand > 0 ? 'geo.dextral' : 'geo.sinistral')}`,
    M,
    30.5,
  );
  // The relief, in words, right under the parameters
  const ornText = ornamentSummary(state);
  if (ornText) {
    doc.setFontSize(9).setTextColor(...accent);
    doc.text(ornText, M, 35.3, { maxWidth: W });
  }

  const off = ornText ? 4 : 0; // room for the ornament line
  heading(t('ex.pdf.views'), 39 + off);
  const plate = renderPlate({ tile: 560, background: imgBg, labels: true });
  const plateH = (W * plate.height) / plate.width;
  doc.addImage(plate.toDataURL('image/jpeg', 0.92), 'JPEG', M, 42 + off, W, plateH);
  let y = 42 + off + plateH + 9;

  heading(t('ex.pdf.params'), y);
  const colW = 84;
  const { rc, a, b } = lastBuild.derived;
  let yL = rowsTable(
    [
      [`W · ${tParam('W').name}`, formatW(state.W)],
      [`D · ${tParam('D').name}`, f(state.D, 3)],
      [`T · ${tParam('T').name}`, f(state.T, 2)],
      [`S · ${tParam('S').name}`, f(state.S, 2)],
      [`N · ${tParam('turns').name}`, f(state.turns, 2)],
      [t('geo.hand'), t(state.hand > 0 ? 'geo.dextral' : 'geo.sinistral')],
      [t('geo.mirror'), t(state.mirror ? 'ex.yes' : 'ex.no')],
      ...ornamentRows(state),
    ],
    M,
    y + 6.5,
    colW - 24,
    24,
  );
  doc
    .setFont('helvetica', 'normal')
    .setFontSize(8.5)
    .setTextColor(...muted);
  doc.text(`${t('ex.pdf.derived')}: rc = ${f(rc, 3)}   a = ${f(a, 3)}   b = ${f(b, 3)}`, M, yL + 1.5);
  yL += 4;

  const mx = M + colW + 10,
    mw = W - colW - 10;
  heading(t('morpho.title'), y, mx);
  const mc = document.createElement('canvas');
  const mh = Math.round(mw * 0.68 * 4);
  drawMorphoOn(mc, { width: Math.round(mw * 4), height: mh, scale: 2, colors: pal });
  // drawMorphoOn works in CSS pixels: drawn at 4 px per mm with scale 2
  doc.addImage(mc.toDataURL('image/png'), 'PNG', mx, y + 3, mw, mw * 0.68);
  y = Math.max(yL, y + 3 + mw * 0.68) + 8;

  // Link that reopens this shell
  writeHashNow();
  doc
    .setFont('helvetica', 'normal')
    .setFontSize(8.5)
    .setTextColor(...muted);
  doc.text(t('ex.pdf.link'), M, y);
  doc.setTextColor(...accent);
  const url = location.href;
  const lines = doc.splitTextToSize(url, W);
  doc.textWithLink(lines[0] + (lines.length > 1 ? '...' : ''), M, y + 4.5, { url });
  footer();

  // Page 2: pigmentation (if a pattern is shown)
  if (colourShown()) {
    doc.addPage();
    header();
    doc
      .setFont('helvetica', 'bold')
      .setFontSize(17)
      .setTextColor(...dark);
    doc.text(t('ex.pdf.pattern'), M, 24);
    doc
      .setFont('helvetica', 'normal')
      .setFontSize(10)
      .setTextColor(...muted);
    const pname = PATTERN_PRESETS[pattern.preset] ? tPattern(pattern.preset) : t('pig.custom');
    doc.text(`${pname}   ·   ${t(`pig.model.${pattern.model}`)}`, M, 30.5);

    // Space–time record with its axes
    heading(t('pig.spacetime'), 39);
    const ax = M + 7; // leave room for the vertical axis
    const stW = 64,
      stH = 118,
      stY = 51;
    const st = document.createElement('canvas');
    st.width = 512;
    st.height = Math.round((512 * stH) / stW);
    st.getContext('2d').drawImage(patternCanvas, 0, 0, st.width, st.height);
    doc.addImage(st.toDataURL('image/jpeg', 0.92), 'JPEG', ax, stY, stW, stH);
    doc
      .setDrawColor(...rule)
      .setLineWidth(0.2)
      .rect(ax, stY, stW, stH);

    const arrow = (x1, y1, x2, y2) => {
      doc
        .setDrawColor(...dark)
        .setFillColor(...dark)
        .setLineWidth(0.3);
      doc.line(x1, y1, x2, y2);
      const a = Math.atan2(y2 - y1, x2 - x1),
        L = 1.8,
        s = 0.8;
      doc.triangle(
        x2,
        y2,
        x2 - L * Math.cos(a) + s * Math.sin(a),
        y2 - L * Math.sin(a) - s * Math.cos(a),
        x2 - L * Math.cos(a) - s * Math.sin(a),
        y2 - L * Math.sin(a) + s * Math.cos(a),
        'F',
      );
    };
    // Horizontal axis: position along the margin (the margin goes around the aperture)
    doc
      .setFont('helvetica', 'normal')
      .setFontSize(7.5)
      .setTextColor(...dark);
    doc.text(t('ex.pdf.axis.x'), ax + stW / 2, 44.5, { align: 'center', maxWidth: stW + 6 });
    arrow(ax + stW / 2, 47.5, ax + stW, 47.5);
    arrow(ax + stW / 2, 47.5, ax, 47.5);
    // Vertical axis: time, from the apex to the aperture
    arrow(M + 4.5, stY, M + 4.5, stY + stH);
    const tLabel = t('ex.pdf.axis.t');
    // Rotated 90° clockwise: the glyphs lie to the right of the anchor point
    doc.text(tLabel, M - 0.8, stY + stH / 2 - doc.getTextWidth(pdfSafe(tLabel)) / 2, { angle: -90 });
    doc.setFontSize(7).setTextColor(...muted);
    doc.text(t('ex.pdf.apex'), ax + stW + 1.5, stY + 2.5);
    doc.text(t('ex.pdf.aperture'), ax + stW + 1.5, stY + stH);
    // Moment of the profile, marked on the record
    const row = profileRow ?? PATTERN_ROWS - 1;
    const ry = stY + (stH * (row + 0.5)) / PATTERN_ROWS;
    doc
      .setDrawColor(...accent)
      .setLineWidth(0.5)
      .line(ax - 1, ry, ax + stW + 1, ry);
    doc.setFontSize(7.5).setTextColor(...muted);
    doc.text(t('ex.pdf.st.caption'), M, stY + stH + 5, { maxWidth: stW + 7 });

    // Pigmented shell in apertural and 3/4 views
    const sx = M + 7 + stW + 17,
      sw = W - (sx - M);
    const two = renderPlateSubset(['apertural', 'iso'], 520, imgBg);
    doc.addImage(two.toDataURL('image/jpeg', 0.92), 'JPEG', sx, 39, sw, sw / 2);

    // Margin profile: activator and inhibitor (or substrate) at that moment
    let yy = 39 + sw / 2 + 7;
    heading(t('pig.profile'), yy, sx);
    doc
      .setFont('helvetica', 'normal')
      .setFontSize(8)
      .setTextColor(...muted);
    const atLines = doc.splitTextToSize(pdfSafe(t('ex.pdf.profile.at', Math.round((100 * row) / (PATTERN_ROWS - 1)))), sw);
    doc.text(atLines, sx, yy + 4.5);
    const ph = 36,
      py = yy + 4.5 + atLines.length * 3.4;
    const pc = document.createElement('canvas');
    drawProfileOn(pc, row, getComputedStyle(document.documentElement), {
      width: Math.round(sw * 4),
      height: ph * 4,
      scale: 2,
      colors: pal,
    });
    doc.setFillColor(...hexRgb(pal['--surface-2'])).rect(sx, py, sw, ph, 'F');
    doc.addImage(pc.toDataURL('image/png'), 'PNG', sx, py, sw, ph);
    // Legend
    let lx = sx,
      ly = py + ph + 4.5;
    const legend = (label, color, dash, width) => {
      doc
        .setDrawColor(...color)
        .setLineWidth(width)
        .setLineDashPattern(dash, 0)
        .line(lx, ly - 1, lx + 6, ly - 1);
      doc.setLineDashPattern([], 0);
      doc
        .setFont('helvetica', 'normal')
        .setFontSize(7.5)
        .setTextColor(...dark);
      doc.text(label, lx + 7.5, ly);
      lx += 7.5 + doc.getTextWidth(pdfSafe(label)) + 5;
    };
    legend(t('pig.profile.a'), dark, [], 0.5);
    legend(t(pattern.model === 'AS' ? 'pig.profile.b' : 'pig.profile.h'), accent, [1.2, 0.8], 0.4);
    legend(t('pig.profile.threshold'), muted, [0.4, 0.6], 0.3);
    doc.setFontSize(7).setTextColor(...muted);
    doc.text(t('ex.pdf.profile.note'), sx, ly + 4, { maxWidth: sw });

    yy = ly + 13;
    heading(t('ex.pdf.constants'), yy, sx);
    const sym = {
      Da: 'Da',
      D2: pattern.model === 'AS' ? 'Db' : 'Dh',
      ra: 'ra',
      r2: pattern.model === 'AS' ? 'rb' : 'rh',
      kappa: 'kappa',
      ba: 'ba',
      b2: pattern.model === 'AS' ? 'bb' : 'bh',
      globalCtl: 'g',
    };
    const name = (k) => tParam(['D2', 'r2', 'b2', 'globalCtl'].includes(k) ? `${k}.${pattern.model}` : k).name;
    const rows = Object.keys(sym).map((k) => [`${sym[k]} · ${name(k)}`, sig(pattern[k])]);
    rows.push(
      [`N · ${t('ex.pdf.cells')}`, Math.round(PATTERN_CELLS / pattern.size)],
      [`T · ${tParam('pT').name}`, Math.round(pattern.T)],
      [`σ · ${tParam('pNoise').name}`, f(pattern.noise, 2)],
      [tParam('pAmount').name, f(pattern.amount, 2)],
      [t('pig.insertion'), t(pattern.insertion ? 'ex.yes' : 'ex.no')],
      [t('pig.seed'), pattern.seed],
      [t('look.patternDef'), t(state.patternDef === 2 ? 'look.defHigh' : 'look.defNormal')],
    );
    rowsTable(rows, sx, yy + 6.5, sw - 22, 22);
    footer();
  }

  // Equations page (optional): general form and with the current values
  if ($('exEq').checked) {
    doc.addPage();
    header();
    doc
      .setFont('helvetica', 'bold')
      .setFontSize(17)
      .setTextColor(...dark);
    doc.text(t('ex.pdf.eq'), M, 24);
    let y = 34;
    let MJ = null;
    try {
      MJ = await loadSvgMath();
    } catch (err) {
      console.warn(err);
    }
    if (!MJ) {
      doc
        .setFont('helvetica', 'normal')
        .setFontSize(10)
        .setTextColor(...muted);
      doc.text(t('ex.pdf.eq.fail'), M, y, { maxWidth: W });
    } else {
      const blocks = [[t('ex.pdf.eq.raup'), 'raup', t('ex.pdf.eq.noteRaup')]];
      if (colourShown()) blocks.push([t('ex.pdf.eq.mein'), 'meinhardt', t('eq.mein.note')]);
      const EX_MM = 1.7;
      const newPageIfNeeded = (h) => {
        if (y + h <= 278) return;
        footer();
        doc.addPage();
        header();
        y = 22;
      };
      for (const [title, view, note] of blocks) {
        newPageIfNeeded(20);
        heading(title, y);
        y += 6;
        for (const [sub, tex] of [
          [t('eq.general'), generalTeX(view)],
          [t('eq.live'), liveTeX(view)],
        ]) {
          newPageIfNeeded(14);
          doc
            .setFont('helvetica', 'bold')
            .setFontSize(9)
            .setTextColor(...dark);
          doc.text(sub, M, y);
          y += 3;
          for (const piece of displayPieces(tex)) {
            const img = await texToImage(MJ, piece, EX_MM * 12, pal['--text']);
            let w = img.wEx * EX_MM,
              h = img.hEx * EX_MM;
            if (w > W - 6) {
              h *= (W - 6) / w;
              w = W - 6;
            }
            newPageIfNeeded(h + 2);
            doc.addImage(img.url, 'PNG', M + 4, y, w, h);
            y += h + 2.5;
          }
          y += 3;
        }
        doc
          .setFont('helvetica', 'normal')
          .setFontSize(8)
          .setTextColor(...muted);
        const lines = doc.splitTextToSize(pdfSafe(note), W);
        newPageIfNeeded(lines.length * 3.6);
        doc.text(lines, M, y);
        y += lines.length * 3.6 + 9;
      }
    }
    footer();
  }

  doc.save(`${fileStem()}.pdf`);
}

/** Splits a TeX block with several \[ … \] displays into its pieces. */
function displayPieces(tex) {
  return [...tex.matchAll(/\\\[([\s\S]*?)\\\]/g)].map((m) => m[1].trim());
}

// MathJax with SVG output in a separate iframe (the page uses CHTML output, which
// cannot be turned into an image); loaded only when exporting the equations
let svgMathPromise = null;
function loadSvgMath() {
  svgMathPromise ??= new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;left:-9999px;width:10px;height:10px;border:0;visibility:hidden';
    frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><script>window.MathJax={svg:{fontCache:'none'},startup:{typeset:false}};</script><script src="https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg.js"></script></head><body></body></html>`;
    const t0 = performance.now();
    const wait = () => {
      const MJ = frame.contentWindow?.MathJax;
      if (MJ?.startup?.promise && MJ.tex2svgPromise) MJ.startup.promise.then(() => resolve(MJ), reject);
      else if (performance.now() - t0 > 20000) reject(new Error('MathJax SVG'));
      else setTimeout(wait, 100);
    };
    frame.onload = wait;
    document.body.append(frame);
  }).catch((err) => {
    svgMathPromise = null;
    throw err;
  });
  return svgMathPromise;
}

/** Typesets a formula as SVG and rasterises it to PNG. Also returns its size in ex. */
async function texToImage(MJ, tex, exPx, ink = '#1c2430') {
  const node = await MJ.tex2svgPromise(tex, { display: true });
  const svg = node.querySelector('svg');
  const wEx = parseFloat(svg.getAttribute('width'));
  const hEx = parseFloat(svg.getAttribute('height'));
  svg.setAttribute('width', `${wEx * exPx}px`);
  svg.setAttribute('height', `${hEx * exPx}px`);
  svg.setAttribute('style', `color:${ink}`);
  if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const xml = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = Math.ceil(wEx * exPx);
  c.height = Math.ceil(hEx * exPx);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return { url: c.toDataURL('image/png'), wEx, hEx };
}
