/**
 * CHV Tablero — puente con Google Sheets
 * Pegar en: planilla v8 → Extensiones → Apps Script
 * TOKEN debe ser 250578
 * Volver a implementar la app web después de pegar.
 */
var SHEET_ID = '1a4_ryH0pv0SleJzlSHgFI6JrjAmMJbl8FZdaPb7epR8';
var TOKEN = '250578';

function ss_() { return SpreadsheetApp.openById(SHEET_ID); }
function today_() {
  return Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd');
}
function slug_(s) {
  return String(s || 'tablero').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_|_$/g, '') || 'tablero';
}
function names_(boardId) {
  var id = slug_(boardId || 'cabeza');
  if (id === 'cabeza') return { cas: 'Param_Casilleros', asu: 'Asuntos', tar: 'Tareas' };
  return { cas: 'Casilleros_' + id, asu: 'Asuntos_' + id, tar: 'Tareas_' + id };
}
function ensureHeaders_(sh, headers) {
  if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
}
function ensureBoardSheets_(board) {
  var ss = ss_();
  var n = names_(board.id || board.nombre);
  var specs = [
    [n.cas, ['codigo', 'nombre', 'descripcion', 'orden', 'activo']],
    [n.asu, ['id', 'casillero', 'asunto', 'estado', 'dueno', 'proximo', 'carpeta', 'link', 'cuenta', 'notas', 'actualizado']],
    [n.tar, ['id', 'asunto', 'orden', 'titulo', 'estado', 'depende_de', 'comentarios', 'actualizado']]
  ];
  specs.forEach(function (sp) {
    var sh = ss.getSheetByName(sp[0]);
    if (!sh) sh = ss.insertSheet(sp[0]);
    ensureHeaders_(sh, sp[1]);
  });
  var idx = ss.getSheetByName('Tableros');
  if (!idx) {
    idx = ss.insertSheet('Tableros');
    idx.getRange(1, 1, 1, 3).setValues([['id', 'nombre', 'descripcion']]);
  }
  var vals = idx.getDataRange().getDisplayValues();
  var found = false;
  for (var i = 1; i < vals.length; i++) {
    if (vals[i][0] === (board.id || slug_(board.nombre))) {
      idx.getRange(i + 1, 1, 1, 3).setValues([[board.id || slug_(board.nombre), board.nombre || '', board.descripcion || '']]);
      found = true;
      break;
    }
  }
  if (!found) idx.appendRow([board.id || slug_(board.nombre), board.nombre || '', board.descripcion || '']);
  return n;
}
function listBoards_() {
  var ss = ss_();
  var idx = ss.getSheetByName('Tableros');
  var list = [{ id: 'cabeza', nombre: 'CABEZA', descripcion: 'Asuntos y tareas — Escritorio y celular' }];
  if (idx && idx.getLastRow() > 1) {
    idx.getRange(2, 1, idx.getLastRow() - 1, 3).getDisplayValues().forEach(function (r) {
      if (!r[0] || r[0] === 'cabeza') return;
      if (list.some(function (b) { return b.id === r[0]; })) return;
      list.push({ id: r[0], nombre: r[1] || r[0], descripcion: r[2] || '' });
    });
  }
  ss.getSheets().forEach(function (sh) {
    var name = sh.getName();
    if (name.indexOf('Asuntos_') === 0) {
      var id = name.slice('Asuntos_'.length);
      if (id && !list.some(function (b) { return b.id === id; })) list.push({ id: id, nombre: id, descripcion: '' });
    }
  });
  return list;
}
function rows_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) return { headers: [], data: [] };
  var vals = sh.getDataRange().getDisplayValues();
  if (!vals.length) return { headers: [], data: [] };
  return { headers: vals[0], data: vals.slice(1) };
}
function readAll_(boardId) {
  var n = names_(boardId);
  var cas = rows_(n.cas);
  var asu = rows_(n.asu);
  var tar = rows_(n.tar);
  return {
    casilleros: cas.data.filter(function (r) { return r[1] || r[0]; }).map(function (r) {
      return { codigo: r[1] || r[0], nombre: r[1] || r[0], descripcion: r[2] || '', orden: Number(r[3] || 0),
        activo: String(r[4]).toLowerCase().indexOf('s') === 0 || r[4] === 'TRUE' || r[4] === '' };
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
  if (!sh) return;
  var last = sh.getLastRow();
  var col = sh.getRange(2, idCol, Math.max(last - 1, 1), 1).getDisplayValues();
  var row = -1;
  for (var i = 0; i < col.length; i++) { if (col[i][0] === id) { row = i + 2; break; } }
  if (row < 0) sh.appendRow(values);
  else sh.getRange(row, 1, 1, values.length).setValues([values]);
}
function writeFull_(all, boardId) {
  var n = names_(boardId);
  ensureBoardSheets_({ id: boardId || 'cabeza', nombre: boardId || 'CABEZA', descripcion: '' });
  var shA = ss_().getSheetByName(n.asu);
  var shT = ss_().getSheetByName(n.tar);
  var shC = ss_().getSheetByName(n.cas);
  if (all.casilleros) {
    if (shC.getLastRow() > 1) shC.getRange(2, 1, shC.getLastRow() - 1, 5).clearContent();
    all.casilleros.forEach(function (c, i) {
      shC.appendRow(['CAS-' + String(i + 1).padStart(2, '0'), c.nombre || c.codigo, c.descripcion || '', c.orden || (i + 1), c.activo === false ? 'No' : 'Sí']);
    });
  }
  if (all.asuntos) {
    if (shA.getLastRow() > 1) shA.getRange(2, 1, shA.getLastRow() - 1, 11).clearContent();
    all.asuntos.forEach(function (a) {
      shA.appendRow([a.id, a.casillero || '', a.asunto || '', a.estado || '', a.dueno || '', a.proximo || '', a.carpeta || '', a.link || '', a.cuenta || '', a.notas || '', today_()]);
    });
  }
  if (all.tareas) {
    if (shT.getLastRow() > 1) shT.getRange(2, 1, shT.getLastRow() - 1, 8).clearContent();
    all.tareas.forEach(function (t) {
      shT.appendRow([t.id, t.asunto || '', t.orden || 1, t.titulo || '', t.estado || '', t.depende_de || '', t.comentarios || '', today_()]);
    });
  }
}
function writeAll_(data) {
  var boardId = data.boardId || 'cabeza';
  if (data.createBoard) ensureBoardSheets_(data.createBoard);
  if (data.replaceAll) writeFull_(data.replaceAll, boardId);
  var n = names_(boardId);
  if (data.asunto) {
    var a = data.asunto;
    upsert_(n.asu, 1, a.id, [a.id, a.casillero || '', a.asunto || '', a.estado || 'Abierto', a.dueno || '', a.proximo || '', a.carpeta || '', a.link || '', a.cuenta || 'oficina', a.notas || '', today_()]);
  }
  if (data.tarea) {
    var t = data.tarea;
    upsert_(n.tar, 1, t.id, [t.id, t.asunto || '', t.orden || 1, t.titulo || '', t.estado || 'Pendiente', t.depende_de || '', t.comentarios || '', today_()]);
  }
}
function ok_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function doGet(e) {
  e = e || { parameter: {} };
  if ((e.parameter.token || '') !== TOKEN) return ok_({ ok: false, error: 'token' });
  var boardId = e.parameter.board || 'cabeza';
  return ok_({ ok: true, boards: listBoards_(), data: readAll_(boardId) });
}
function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) body = JSON.parse(e.postData.contents);
    if ((body.token || '') !== TOKEN) return ok_({ ok: false, error: 'token' });
    writeAll_(body);
    var boardId = body.boardId || (body.createBoard && body.createBoard.id) || 'cabeza';
    return ok_({ ok: true, boards: listBoards_(), data: readAll_(boardId) });
  } catch (err) {
    return ok_({ ok: false, error: String(err) });
  }
}
