import { createReportPdf } from './report-pdf.mjs';

export async function reportPdfResponse(clinic, staff, month) {
  const report = await clinic.report(staff, month);
  const pdf = await createReportPdf(report);
  return new Response(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="staff-schedule-${month}.pdf"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
