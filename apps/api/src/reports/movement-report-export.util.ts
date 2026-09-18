import { Workbook } from 'exceljs';
import { shapeArabicForPdf } from '../common/arabic-pdf-text.util';
import {
  drawRtlTable,
  renderPdfDocumentToBuffer,
  writeReportHeader,
} from '../common/pdf-report.util';
import type { MovementReportResult } from './movement-report.service';

export async function buildMovementExcelBuffer(
  report: MovementReportResult,
): Promise<Buffer> {
  const workbook = new Workbook();
  workbook.creator = 'نظام إدارة الموجودات';
  workbook.created = new Date(report.generatedAt);

  const sheet = workbook.addWorksheet('تقرير النقل والتسليم', {
    views: [{ rightToLeft: true }],
  });

  sheet.columns = [
    { header: 'نوع الحركة', key: 'movementType', width: 16 },
    { header: 'الموجود', key: 'asset', width: 18 },
    { header: 'من جهة', key: 'fromOrganizationUnit', width: 20 },
    { header: 'إلى جهة', key: 'toOrganizationUnit', width: 20 },
    { header: 'من موظف', key: 'fromEmployee', width: 18 },
    { header: 'إلى موظف', key: 'toEmployee', width: 18 },
    { header: 'رقم المستند', key: 'documentNumber', width: 16 },
    { header: 'التاريخ', key: 'createdAt', width: 18 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { horizontal: 'right' };

  for (const movement of report.movements) {
    sheet.addRow({
      movementType: movement.movementType,
      asset: movement.assetInternalNumber,
      fromOrganizationUnit: movement.fromOrganizationUnitName ?? '',
      toOrganizationUnit: movement.toOrganizationUnitName ?? '',
      fromEmployee: movement.fromEmployeeName ?? '',
      toEmployee: movement.toEmployeeName ?? '',
      documentNumber: movement.documentNumber ?? '',
      createdAt: movement.createdAt,
    });
  }

  sheet.eachRow((row) => {
    row.alignment = { horizontal: 'right', ...row.alignment };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildMovementPdfBuffer(
  report: MovementReportResult,
): Promise<Buffer> {
  return renderPdfDocumentToBuffer((doc) => {
    writeReportHeader(doc, 'تقرير النقل والتسليم', report.generatedAt, [
      `إجمالي عدد الحركات: ${report.totalCount}`,
    ]);

    doc.fontSize(12);
    doc.text(shapeArabicForPdf('حسب نوع الحركة'), 40, doc.y, {
      width: 515,
      align: 'right',
    });
    doc.fontSize(10);
    doc.moveDown(0.5);
    drawRtlTable(
      doc,
      ['نوع الحركة', 'العدد'],
      report.byMovementType.map((bucket) => [
        bucket.name,
        String(bucket.count),
      ]),
      [340, 175],
    );

    doc.fontSize(12);
    doc.text(shapeArabicForPdf('تفاصيل الحركات'), 40, doc.y, {
      width: 515,
      align: 'right',
    });
    doc.fontSize(10);
    doc.moveDown(0.5);
    drawRtlTable(
      doc,
      ['الموجود', 'النوع', 'من', 'إلى', 'رقم المستند'],
      report.movements.map((movement) => [
        movement.assetInternalNumber,
        movement.movementType,
        movement.fromOrganizationUnitName ?? movement.fromEmployeeName ?? '-',
        movement.toOrganizationUnitName ?? movement.toEmployeeName ?? '-',
        movement.documentNumber ?? '-',
      ]),
      [95, 100, 110, 110, 100],
    );
  });
}
