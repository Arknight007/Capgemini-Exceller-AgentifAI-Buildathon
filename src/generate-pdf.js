const data = $input.first().json;

function buildNarrativePdf(data) {
  var NL = String.fromCharCode(10);
  var BS = String.fromCharCode(92);
  var SCENES = data.scene_suggestions || '';
  var CONT = data.continuity_report || '';
  var BIBLE = data.updated_story_bible || '';
  var SESSION = data.session_id || '';
  var pageW = 595.28, pageH = 841.89, margin = 50;
  var topY = pageH - margin, bottomY = margin + 6;

  function ascii(s) {
    s = String(s);
    s = s.split(String.fromCharCode(0x2014)).join('-').split(String.fromCharCode(0x2013)).join('-');
    s = s.split(String.fromCharCode(0x2018)).join("'").split(String.fromCharCode(0x2019)).join("'");
    s = s.split(String.fromCharCode(0x201c)).join('"').split(String.fromCharCode(0x201d)).join('"');
    s = s.split(String.fromCharCode(0x2022)).join('-').split(String.fromCharCode(0x2026)).join('...');
    s = s.split(String.fromCharCode(0x00a0)).join(' ');
    var out = '';
    for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); if (c >= 32 && c <= 126) out += s.charAt(i); }
    return out;
  }
  function esc(s) {
    s = ascii(s); var out = '';
    for (var i = 0; i < s.length; i++) { var ch = s.charAt(i); if (ch === '(' || ch === ')' || ch === BS) out += BS + ch; else out += ch; }
    return out;
  }
  var lines = [];
  function wrap(text, font, size, indent) {
    var usable = (pageW - 2 * margin) - (indent || 0);
    var maxChars = Math.max(10, Math.floor(usable / (size * 0.52)));
    var words = ascii(text).split(' ');
    var cur = '';
    for (var i = 0; i < words.length; i++) {
      var w = words[i]; if (!w) continue;
      if (!cur) cur = w;
      else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
      else { lines.push({ text: cur, font: font, size: size, indent: indent || 0 }); cur = w; }
    }
    if (cur) lines.push({ text: cur, font: font, size: size, indent: indent || 0 });
  }
  function gap(h) { lines.push({ gap: h }); }
  function strip(s) { return s.split('**').join(''); }
  function renderMarkdown(block) {
    var arr = String(block).split(NL);
    for (var i = 0; i < arr.length; i++) {
      var line = arr[i].replace(/[ ]+$/, '');
      if (!line) { gap(5); continue; }
      if (line.indexOf('## ') === 0) { gap(4); wrap(strip(line.substring(3)), 'F2', 13, 0); gap(2); continue; }
      if (line.indexOf('**') === 0 && line.lastIndexOf('**') === line.length - 2 && line.indexOf('- ') === -1) { gap(3); wrap(strip(line), 'F2', 11, 0); continue; }
      if (line.indexOf('**') === 0) { gap(3); wrap(strip(line), 'F2', 10.5, 0); continue; }
      if (line.indexOf('- ') === 0) { wrap('- ' + strip(line.substring(2)), 'F1', 9.5, 12); continue; }
      wrap(strip(line), 'F1', 9.5, 0);
    }
  }
  lines.push({ text: 'NarrativeAI', font: 'F2', size: 11, indent: 0 });
  lines.push({ text: 'Story Production Report', font: 'F2', size: 20, indent: 0 });
  gap(3);
  lines.push({ text: 'Pipeline: Scene Planner > Continuity Guard > Story Bible', font: 'F1', size: 9, indent: 0 });
  if (SESSION) lines.push({ text: 'Session: ' + SESSION, font: 'F1', size: 9, indent: 0 });
  gap(10);
  lines.push({ text: '1.  Scene Suggestions', font: 'F2', size: 13, indent: 0 }); gap(4);
  renderMarkdown(SCENES); gap(8);
  lines.push({ text: '2.  Continuity Validation', font: 'F2', size: 13, indent: 0 }); gap(4);
  renderMarkdown(CONT); gap(8);
  lines.push({ text: '3.  Updated Story Bible', font: 'F2', size: 13, indent: 0 }); gap(4);
  renderMarkdown(BIBLE);
  var pages = [], ops = [], y = topY;
  function flush() { pages.push(ops.join(NL)); ops = []; y = topY; }
  for (var i = 0; i < lines.length; i++) {
    var ln = lines[i];
    if (ln.gap !== undefined) { y -= ln.gap; if (y < bottomY) flush(); continue; }
    var leading = ln.size * 1.45;
    if (y - leading < bottomY) flush();
    var x = (margin + (ln.indent || 0)).toFixed(2);
    var baseline = (y - ln.size).toFixed(2);
    ops.push('BT /' + ln.font + ' ' + ln.size + ' Tf 1 0 0 1 ' + x + ' ' + baseline + ' Tm (' + esc(ln.text) + ') Tj ET');
    y -= leading;
  }
  if (ops.length) flush();
  if (pages.length === 0) pages.push('');
  var nPages = pages.length;
  var catalog = 1, pagesObj = 2, fReg = 3, fBold = 4, contentStart = 5, pageStart = 5 + nPages;
  var kids = [];
  for (var i = 0; i < nPages; i++) kids.push((pageStart + i) + ' 0 R');
  var objects = [];
  objects[catalog] = '<< /Type /Catalog /Pages ' + pagesObj + ' 0 R >>';
  objects[pagesObj] = '<< /Type /Pages /Count ' + nPages + ' /Kids [' + kids.join(' ') + '] >>';
  objects[fReg] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[fBold] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  for (var i = 0; i < nPages; i++) {
    var stream = pages[i];
    var len = Buffer.byteLength(stream, 'latin1');
    objects[contentStart + i] = '<< /Length ' + len + ' >>' + NL + 'stream' + NL + stream + NL + 'endstream';
    objects[pageStart + i] = '<< /Type /Page /Parent ' + pagesObj + ' 0 R /MediaBox [0 0 ' + pageW.toFixed(2) + ' ' + pageH.toFixed(2) + '] /Resources << /Font << /F1 ' + fReg + ' 0 R /F2 ' + fBold + ' 0 R >> >> /Contents ' + (contentStart + i) + ' 0 R >>';
  }
  var total = 4 + 2 * nPages;
  var header = '%PDF-1.4' + NL;
  var body = '', offsets = [];
  for (var n = 1; n <= total; n++) {
    offsets[n] = header.length + Buffer.byteLength(body, 'latin1');
    body += n + ' 0 obj' + NL + objects[n] + NL + 'endobj' + NL;
  }
  var xrefPos = header.length + Buffer.byteLength(body, 'latin1');
  var xref = 'xref' + NL + '0 ' + (total + 1) + NL + '0000000000 65535 f ' + NL;
  for (var n = 1; n <= total; n++) xref += String(offsets[n]).padStart(10, '0') + ' 00000 n ' + NL;
  var trailer = 'trailer' + NL + '<< /Size ' + (total + 1) + ' /Root ' + catalog + ' 0 R >>' + NL + 'startxref' + NL + xrefPos + NL + '%%EOF';
  return header + body + xref + trailer;
}

const fileName = 'NarrativeAI_Story_Production_Report.pdf';
const pdfStr = buildNarrativePdf(data);
const buffer = Buffer.from(pdfStr, 'latin1');
const binaryData = await this.helpers.prepareBinaryData(buffer, fileName, 'application/pdf');
return [{ json: { status: data.status || 'success', filename: fileName, message: data.message || 'PDF generated', session_id: data.session_id || '' }, binary: { data: binaryData } }];
