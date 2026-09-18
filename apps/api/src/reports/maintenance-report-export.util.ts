import { Workbook } from 'exceljs';
import { shapeArabicForPdf } from '../common/arabic-pdf-text.util';
import {
  drawRtlTable,
  renderPdfDocumentToBuffer,
  writeReportHeader,
} from '../common/pdf-report.util';
import type { MaintenanceReportResult } from './maintenance-report.service';

export async function buildMaintenanceExcelBuffer(
  report: MaintenanceReportResult,
): Promise<Buffer> {
  const workbook = new Workbook();
  workbook.creator = 'نظام إدارة الموجودات';
  workbook.created = new Date(report.generatedAt);

  const sheet = workbook.addWorksheet('تقرير الصيانة', {
    views: [{ rightToLeft: true }],
  });

  sheet.columns = [
    { header: 'رقم الطلب', key: 'requestNumber', width: 18 },
    { header: 'الموجود', key: 'asset', width: 18 },
    { header: 'الجهة', key: 'organizationUnit', width: 22 },
    { header: 'نوع الصيانة', key: 'type', width: 20 },
    { header: 'الحالة', key: 'status', width: 14 },
    { header: 'التكلفة', key: 'cost', width: 14 },
    { header: 'تاريخ الطلب', key: 'requestedAt', width: 18 },
    { header: 'تاريخ الإكمال', key: 'performedAt', width: 18 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { horizontal: 'right' };

  for (const request of report.requests) {
    sheet.addRow({
      requestNumber: request.requestNumber,
      asset: request.assetInternalNumber,
      organizationUnit: request.organizationUnitName,
      type: request.maintenanceTypeName,
      status: request.status,
      cost: request.cost,
      requestedAt: request.requestedAt,
      performedAt: request.performedAt ?? '',
    });
  }

  sheet.eachRow((row) => {
    row.alignment = { horizontal: 'right', ...row.alignment };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildMaintenancePdfBuffer(
  report: MaintenanceReportResult,
): Promise<Buffer> {
  return renderPdfDocumentToBuffer((doc) => {
    writeReportHeader(doc, 'تقرير الصيانة', report.generatedAt, [
      `إجمالي عدد طلبات الصيانة: ${report.totalCount}`,
      `إجمالي التكلفة: ${report.totalCost}`,
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
      ['الحالة', 'العدد', 'التكلفة'],
      report.byStatus.map((bucket) => [
        bucket.name,
        String(bucket.count),
        String(bucket.cost),
      ]),
      [255, 130, 130],
    );

    doc.fontSize(12);
    doc.text(shapeArabicForPdf('حسب نوع الصيانة'), 40, doc.y, {
      width: 515,
      align: 'right',
    });
    doc.fontSize(10);
    doc.moveDown(0.5);
    drawRtlTable(
      doc,
      ['نوع الصيانة', 'العدد', 'التكلفة'],
      report.byMaintenanceType.map((bucket) => [
        bucket.name,
        String(bucket.count),
        String(bucket.cost),
      ]),
      [255, 130, 130],
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
      ['رقم الطلب', 'الموجود', 'النوع', 'الحالة', 'التكلفة'],
      report.requests.map((request) => [
        request.requestNumber,
        request.assetInternalNumber,
        request.maintenanceTypeName,
        request.status,
        String(request.cost),
      ]),
      [110, 100, 105, 90, 110],
    );
  });
}
