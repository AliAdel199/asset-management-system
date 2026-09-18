import { Workbook } from 'exceljs';
import { shapeArabicForPdf } from '../common/arabic-pdf-text.util';
import {
  drawRtlTable,
  formatDateArabic,
  PAGE_BOTTOM,
  PAGE_LEFT,
  PAGE_WIDTH,
  renderPdfDocumentToBuffer,
  ROW_HEIGHT,
} from '../common/pdf-report.util';

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

export async function buildInventoryPdfBuffer(
  summary: InventorySummaryResult,
): Promise<Buffer> {
  return renderPdfDocumentToBuffer((doc) => {
    doc
      .fontSize(16)
      .text(shapeArabicForPdf('كشف الجرد حسب التصنيف والنوع'), PAGE_LEFT, 40, {
        width: PAGE_WIDTH,
        align: 'center',
      });

    doc.moveDown();
    doc.fontSize(10);
    doc.text(
      shapeArabicForPdf(
        `تاريخ إصدار الكشف: ${formatDateArabic(summary.generatedAt)}`,
      ),
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
  });
}
