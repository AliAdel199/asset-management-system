import { Workbook } from 'exceljs';
import { shapeArabicForPdf } from '../common/arabic-pdf-text.util';
import {
  drawRtlTable,
  renderPdfDocumentToBuffer,
  writeReportHeader,
} from '../common/pdf-report.util';
import type { WriteOffReportResult } from './write-off-report.service';

export async function buildWriteOffExcelBuffer(
  report: WriteOffReportResult,
): Promise<Buffer> {
  const workbook = new Workbook();
  workbook.creator = 'نظام إدارة الموجودات';
  workbook.created = new Date(report.generatedAt);

  const sheet = workbook.addWorksheet('تقرير الشطب', {
    views: [{ rightToLeft: true }],
  });

  sheet.columns = [
    { header: 'الموجود', key: 'asset', width: 18 },
    { header: 'الجهة', key: 'organizationUnit', width: 22 },
    { header: 'رقم المستند', key: 'documentNumber', width: 16 },
    { header: 'السبب', key: 'reason', width: 30 },
    { header: 'الحالة', key: 'status', width: 16 },
    { header: 'تاريخ الطلب', key: 'requestedAt', width: 18 },
    { header: 'تاريخ القرار', key: 'decidedAt', width: 18 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { horizontal: 'right' };

  for (const request of report.requests) {
    sheet.addRow({
      asset: request.assetInternalNumber,
      organizationUnit: request.organizationUnitName,
      documentNumber: request.documentNumber,
      reason: request.reason,
      status: request.status,
      requestedAt: request.requestedAt,
      decidedAt: request.decidedAt ?? '',
    });
  }

  sheet.eachRow((row) => {
    row.alignment = { horizontal: 'right', ...row.alignment };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildWriteOffPdfBuffer(
  report: WriteOffReportResult,
): Promise<Buffer> {
  return renderPdfDocumentToBuffer((doc) => {
    writeReportHeader(doc, 'تقرير الشطب', report.generatedAt, [
      `إجمالي عدد طلبات الشطب: ${report.totalCount}`,
    ]);

    doc.fontSize(12);
    doc.text(shapeArabicForPdf('حسب الحالة'), 40, doc.y, {
      width: 515,
      align: 'right',
    });
    doc.fontSize(10);
    doc.moveDown(0.5);
    drawRtlTable(
      doc,
      ['الحالة', 'العدد'],
      report.byStatus.map((bucket) => [bucket.name, String(bucket.count)]),
      [340, 175],
    );

    doc.fontSize(12);
    doc.text(shapeArabicForPdf('تفاصيل الطلبات'), 40, doc.y, {
      width: 515,
      align: 'right',
    });
    doc.fontSize(10);
    doc.moveDown(0.5);
    drawRtlTable(
      doc,
      ['الموجود', 'رقم المستند', 'السبب', 'الحالة'],
      report.requests.map((request) => [
        request.assetInternalNumber,
        request.documentNumber,
        request.reason,
        request.status,
      ]),
      [95, 110, 200, 110],
    );
  });
}
