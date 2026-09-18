import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import { shapeArabicForPdf } from './arabic-pdf-text.util';

const ARABIC_FONT_REGULAR_PATH = join(
  process.cwd(),
  'assets',
  'fonts',
  'Tajawal-Regular.ttf',
);
const ARABIC_FONT_BOLD_PATH = join(
  process.cwd(),
  'assets',
  'fonts',
  'Tajawal-Bold.ttf',
);

export const PAGE_WIDTH = 515;
export const PAGE_LEFT = 40;
export const ROW_HEIGHT = 22;
export const PAGE_BOTTOM = 780;

export function createArabicPdfDocument(): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  doc.registerFont('arabic', ARABIC_FONT_REGULAR_PATH);
  doc.registerFont('arabic-bold', ARABIC_FONT_BOLD_PATH);
  doc.font('arabic');
  return doc;
}

export async function renderPdfDocumentToBuffer(
  build: (doc: PDFKit.PDFDocument) => void,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = createArabicPdfDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    build(doc);

    doc.end();
  });
}

export function drawRtlTable(
  doc: PDFKit.PDFDocument,
  headersLtr: string[],
  rowsLtr: string[][],
  columnWidthsLtr: number[],
) {
  // الأعمدة تصل بترتيبها المنطقي (يمين لليسار)؛ نعكسها هنا لأن الرسم يتم بإحداثيات x تتزايد يساراً،
  // فيصبح أول عمود منطقي هو الأقصى يميناً كما يُقرأ بالعربية.
  const headers = [...headersLtr].reverse();
  const rows = rowsLtr.map((row) => [...row].reverse());
  const columnWidths = [...columnWidthsLtr].reverse();

  const drawHeaderRow = () => {
    let x = PAGE_LEFT;
    const y = doc.y;

    doc.font('arabic-bold');
    for (let i = 0; i < headers.length; i += 1) {
      const width = columnWidths[i];
      doc.rect(x, y, width, ROW_HEIGHT).fillAndStroke('#eef3f1', '#c7d2ce');
      doc
        .fillColor('#0f2f28')
        .text(shapeArabicForPdf(headers[i]), x + 6, y + 6, {
          width: width - 12,
          align: 'right',
        });
      x += width;
    }
    doc.font('arabic');
    doc.y = y + ROW_HEIGHT;
  };

  drawHeaderRow();

  for (const row of rows) {
    if (doc.y + ROW_HEIGHT > PAGE_BOTTOM) {
      doc.addPage();
      drawHeaderRow();
    }

    let x = PAGE_LEFT;
    const y = doc.y;

    for (let i = 0; i < row.length; i += 1) {
      const width = columnWidths[i];
      doc.rect(x, y, width, ROW_HEIGHT).stroke('#e2e8e6');
      doc.fillColor('#1c2b27').text(shapeArabicForPdf(row[i]), x + 6, y + 6, {
        width: width - 12,
        align: 'right',
      });
      x += width;
    }

    doc.y = y + ROW_HEIGHT;
  }

  doc.moveDown();
}

export function formatDateArabic(
  iso: string | Date | null | undefined,
): string {
  if (!iso) {
    return '';
  }

  return new Intl.DateTimeFormat('ar-IQ', {
    dateStyle: 'medium',
    timeStyle: 'short',
    // نفرض الأرقام اللاتينية لأن خط Tajawal المضمّن بالـPDF لا يضمّن أشكال الأرقام الهندية العربية.
    numberingSystem: 'latn',
  }).format(new Date(iso));
}

export function writeReportHeader(
  doc: PDFKit.PDFDocument,
  title: string,
  generatedAt: string,
  summaryLines: string[],
) {
  doc.fontSize(16).text(shapeArabicForPdf(title), PAGE_LEFT, 40, {
    width: PAGE_WIDTH,
    align: 'center',
  });

  doc.moveDown();
  doc.fontSize(10);
  doc.text(
    shapeArabicForPdf(`تاريخ إصدار التقرير: ${formatDateArabic(generatedAt)}`),
    PAGE_LEFT,
    doc.y,
    { width: PAGE_WIDTH, align: 'right' },
  );

  for (const line of summaryLines) {
    doc.text(shapeArabicForPdf(line), PAGE_LEFT, doc.y, {
      width: PAGE_WIDTH,
      align: 'right',
    });
  }

  doc.moveDown();
}
