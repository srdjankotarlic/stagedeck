import * as pdfjs from '../node_modules/pdfjs-dist/build/pdf.mjs';

const params = new URLSearchParams(location.search);
document.documentElement.lang = params.get('language') === 'sr' ? 'sr-Latn' : 'en';
pdfjs.GlobalWorkerOptions.workerSrc = new URL('../node_modules/pdfjs-dist/build/pdf.worker.mjs', location.href).href;

const canvas = document.getElementById('page');
let doc;
let pageNumber = 1;
let rendering = false;
let pending = false;
let failed = false;

async function render() {
  if (!doc || failed) return;
  if (rendering) {
    pending = true;
    return;
  }
  rendering = true;
  const target = pageNumber;
  try {
    const page = await doc.getPage(target);
    const raw = page.getViewport({scale: 1});
    const scale = Math.min(innerWidth / raw.width, innerHeight / raw.height) * devicePixelRatio;
    const viewport = page.getViewport({scale});
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = viewport.width / devicePixelRatio + 'px';
    canvas.style.height = viewport.height / devicePixelRatio + 'px';
    await page.render({canvasContext: canvas.getContext('2d'), viewport}).promise;
    if (target === pageNumber) window.stage.pdfPosition(target, doc.numPages);
  } catch (error) {
    failed = true;
    window.stage.pdfFailed(error.message);
  } finally {
    rendering = false;
    if (pending) {
      pending = false;
      render();
    }
  }
}

window.stage.onPdfCommand(command => {
  if (!doc) return;
  if (command === 'next') pageNumber = Math.min(doc.numPages, pageNumber + 1);
  if (command === 'previous') pageNumber = Math.max(1, pageNumber - 1);
  render();
});
document.addEventListener('keydown', event => {
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) {
    event.preventDefault();
    window.stage.command('next');
  }
  if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) {
    event.preventDefault();
    window.stage.command('previous');
  }
  if (event.key === 'Escape') window.stage.command('stop');
});
document.addEventListener('click', () => window.stage.command('next'));
addEventListener('resize', render);

try {
  const data = new Uint8Array(await window.stage.readPdf(params.get('id')));
  doc = await pdfjs.getDocument({data, isEvalSupported: false}).promise;
  await render();
} catch (error) {
  window.stage.pdfFailed(error.message);
}
