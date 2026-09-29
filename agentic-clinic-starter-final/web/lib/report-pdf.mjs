import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ink = rgb(0.10, 0.18, 0.23);
const muted = rgb(0.34, 0.43, 0.48);
const blue = rgb(0.12, 0.38, 0.52);
const pale = rgb(0.91, 0.95, 0.97);
const margin = 42;
const pageSize = [595.28, 841.89];

function lines(value, font, size, width) {
  const words = String(value ?? '').split(/\s+/);
  const result = [];
  let line = '';
  for (const word of words) {
    if (font.widthOfTextAtSize(line ? `${line} ${word}` : word, size) <= width) {
      line = line ? `${line} ${word}` : word;
      continue;
    }
    if (line) result.push(line);
    line = '';
    for (const character of word) {
      if (font.widthOfTextAtSize(line + character, size) > width && line) {
        result.push(line);
        line = '';
      }
      line += character;
    }
  }
  if (line) result.push(line);
  return result.length ? result : [''];
}

export async function createReportPdf(report) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fontBytes = await readFile(join(process.cwd(), 'assets', 'fonts', 'ClinicSansSC-Regular.ttf'));
  const regular = await pdf.embedFont(fontBytes, { subset: false });
  const ascii = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const supported = new Set(regular.getCharacterSet());
  const values = [report.staff.name, ...report.sessions.flatMap((session) => [session.clientName, session.locationName])];
  for (const value of values) {
    for (const character of String(value ?? '')) {
      if (!supported.has(character.codePointAt(0))) throw new Error(`The PDF font cannot display U+${character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')} in this report.`);
    }
  }
  const pages = [];
  let page;
  let y;
  const columns = [42, 116, 176, 338, 406];
  const widths = [68, 54, 156, 62, 147];

  function newPage() {
    page = pdf.addPage(pageSize);
    pages.push(page);
    const height = page.getHeight();
    page.drawRectangle({ x: 0, y: height - 92, width: page.getWidth(), height: 92, color: pale });
    page.drawText('STILLWELL  /  STAFF SCHEDULE', { x: margin, y: height - 38, size: 10, font: bold, color: blue });
    page.drawText(report.staff.name, { x: margin, y: height - 67, size: 19, font: regular, color: ink });
    page.drawText(`  -  ${report.month}`, { x: margin + regular.widthOfTextAtSize(report.staff.name, 19), y: height - 67, size: 19, font: ascii, color: ink });
    y = height - 113;
    page.drawText('Committed sessions only', { x: margin, y, size: 9, font: ascii, color: muted });
    y -= 30;
    for (const [index, label] of ['Date', 'Time', 'Client', 'Duration', 'Location'].entries()) {
      page.drawText(label, { x: columns[index], y, size: 9, font: bold, color: muted });
    }
    y -= 12;
    page.drawLine({ start: { x: margin, y }, end: { x: page.getWidth() - margin, y }, thickness: 1, color: pale });
    y -= 18;
  }

  newPage();
  if (!report.sessions.length) {
    page.drawText('No committed sessions for this month.', { x: margin, y, size: 11, font: ascii, color: ink });
    y -= 32;
  }
  for (const session of report.sessions) {
    const values = [session.date, session.time, session.clientName, `${session.minutes} min`, session.locationName];
    const fonts = [ascii, ascii, regular, ascii, regular];
    const cells = values.map((value, index) => lines(value, fonts[index], 9, widths[index]));
    const height = Math.max(26, Math.max(...cells.map((cell) => cell.length)) * 13 + 11);
    if (y - height < 77) newPage();
    cells.forEach((cell, index) => cell.forEach((line, lineIndex) => {
      page.drawText(line, { x: columns[index], y: y - lineIndex * 13, size: 9, font: fonts[index], color: ink });
    }));
    y -= height;
    page.drawLine({ start: { x: margin, y: y + 7 }, end: { x: page.getWidth() - margin, y: y + 7 }, thickness: 0.5, color: pale });
  }
  if (y < 105) newPage();
  page.drawText(`Total: ${report.totalMinutes} minutes`, { x: margin, y: y - 13, size: 12, font: bold, color: ink });
  pages.forEach((item, index) => {
    item.drawText(`Page ${index + 1} of ${pages.length}`, { x: margin, y: 36, size: 9, font: ascii, color: muted });
    item.drawText(`Schedule revision ${report.revision}`, { x: 397, y: 36, size: 9, font: ascii, color: muted });
  });
  return pdf.save();
}
