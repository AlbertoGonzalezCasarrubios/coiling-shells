// Libraries loaded with <script> tags, for the type check (npm run typecheck).
// The app uses only a few of their functions, so they are not typed in detail.
interface Window {
  /** MathJax 3 (tex-chtml in the page, tex-svg in the PDF frame) */
  MathJax: any;
  /** jsPDF, loaded on demand to make the PDF sheet */
  jspdf: any;
}
