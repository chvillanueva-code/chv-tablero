/**
 * CHV Tablero — puente con Google Sheets
 * Pegar en: planilla v8 → Extensiones → Apps Script
 * Implementar: Nueva implementación → Aplicación web
 *   Ejecutar como: Yo
 *   Quién tiene acceso: Cualquiera
 * Copiar la URL y pegarla en config.js (WEBAPP_URL)
 */
var SHEET_ID = '1a4_ryH0pv0SleJzlSHgFI6JrjAmMJbl8FZdaPb7epR8';
var TOKEN = '210078';

function ss_() { return SpreadsheetApp.openById(SHEET_ID); }
function today_() {
  return Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd');
}
function rows_(name) {
  var sh = ss_().getSheetByName(name);
  var vals = sh.getDataRange().getDisplayValues();
  if (!vals.length) return { headers: [], data: [] };
  return { headers: vals[0], data: vals.slice(1) };
}
function readAll_() {
  var cas = rows_('Param_Casilleros');
  var asu = rows_('Asuntos');
  var tar = rows_('Tareas');
  return {
    casilleros: cas.data.filter(function (r) { return r[1]; }).map(function (r) {
      return { codigo: r[1], nombre: r[1], descripcion: r[2] || '', orden: Number(r[3] || 0),
        activo: String(r[4]).toLowerCase().indexOf('s') === 0 || r[4] === 'TRUE' };
    }),
    asuntos: asu.data.filter(function (r) { return r[0]; }).map(function (r) {
      return { id: r[0], casillero: r[1], asunto: r[2], estado: r[3], dueno: r[4], proximo: r[5],
        carpeta: r[6], link: r[7], cuenta: r[8], notas: r[9] };
    }),
    tareas: tar.data.filter(function (r) { return r[0]; }).map(function (r) {
      return { id: r[0], asunto: r[1], orden: Number(r[2] || 1), titulo: r[3], estado: r[4],
        depende_de: r[5], comentarios: r[6] };
    })
  };
}
function upsert_(sheetName, idCol, id, values) {
  var sh = ss_().getSheetByName(sheetName);
  var last = sh.getLastRow();
  var col = sh.getRange(2, idCol, Math.max(last - 1, 1), 1).getDisplayValues();
  var row = -1;
  for (var i = 0; i < col.length; i++) { if (col[i][0] === id) { row = i + 2; break; } }
  if (row < 0) sh.appendRow(values);
  else sh.getRange(row, 1, 1, values.length).setValues([values]);
}
function writeFull_(all) {
  var shA = ss_().getSheetByName('Asuntos');
  var shT = ss_().getSheetByName('Tareas');
  var shC = ss_().getSheetByName('Param_Casilleros');
  if (all.casilleros && all.casilleros.length) {
    if (shC.getLastRow() > 1) shC.getRange(2, 1, shC.getLastRow() - 1, 5).clearContent();
    all.casilleros.forEach(function (c, i) {
      shC.appendRow(['CAS-' + String(i + 1).padStart(2, '0'), c.nombre || c.codigo, c.descripcion || '', c.orden || (i + 1), c.activo === false ? 'No' : 'Sí']);
    });
  }
  if (all.asuntos && all.asuntos.length) {
    if (shA.getLastRow() > 1) shA.getRange(2, 1, shA.getLastRow() - 1, 11).clearContent();
    all.asuntos.forEach(function (a) {
      shA.appendRow([a.id, a.casillero || '', a.asunto || '', a.estado || '', a.dueno || '', a.proximo || '', a.carpeta || '', a.link || '', a.cuenta || '', a.notas || '', today_()]);
    });
  }
  if (all.tareas && all.tareas.length) {
    if (shT.getLastRow() > 1) shT.getRange(2, 1, shT.getLastRow() - 1, 8).clearContent();
    all.tareas.forEach(function (t) {
      shT.appendRow([t.id, t.asunto || '', t.orden || 1, t.titulo || '', t.estado || '', t.depende_de || '', t.comentarios || '', today_()]);
    });
  }
}
function writeAll_(data) {
  if (data.replaceAll) writeFull_(data.replaceAll);
  if (data.asunto) {
    var a = data.asunto;
    upsert_('Asuntos', 1, a.id, [a.id, a.casillero || '', a.asunto || '', a.estado || 'Abierto', a.dueno || '', a.proximo || '', a.carpeta || '', a.link || '', a.cuenta || 'oficina', a.notas || '', today_()]);
  }
  if (data.tarea) {
    var t = data.tarea;
    upsert_('Tareas', 1, t.id, [t.id, t.asunto || '', t.orden || 1, t.titulo || '', t.estado || 'Pendiente', t.depende_de || '', t.comentarios || '', today_()]);
  }
}
function ok_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function doGet(e) {
  e = e || { parameter: {} };
  if ((e.parameter.token || '') !== TOKEN) return ok_({ ok: false, error: 'token' });
  return ok_({ ok: true, data: readAll_() });
}
function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) body = JSON.parse(e.postData.contents);
    if ((body.token || '') !== TOKEN) return ok_({ ok: false, error: 'token' });
    writeAll_(body);
    return ok_({ ok: true, data: readAll_() });
  } catch (err) {
    return ok_({ ok: false, error: String(err) });
  }
}
