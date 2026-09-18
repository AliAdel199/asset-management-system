import { join } from 'node:path';
import { Workbook } from 'exceljs';
import PDFDocument from 'pdfkit';
import { shapeArabicForPdf } from '../common/arabic-pdf-text.util';

type CountBucket = {
  id: string;
  name: string;
  count: number;
  bookValue: number;
};

type CategorySummary = {
  id: string;
  code?: string;
  name: string;
  count: number;
  bookValue: number;
  types: CountBucket[];
  statuses: CountBucket[];
};

export type InventorySummaryResult = {
  generatedAt: string;
  totalCount: number;
  totalBookValue: number;
  categories: CategorySummary[];
};

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

export async function buildInventoryExcelBuffer(
  summary: InventorySummaryResult,
): Promise<Buffer> {
  const workbook = new Workbook();
  workbook.creator = 'نظام إدارة الموجودات';
  workbook.created = new Date(summary.generatedAt);

  const sheet = workbook.addWorksheet('كشف الجرد', {
    views: [{ rightToLeft: true }],
  });

  sheet.columns = [
    { header: 'التصنيف', key: 'category', width: 26 },
    { header: 'التبويب', key: 'group', width: 16 },
    { header: 'الاسم', key: 'name', width: 26 },
    { header: 'العدد', key: 'count', width: 12 },
    { header: 'القيمة الدفترية', key: 'bookValue', width: 18 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { horizontal: 'right' };

  sheet.addRow({
    category: 'الإجمالي',
    group: 'الإجمالي',
    name: 'كل الموجودات',
    count: summary.totalCount,
    bookValue: summary.totalBookValue,
  }).font = { bold: true };

  for (const category of summary.categories) {
    for (const type of category.types) {
      sheet.addRow({
        category: category.name,
        group: 'نوع المادة',
        name: type.name,
        count: type.count,
        bookValue: type.bookValue,
      });
    }

    for (const status of category.statuses) {
      sheet.addRow({
        category: category.name,
        group: 'الحالة',
        name: status.name,
        count: status.count,
        bookValue: status.bookValue,
      });
    }
  }

  sheet.eachRow((row) => {
    row.alignment = { horizontal: 'right', ...row.alignment };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

const PAGE_WIDTH = 515;
const PAGE_LEFT = 40;
const ROW_HEIGHT = 22;
const PAGE_BOTTOM = 780;

function drawRtlTable(
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
      doc
        .rect(x, y, width, ROW_HEIGHT)
        .fillAndStroke('#eef3f1', '#c7d2ce');
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
      doc
        .fillColor('#1c2b27')
        .text(shapeArabicForPdf(row[i]), x + 6, y + 6, {
          width: width - 12,
          align: 'right',
        });
      x += width;
    }

    doc.y = y + ROW_HEIGHT;
  }

  doc.moveDown();
}

function formatDateArabic(iso: string): string {
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

export async function buildInventoryPdfBuffer(
  summary: InventorySummaryResult,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('arabic', ARABIC_FONT_REGULAR_PATH);
    doc.registerFont('arabic-bold', ARABIC_FONT_BOLD_PATH);
    doc.font('arabic');

    doc
      .fontSize(16)
      .text(shapeArabicForPdf('كشف الجرد حسب التصنيف والنوع'), PAGE_LEFT, 40, {
        width: PAGE_WIDTH,
        align: 'center',
      });

    doc.moveDown();
    doc.fontSize(10);
    doc.text(
      shapeArabicForPdf(`تاريخ إصدار الكشف: ${formatDateArabic(summary.generatedAt)}`),
      PAGE_LEFT,
      doc.y,
      { width: PAGE_WIDTH, align: 'right' },
    );
    doc.text(
      shapeArabicForPdf(`إجمالي عدد الموجودات: ${summary.totalCount}`),
      PAGE_LEFT,
      doc.y,
      { width: PAGE_WIDTH, align: 'right' },
    );
    doc.text(
      shapeArabicForPdf(`إجمالي القيمة الدفترية: ${summary.totalBookValue}`),
      PAGE_LEFT,
      doc.y,
      { width: PAGE_WIDTH, align: 'right' },
    );

    doc.moveDown();

    for (const category of summary.categories) {
      if (doc.y + ROW_HEIGHT * 2 > PAGE_BOTTOM) {
        doc.addPage();
      }

      doc.fontSize(13);
      doc.text(
        shapeArabicForPdf(`${category.name} (${category.code ?? ''})`),
        PAGE_LEFT,
        doc.y,
        { width: PAGE_WIDTH, align: 'right' },
      );
      doc.fontSize(10);
      doc.moveDown(0.5);

      if (category.types.length > 0) {
        drawRtlTable(
          doc,
          ['نوع المادة', 'العدد', 'القيمة الدفترية'],
          category.types.map((type) => [
            type.name,
            String(type.count),
            String(type.bookValue),
          ]),
          [255, 130, 130],
        );
      }

      if (category.statuses.length > 0) {
        drawRtlTable(
          doc,
          ['الحالة', 'العدد', 'القيمة الدفترية'],
          category.statuses.map((status) => [
            status.name,
            String(status.count),
            String(status.bookValue),
          ]),
          [255, 130, 130],
        );
      }
    }

    doc.end();
  });
}
