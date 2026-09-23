/**
 * CHV Tablero — usuarios + tableros + compartidos (espejo).
 * TOKEN de app 250578. Volver a implementar la app web.
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
function norm_(s) { return String(s || '').trim().toLowerCase(); }
function ofBoard_(val, boardId) {
  var v = norm_(val);
  var b = norm_(boardId) || 'cabeza';
  if (!v || v === 'cabeza') return b === 'cabeza';
  return v === b;
}
function ofUser_(val, user) {
  var v = String(val || '').trim().toUpperCase();
  var u = String(user || 'CHV').trim().toUpperCase();
  if (!v) return u === 'CHV';
  return v === u;
}
function ensureCol_(sh, name) {
  var last = Math.max(sh.getLastColumn(), 1);
  var headers = sh.getRange(1, 1, 1, last).getDisplayValues()[0];
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).toLowerCase() === name.toLowerCase()) return i + 1;
  }
  sh.getRange(1, last + 1).setValue(name);
  return last + 1;
}
function ensureUsuarios_() {
  var ss = ss_();
  var sh = ss.getSheetByName('Param_Usuarios');
  if (!sh) {
    sh = ss.insertSheet('Param_Usuarios');
    sh.getRange(1, 1, 1, 3).setValues([['usuario', 'clave', 'nombre']]);
    sh.appendRow(['CHV', '250578', 'CHV']);
    sh.appendRow(['MLV', '250578', 'MLV']);
  }
  return sh;
}
function listUsers_() {
  ensureUsuarios_();
  var sh = ss_().getSheetByName('Param_Usuarios');
  var out = [];
  if (sh && sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 3).getDisplayValues().forEach(function (r) {
      if (r[0]) out.push({ usuario: String(r[0]).trim().toUpperCase(), nombre: r[2] || r[0] });
    });
  }
  if (!out.length) out = [{ usuario: 'CHV', nombre: 'CHV' }, { usuario: 'MLV', nombre: 'MLV' }];
  return out;
}
function checkLogin_(user, pass) {
  ensureUsuarios_();
  var sh = ss_().getSheetByName('Param_Usuarios');
  var u = String(user || '').trim().toUpperCase();
  var p = String(pass || '').trim();
  if (!sh || sh.getLastRow() < 2) return u === 'CHV' && p === TOKEN;
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getDisplayValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim().toUpperCase() === u && String(rows[i][1]).trim() === p) return true;
  }
  return false;
}
function ensureTableros_() {
  var ss = ss_();
  var idx = ss.getSheetByName('Tableros');
  if (!idx) {
    idx = ss.insertSheet('Tableros');
    idx.getRange(1, 1, 1, 4).setValues([['id', 'nombre', 'descripcion', 'usuario']]);
    idx.appendRow(['cabeza', 'CABEZA', 'Asuntos y tareas — Escritorio y celular', 'CHV']);
  } else {
    ensureCol_(idx, 'usuario');
  }
  return idx;
}
function upsertBoard_(board, user) {
  var idx = ensureTableros_();
  var id = board.id || slug_(board.nombre);
  var u = String(user || 'CHV').toUpperCase();
  var uCol = ensureCol_(idx, 'usuario');
  var vals = idx.getDataRange().getDisplayValues();
  for (var i = 1; i < vals.length; i++) {
    if (vals[i][0] === id && ofUser_(vals[i][uCol - 1], u)) {
      idx.getRange(i + 1, 1, 1, 4).setValues([[id, board.nombre || id, board.descripcion || '', u]]);
      return id;
    }
  }
  idx.appendRow([id, board.nombre || id, board.descripcion || '', u]);
  return id;
}
function listBoards_(user) {
  var u = String(user || 'CHV').toUpperCase();
  var list = [];
  var idx = ensureTableros_();
  var uCol = ensureCol_(idx, 'usuario');
  if (idx.getLastRow() > 1) {
    idx.getRange(2, 1, idx.getLastRow() - 1, Math.max(4, uCol)).getDisplayValues().forEach(function (r) {
      if (!r[0]) return;
      if (!ofUser_(r[uCol - 1], u)) return;
      list.push({ id: r[0], nombre: r[1] || r[0], descripcion: r[2] || '', usuario: u });
    });
  }
  if (!list.some(function (b) { return b.id === 'cabeza'; })) {
    list.unshift({ id: 'cabeza', nombre: 'CABEZA', descripcion: 'Asuntos y tareas — Escritorio y celular', usuario: u });
    upsertBoard_({ id: 'cabeza', nombre: 'CABEZA', descripcion: 'Asuntos y tareas — Escritorio y celular' }, u);
  }
  return list;
}
function ensureShares_() {
  var ss = ss_();
  var sh = ss.getSheetByName('Compartidos');
  if (!sh) {
    sh = ss.insertSheet('Compartidos');
    sh.getRange(1, 1, 1, 8).setValues([['id', 'de_usuario', 'a_usuario', 'asunto_id', 'tareas', 'tablero_origen', 'tablero_destino', 'activo']]);
  }
  return sh;
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
function readOwn_(boardId, user) {
  boardId = boardId || 'cabeza';
  var cas = rows_('Param_Casilleros');
  var asu = rows_('Asuntos');
  var tar = rows_('Tareas');
  var cTab = col_(cas.headers, 'tablero', 5);
  var aTab = col_(asu.headers, 'tablero', 11);
  var tTab = col_(tar.headers, 'tablero', 8);
  var cUser = col_(cas.headers, 'usuario', -1);
  var aUser = col_(asu.headers, 'usuario', -1);
  var tUser = col_(tar.headers, 'usuario', -1);
  function mine(r, tabI, userI) {
    if (!ofBoard_(r[tabI], boardId)) return false;
    if (userI < 0) return ofUser_('', user);
    return ofUser_(r[userI], user);
  }
  return {
    casilleros: cas.data.filter(function (r) { return (r[1] || r[0]) && mine(r, cTab, cUser); }).map(function (r) {
      return { codigo: r[1] || r[0], nombre: r[1] || r[0], descripcion: r[2] || '', orden: Number(r[3] || 0),
        activo: String(r[4]).toLowerCase().indexOf('n') !== 0, tablero: boardId, usuario: user };
    }),
    asuntos: asu.data.filter(function (r) { return r[0] && mine(r, aTab, aUser); }).map(function (r) {
      return { id: r[0], casillero: r[1], asunto: r[2], estado: r[3], dueno: r[4], proximo: r[5],
        carpeta: r[6], link: r[7], cuenta: r[8], notas: r[9], tablero: boardId, usuario: user, espejo: false };
    }),
    tareas: tar.data.filter(function (r) { return r[0] && mine(r, tTab, tUser); }).map(function (r) {
      return { id: r[0], asunto: r[1], orden: Number(r[2] || 1), titulo: r[3], estado: r[4],
        depende_de: r[5], comentarios: r[6], tablero: boardId, usuario: user, espejo: false };
    })
  };
}
function findAsunto_(id, boardId, user) {
  var asu = rows_('Asuntos');
  var aTab = col_(asu.headers, 'tablero', 11);
  var aUser = col_(asu.headers, 'usuario', -1);
  for (var i = 0; i < asu.data.length; i++) {
    var r = asu.data[i];
    if (r[0] === id && ofBoard_(r[aTab], boardId) && (aUser < 0 ? ofUser_('', user) : ofUser_(r[aUser], user))) {
      return { id: r[0], casillero: r[1], asunto: r[2], estado: r[3], dueno: r[4], proximo: r[5],
        carpeta: r[6], link: r[7], cuenta: r[8], notas: r[9], tablero: boardId, usuario: user };
    }
  }
  return null;
}
function findTareas_(asuntoId, boardId, user, allow) {
  var tar = rows_('Tareas');
  var tTab = col_(tar.headers, 'tablero', 8);
  var tUser = col_(tar.headers, 'usuario', -1);
  var all = allow === '*' || !allow;
  var set = {};
  if (!all) String(allow).split(',').forEach(function (x) { if (x.trim()) set[x.trim()] = true; });
  return tar.data.filter(function (r) {
    if (r[1] !== asuntoId) return false;
    if (!ofBoard_(r[tTab], boardId)) return false;
    if (tUser >= 0 && !ofUser_(r[tUser], user)) return false;
    if (tUser < 0 && !ofUser_('', user)) return false;
    if (!all && !set[r[0]]) return false;
    return true;
  }).map(function (r) {
    return { id: r[0], asunto: r[1], orden: Number(r[2] || 1), titulo: r[3], estado: r[4],
      depende_de: r[5], comentarios: r[6], tablero: boardId, usuario: user };
  });
}
function mergeShares_(own, boardId, user) {
  ensureShares_();
  var sh = ss_().getSheetByName('Compartidos');
  if (!sh || sh.getLastRow() < 2) return own;
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 8).getDisplayValues();
  rows.forEach(function (r) {
    if (String(r[7]).toLowerCase() === 'no') return;
    if (String(r[2]).trim().toUpperCase() !== String(user).toUpperCase()) return;
    if (!ofBoard_(r[6], boardId)) return;
    var origenUser = String(r[1]).trim().toUpperCase();
    var origenBoard = r[5] || 'cabeza';
    var asunto = findAsunto_(r[3], origenBoard, origenUser);
    if (!asunto) return;
    asunto.espejo = true;
    asunto.origen_usuario = origenUser;
    asunto.origen_tablero = origenBoard;
    asunto.tablero = boardId;
    asunto.usuario = user;
    if (!own.asuntos.some(function (a) { return a.id === asunto.id && a.origen_usuario === origenUser; })) own.asuntos.push(asunto);
    findTareas_(r[3], origenBoard, origenUser, r[4] || '*').forEach(function (t) {
      t.espejo = true;
      t.origen_usuario = origenUser;
      t.origen_tablero = origenBoard;
      t.tablero = boardId;
      t.usuario = user;
      if (!own.tareas.some(function (x) { return x.id === t.id && x.origen_usuario === origenUser; })) own.tareas.push(t);
    });
  });
  return own;
}
function readAll_(boardId, user) { return mergeShares_(readOwn_(boardId, user), boardId, user); }
function upsert_(sheetName, id, values, tablero, user) {
  var sh = ss_().getSheetByName(sheetName);
  if (!sh) return;
  var tabCol = ensureCol_(sh, 'tablero');
  var userCol = ensureCol_(sh, 'usuario');
  var last = sh.getLastRow();
  var width = Math.max(sh.getLastColumn(), userCol);
  var row = -1;
  if (last >= 2) {
    var data = sh.getRange(2, 1, last - 1, width).getDisplayValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] === id && ofBoard_(data[i][tabCol - 1], tablero) && ofUser_(data[i][userCol - 1], user)) { row = i + 2; break; }
    }
  }
  var line = values.slice();
  var need = Math.max(tabCol, userCol);
  while (line.length < need) line.push('');
  line[tabCol - 1] = tablero;
  line[userCol - 1] = String(user || 'CHV').toUpperCase();
  if (row < 0) sh.appendRow(line);
  else sh.getRange(row, 1, 1, line.length).setValues([line]);
}
function replaceBoardRows_(sheetName, boardId, user, builder) {
  var sh = ss_().getSheetByName(sheetName);
  if (!sh) return;
  var tabCol = ensureCol_(sh, 'tablero');
  var userCol = ensureCol_(sh, 'usuario');
  var last = sh.getLastRow();
  var width = Math.max(sh.getLastColumn(), userCol);
  var keep = [];
  if (last >= 2) {
    var data = sh.getRange(2, 1, last - 1, width).getDisplayValues();
    keep = data.filter(function (r) { return !(ofBoard_(r[tabCol - 1], boardId) && ofUser_(r[userCol - 1], user)); });
    sh.getRange(2, 1, last - 1, width).clearContent();
  }
  var out = keep.concat(builder.map(function (row) {
    var line = row.slice();
    var need = Math.max(tabCol, userCol);
    while (line.length < need) line.push('');
    line[tabCol - 1] = boardId;
    line[userCol - 1] = String(user || 'CHV').toUpperCase();
    return line;
  }));
  if (out.length) sh.getRange(2, 1, out.length, out[0].length).setValues(out);
}
function writeFull_(all, boardId, user) {
  boardId = boardId || 'cabeza';
  var ownCas = (all.casilleros || []).filter(function (c) { return !c.espejo; });
  var ownAsu = (all.asuntos || []).filter(function (a) { return !a.espejo; });
  var ownTar = (all.tareas || []).filter(function (t) { return !t.espejo; });
  replaceBoardRows_('Param_Casilleros', boardId, user, ownCas.map(function (c, i) {
    return ['CAS-' + String(i + 1).padStart(2, '0'), c.nombre || c.codigo, c.descripcion || '', c.orden || (i + 1), c.activo === false ? 'No' : 'Sí'];
  }));
  replaceBoardRows_('Asuntos', boardId, user, ownAsu.map(function (a) {
    return [a.id, a.casillero || '', a.asunto || '', a.estado || '', a.dueno || '', a.proximo || '', a.carpeta || '', a.link || '', a.cuenta || '', a.notas || '', today_()];
  }));
  replaceBoardRows_('Tareas', boardId, user, ownTar.map(function (t) {
    return [t.id, t.asunto || '', t.orden || 1, t.titulo || '', t.estado || '', t.depende_de || '', t.comentarios || '', today_()];
  }));
}
function writeShare_(share, fromUser, fromBoard) {
  ensureShares_();
  var sh = ss_().getSheetByName('Compartidos');
  var id = share.id || (fromUser + '-' + share.a_usuario + '-' + share.asunto_id + '-' + Date.now());
  var tareas = share.todas ? '*' : (Array.isArray(share.tareas) ? share.tareas.join(',') : (share.tareas || '*'));
  sh.appendRow([id, String(fromUser).toUpperCase(), String(share.a_usuario).toUpperCase(), share.asunto_id,
    tareas, share.tablero_origen || fromBoard || 'cabeza', share.tablero_destino || 'cabeza', 'Sí']);
}
function writeAll_(data) {
  var user = String(data.user || data.usuario || 'CHV').toUpperCase();
  var boardId = data.boardId || (data.createBoard && data.createBoard.id) || 'cabeza';
  if (data.createBoard) upsertBoard_(data.createBoard, user);
  if (data.replaceAll) writeFull_(data.replaceAll, boardId, user);
  var targetUser = data.origen_usuario || user;
  var targetBoard = data.origen_tablero || boardId;
  if (data.asunto) {
    var a = data.asunto;
    upsert_('Asuntos', a.id, [a.id, a.casillero || '', a.asunto || '', a.estado || 'Abierto', a.dueno || '', a.proximo || '', a.carpeta || '', a.link || '', a.cuenta || 'oficina', a.notas || '', today_()],
      a.origen_tablero || targetBoard, a.origen_usuario || targetUser);
  }
  if (data.tarea) {
    var t = data.tarea;
    upsert_('Tareas', t.id, [t.id, t.asunto || '', t.orden || 1, t.titulo || '', t.estado || 'Pendiente', t.depende_de || '', t.comentarios || '', today_()],
      t.origen_tablero || targetBoard, t.origen_usuario || targetUser);
  }
  if (data.share) writeShare_(data.share, user, boardId);
}
function ok_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function doGet(e) {
  e = e || { parameter: {} };
  if ((e.parameter.token || '') !== TOKEN) return ok_({ ok: false, error: 'token' });
  if (e.parameter.action === 'login') {
    var ok = checkLogin_(e.parameter.user, e.parameter.pass);
    return ok_({ ok: ok, users: ok ? listUsers_() : [] });
  }
  if (e.parameter.action === 'users') return ok_({ ok: true, users: listUsers_() });
  var user = String(e.parameter.user || 'CHV').toUpperCase();
  var boardId = e.parameter.board || 'cabeza';
  return ok_({ ok: true, user: user, users: listUsers_(), boards: listBoards_(user), data: readAll_(boardId, user) });
}
function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) body = JSON.parse(e.postData.contents);
    if ((body.token || '') !== TOKEN) return ok_({ ok: false, error: 'token' });
    writeAll_(body);
    var user = String(body.user || body.usuario || 'CHV').toUpperCase();
    var boardId = body.boardId || (body.createBoard && body.createBoard.id) || 'cabeza';
    return ok_({ ok: true, user: user, users: listUsers_(), boards: listBoards_(user), data: readAll_(boardId, user) });
  } catch (err) {
    return ok_({ ok: false, error: String(err) });
  }
}
