/**
 * CHV Tablero — puente con Google Sheets
 * Una sola trio de hojas + columna tablero.
 * TOKEN 250578 — volver a implementar la app web.
 */
var SHEET_ID = '1a4_ryH0pv0SleJzlSHgFI6JrjAmMJbl8FZdaPb7epR8';
var TOKEN = '250578';

function ss_() { return SpreadsheetApp.openById(SHEET_ID); }
function today_() {
  return Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd');
}
function slug_(s) {
  return String(s || 'tablero').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '') || 'tablero';
}
function ofBoard_(val, boardId) {
  var v = String(val || '').trim().toLowerCase();
  var b = String(boardId || 'cabeza').trim().toLowerCase();
  if (!v || v === 'cabeza') return b === 'cabeza';
  return v === b;
}
function ensureTableros_() {
  var ss = ss_();
  var idx = ss.getSheetByName('Tableros');
  if (!idx) {
    idx = ss.insertSheet('Tableros');
    idx.getRange(1, 1, 1, 3).setValues([['id', 'nombre', 'descripcion']]);
    idx.appendRow(['cabeza', 'CABEZA', 'Asuntos y tareas — Escritorio y celular']);
  }
  return idx;
}
function ensureCol_(sh, name) {
  var last = Math.max(sh.getLastColumn(), 1);
  var headers = sh.getRange(1, 1, 1, last).getDisplayValues()[0];
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).toLowerCase() === name) return i + 1;
  }
  sh.getRange(1, last + 1).setValue(name);
  return last + 1;
}
function upsertBoard_(board) {
  var idx = ensureTableros_();
  var id = board.id || slug_(board.nombre);
  var vals = idx.getDataRange().getDisplayValues();
  for (var i = 1; i < vals.length; i++) {
    if (vals[i][0] === id) {
      idx.getRange(i + 1, 1, 1, 3).setValues([[id, board.nombre || id, board.descripcion || '']]);
      return id;
    }
  }
  idx.appendRow([id, board.nombre || id, board.descripcion || '']);
  return id;
}
function listBoards_() {
  var list = [{ id: 'cabeza', nombre: 'CABEZA', descripcion: 'Asuntos y tareas — Escritorio y celular' }];
  var idx = ss_().getSheetByName('Tableros');
  if (idx && idx.getLastRow() > 1) {
    idx.getRange(2, 1, idx.getLastRow() - 1, 3).getDisplayValues().forEach(function (r) {
      if (!r[0]) return;
      if (list.some(function (b) { return b.id === r[0]; })) {
        if (r[0] !== 'cabeza') return;
        return;
      }
      list.push({ id: r[0], nombre: r[1] || r[0], descripcion: r[2] || '' });
    });
  }
  return list;
}
function rows_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) return { headers: [], data: [] };
  var vals = sh.getDataRange().getDisplayValues();
  if (!vals.length) return { headers: [], data: [] };
  return { headers: vals[0].map(function (h) { return String(h).toLowerCase(); }), data: vals.slice(1) };
}
function col_(headers, name, fallback) {
  var i = headers.indexOf(name);
  return i >= 0 ? i : fallback;
}
function readAll_(boardId) {
  boardId = boardId || 'cabeza';
  var cas = rows_('Param_Casilleros');
  var asu = rows_('Asuntos');
  var tar = rows_('Tareas');
  var cTab = col_(cas.headers, 'tablero', 5);
  var aTab = col_(asu.headers, 'tablero', 11);
  var tTab = col_(tar.headers, 'tablero', 8);
  return {
    casilleros: cas.data.filter(function (r) { return (r[1] || r[0]) && ofBoard_(r[cTab], boardId); }).map(function (r) {
      return { codigo: r[1] || r[0], nombre: r[1] || r[0], descripcion: r[2] || '', orden: Number(r[3] || 0),
        activo: String(r[4]).toLowerCase().indexOf('n') !== 0, tablero: boardId };
    }),
    asuntos: asu.data.filter(function (r) { return r[0] && ofBoard_(r[aTab], boardId); }).map(function (r) {
      return { id: r[0], casillero: r[1], asunto: r[2], estado: r[3], dueno: r[4], proximo: r[5],
        carpeta: r[6], link: r[7], cuenta: r[8], notas: r[9], tablero: boardId };
    }),
    tareas: tar.data.filter(function (r) { return r[0] && ofBoard_(r[tTab], boardId); }).map(function (r) {
      return { id: r[0], asunto: r[1], orden: Number(r[2] || 1), titulo: r[3], estado: r[4],
        depende_de: r[5], comentarios: r[6], tablero: boardId };
    })
  };
}
function upsert_(sheetName, id, values, tablero) {
  var sh = ss_().getSheetByName(sheetName);
  if (!sh) return;
  var tabCol = ensureCol_(sh, 'tablero');
  var last = sh.getLastRow();
  var ids = sh.getRange(2, 1, Math.max(last - 1, 1), 1).getDisplayValues();
  var tabs = sh.getRange(2, tabCol, Math.max(last - 1, 1), 1).getDisplayValues();
  var row = -1;
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === id && ofBoard_(tabs[i][0], tablero)) { row = i + 2; break; }
  }
  var line = values.slice();
  while (line.length < tabCol - 1) line.push('');
  line[tabCol - 1] = tablero;
  if (row < 0) sh.appendRow(line);
  else sh.getRange(row, 1, 1, line.length).setValues([line]);
}
function replaceBoardRows_(sheetName, boardId, width, builder) {
  var sh = ss_().getSheetByName(sheetName);
  if (!sh) return;
  var tabCol = ensureCol_(sh, 'tablero');
  var last = sh.getLastRow();
  if (last < 2) {
    builder.forEach(function (row) { upsert_(sheetName, row[0], row, boardId); });
    return;
  }
  var data = sh.getRange(2, 1, last - 1, Math.max(sh.getLastColumn(), tabCol)).getDisplayValues();
  var keep = data.filter(function (r) { return !ofBoard_(r[tabCol - 1], boardId); });
  sh.getRange(2, 1, last - 1, sh.getLastColumn()).clearContent();
  var out = keep.concat(builder.map(function (row) {
    var line = row.slice();
    while (line.length < tabCol - 1) line.push('');
    line[tabCol - 1] = boardId;
    return line;
  }));
  if (out.length) sh.getRange(2, 1, out.length, out[0].length).setValues(out);
}
function writeFull_(all, boardId) {
  boardId = boardId || 'cabeza';
  if (all.casilleros) {
    replaceBoardRows_('Param_Casilleros', boardId, 6, all.casilleros.map(function (c, i) {
      return ['CAS-' + String(i + 1).padStart(2, '0'), c.nombre || c.codigo, c.descripcion || '', c.orden || (i + 1), c.activo === false ? 'No' : 'Sí'];
    }));
  }
  if (all.asuntos) {
    replaceBoardRows_('Asuntos', boardId, 12, all.asuntos.map(function (a) {
      return [a.id, a.casillero || '', a.asunto || '', a.estado || '', a.dueno || '', a.proximo || '', a.carpeta || '', a.link || '', a.cuenta || '', a.notas || '', today_()];
    }));
  }
  if (all.tareas) {
    replaceBoardRows_('Tareas', boardId, 9, all.tareas.map(function (t) {
      return [t.id, t.asunto || '', t.orden || 1, t.titulo || '', t.estado || '', t.depende_de || '', t.comentarios || '', today_()];
    }));
  }
}
function writeAll_(data) {
  var boardId = data.boardId || 'cabeza';
  if (data.createBoard) upsertBoard_(data.createBoard);
  if (data.replaceAll) writeFull_(data.replaceAll, boardId);
  if (data.asunto) {
    var a = data.asunto;
    upsert_('Asuntos', a.id, [a.id, a.casillero || '', a.asunto || '', a.estado || 'Abierto', a.dueno || '', a.proximo || '', a.carpeta || '', a.link || '', a.cuenta || 'oficina', a.notas || '', today_()], boardId);
  }
  if (data.tarea) {
    var t = data.tarea;
    upsert_('Tareas', t.id, [t.id, t.asunto || '', t.orden || 1, t.titulo || '', t.estado || 'Pendiente', t.depende_de || '', t.comentarios || '', today_()], boardId);
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
