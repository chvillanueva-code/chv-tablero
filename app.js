(function () {
  const KEY = "chv_tablero_ok";
  const STORE = "chv_tablero_data";
  const BSTORE = "chv_tableros";
  const USER = "chv";
  const PASS = "250578";
  const CFG = window.CHV_CONFIG || {};
  const EST_A = ["Abierto", "Abierto — aclarar", "Pendiente aclarar", "Casi cerrado", "Hecha"];
  const EST_T = ["Pendiente", "Bloqueada", "Hecha"];
  const gate = document.getElementById("gate");
  const app = document.getElementById("app");
  const form = document.getElementById("login");
  const err = document.getElementById("err");
  const modal = document.getElementById("modal");
  const sheet = document.getElementById("sheet");
  function emptyData() { return { casilleros: [], asuntos: [], tareas: [] }; }
  let DATA = emptyData();
  function defaultBoards() {
    return {
      current: "cabeza",
      list: [
        { id: "cabeza", nombre: "CABEZA", descripcion: "Asuntos y tareas — Escritorio y celular" },
        { id: "hogar", nombre: "HOGAR", descripcion: "Home Sweet Home" }
      ],
      data: { hogar: emptyData() }
    };
  }
  let BOARDS = defaultBoards();
  try {
    const savedB = JSON.parse(localStorage.getItem(BSTORE) || "");
    if (savedB && savedB.list) {
      BOARDS = savedB;
      if (!BOARDS.list.some(function (b) { return b.id === "hogar"; })) {
        BOARDS.list.push({ id: "hogar", nombre: "HOGAR", descripcion: "Home Sweet Home" });
      }
      BOARDS.data = BOARDS.data || {};
      if (!BOARDS.data.hogar) BOARDS.data.hogar = emptyData();
    }
  } catch (e) {}
  function board() {
    return BOARDS.list.filter(function (b) { return b.id === BOARDS.current; })[0] || BOARDS.list[0];
  }
  function saveBoards() {
    try {
      if (DATA) BOARDS.data[BOARDS.current] = DATA;
      localStorage.setItem(BSTORE, JSON.stringify(BOARDS));
    } catch (e) {}
  }
  function closeBoardMenu() {
    const menu = document.getElementById("boardMenu");
    const btn = document.getElementById("boardBtn");
    if (menu) menu.hidden = true;
    if (btn) btn.setAttribute("aria-expanded", "false");
  }
  function paintBoard() {
    const b = board();
    const h = document.getElementById("boardName");
    const d = document.getElementById("origen");
    if (h) h.textContent = "Tablero: " + b.nombre;
    if (d) d.textContent = b.descripcion;
    document.title = "CHV — Tablero: " + b.nombre;
    const menu = document.getElementById("boardMenu");
    if (menu) {
      menu.innerHTML = BOARDS.list.map(function (x) {
        return '<button type="button" class="board-opt' + (x.id === BOARDS.current ? " on" : "") + '" data-id="' + x.id + '"><strong>Tablero: ' + x.nombre + "</strong><span>" + (x.descripcion || "") + "</span></button>";
      }).join("");
      menu.querySelectorAll(".board-opt").forEach(function (opt) {
        opt.onclick = function (e) {
          e.stopPropagation();
          const id = opt.getAttribute("data-id");
          closeBoardMenu();
          if (id !== BOARDS.current) switchBoard(id);
        };
      });
    }
  }
  function switchBoard(id) {
    saveBoards();
    BOARDS.current = id;
    DATA = emptyData();
    saveBoards();
    paintBoard();
    start();
    pullSheets().then(function () { start(); });
  }
  function formBoard(isNew) {
    const b = isNew ? { nombre: "", descripcion: "" } : board();
    openModal("<h3>" + (isNew ? "Nuevo tablero" : "Editar tablero") + "</h3><form id=\"fB\"><label>Nombre<input name=\"nombre\" required value=\"" + (b.nombre || "") + "\"></label><label>Descripción<input name=\"descripcion\" value=\"" + (b.descripcion || "") + "\"></label><div class=\"rowbtns\"><button type=\"submit\">Guardar</button><button type=\"button\" data-close class=\"ghost\">Cancelar</button></div></form>");
    document.getElementById("fB").onsubmit = function (e) {
      e.preventDefault();
      const fd = new FormData(e.target);
      const nombre = String(fd.get("nombre") || "").trim();
      const descripcion = String(fd.get("descripcion") || "").trim();
      if (!nombre) return;
      if (isNew) {
        const id = nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || ("t" + Date.now());
        const nid = BOARDS.list.some(function (x) { return x.id === id; }) ? id + "-" + Date.now() : id;
        BOARDS.list.push({ id: nid, nombre: nombre, descripcion: descripcion });
        BOARDS.data[nid] = emptyData();
        closeModal();
        persist({ createBoard: { id: nid, nombre: nombre, descripcion: descripcion }, boardId: nid });
        switchBoard(nid);
      } else {
        const cur = board();
        cur.nombre = nombre;
        cur.descripcion = descripcion;
        saveBoards();
        paintBoard();
        closeModal();
      }
    };
  }
  function sheetsUrl() { return String(CFG.WEBAPP_URL || "").trim(); }
  function persistLocal() {
    try {
      localStorage.setItem(STORE + "_" + BOARDS.current, JSON.stringify(DATA));
      saveBoards();
    } catch (e) {}
  }
  function persist(extra) {
    persistLocal();
    if (!sheetsUrl()) return;
    fetch(sheetsUrl(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(Object.assign({ token: CFG.TOKEN || PASS, boardId: BOARDS.current }, extra || { replaceAll: DATA }))
    }).catch(function () {});
  }
  function pullSheets() {
    const url = sheetsUrl();
    if (!url) return Promise.resolve(false);
    return fetch(url + "?token=" + encodeURIComponent(CFG.TOKEN || PASS) + "&board=" + encodeURIComponent(BOARDS.current))
      .then(function (r) { return r.json(); })
      .then(function (json) {
        if (json && json.ok && json.boards && json.boards.length) {
          json.boards.forEach(function (b) {
            if (!BOARDS.list.some(function (x) { return x.id === b.id; })) BOARDS.list.push(b);
          });
        }
        if (json && json.ok && json.data) {
          DATA = json.data;
          persistLocal();
          return true;
        }
        return false;
      })
      .catch(function () { return false; });
  }
  function showApp() { gate.hidden = true; app.hidden = false; boot(); }
  function boot() {
    DATA = emptyData();
    try {
      if (BOARDS.current === "cabeza") {
        const saved = JSON.parse(localStorage.getItem(STORE + "_cabeza") || localStorage.getItem(STORE) || "");
        if (saved && saved.asuntos) DATA = saved;
      }
    } catch (e) {}
    paintBoard();
    bindBoardUi();
    start();
    pullSheets().then(function () { start(); });
  }
  function bindBoardUi() {
    const ed = document.getElementById("btnEditBoard");
    const nw = document.getElementById("btnNewBoard");
    const btn = document.getElementById("boardBtn");
    if (ed) ed.onclick = function (e) { e.preventDefault(); e.stopPropagation(); formBoard(false); };
    if (nw) nw.onclick = function (e) { e.preventDefault(); e.stopPropagation(); formBoard(true); };
    if (btn) {
      btn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        const menu = document.getElementById("boardMenu");
        if (!menu) return;
        paintBoard();
        menu.hidden = !menu.hidden;
      };
    }
    document.onclick = function (e) {
      const wrap = document.querySelector(".titles-wrap");
      if (wrap && !wrap.contains(e.target)) closeBoardMenu();
    };
    paintBoard();
  }
  if (sessionStorage.getItem(KEY) === "1") showApp();
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const u = (document.getElementById("user").value || "").trim().toLowerCase();
    const p = document.getElementById("pass").value || "";
    if (u === USER && p === PASS) {
      err.hidden = true;
      sessionStorage.setItem(KEY, "1");
      showApp();
    } else err.hidden = false;
  });
  document.getElementById("salir").addEventListener("click", function () {
    sessionStorage.removeItem(KEY);
    location.reload();
  });
  function nextAsunto() {
    const n = (DATA.asuntos || []).reduce(function (m, a) {
      const x = parseInt(String(a.id).replace("CHV-", ""), 10);
      return isNaN(x) ? m : Math.max(m, x);
    }, 0);
    return "CHV-" + String(n + 1).padStart(3, "0");
  }
  function nextTarea(aid) {
    const n = (DATA.tareas || []).filter(function (t) { return t.asunto === aid; }).reduce(function (m, t) {
      const p = String(t.id).split("-");
      const x = parseInt(p[p.length - 1], 10);
      return isNaN(x) ? m : Math.max(m, x);
    }, 0);
    return aid + "-" + String(n + 1).padStart(2, "0");
  }
  function closeModal() { modal.hidden = true; sheet.innerHTML = ""; }
  function openModal(html) {
    sheet.innerHTML = html;
    modal.hidden = false;
    const x = sheet.querySelector("[data-close]");
    if (x) x.addEventListener("click", closeModal);
    modal.onclick = function (e) { if (e.target === modal) closeModal(); };
  }
  function opts(list, val) {
    return list.map(function (v) { return "<option" + (v === val ? " selected" : "") + ">" + v + "</option>"; }).join("");
  }
  function casOpts(val) {
    return (DATA.casilleros || []).filter(function (c) { return c.activo; }).sort(function (a, b) { return a.orden - b.orden; })
      .map(function (c) { return "<option value=\"" + c.codigo + "\"" + (c.codigo === val ? " selected" : "") + ">" + c.nombre + "</option>"; }).join("");
  }
  function asuOpts(val) {
    return (DATA.asuntos || []).map(function (a) {
      return "<option value=\"" + a.id + "\"" + (a.id === val ? " selected" : "") + ">" + a.id + " · " + a.asunto + "</option>";
    }).join("");
  }
  function formAsunto(a) {
    a = a || { id: nextAsunto(), casillero: "", asunto: "", estado: "Abierto", dueno: "Christian", proximo: "", notas: "" };
    openModal("<h3>" + ((DATA.asuntos || []).some(function (x) { return x.id === a.id; }) ? "Editar" : "Nuevo") + " asunto</h3><form id=\"fA\"><label>Código<input name=\"id\" value=\"" + a.id + "\" readonly></label><label>Casillero<select name=\"casillero\">" + casOpts(a.casillero) + "</select></label><label>Asunto<input name=\"asunto\" required value=\"" + (a.asunto || "") + "\"></label><label>Estado<select name=\"estado\">" + opts(EST_A, a.estado) + "</select></label><label>Dueño<input name=\"dueno\" value=\"" + (a.dueno || "") + "\"></label><label>Próximo<input name=\"proximo\" value=\"" + (a.proximo || "") + "\"></label><label>Notas<textarea name=\"notas\">" + (a.notas || "") + "</textarea></label><div class=\"rowbtns\"><button type=\"submit\">Guardar</button><button type=\"button\" data-close class=\"ghost\">Cancelar</button></div></form>");
    document.getElementById("fA").onsubmit = function (e) {
      e.preventDefault(); const fd = new FormData(e.target);
      const row = { id: fd.get("id"), casillero: fd.get("casillero"), asunto: fd.get("asunto"), estado: fd.get("estado"), dueno: fd.get("dueno"), proximo: fd.get("proximo"), notas: fd.get("notas"), carpeta: a.carpeta || "", link: a.link || "", cuenta: a.cuenta || "oficina", tablero: BOARDS.current };
      const i = DATA.asuntos.findIndex(function (x) { return x.id === row.id; });
      if (i >= 0) DATA.asuntos[i] = Object.assign({}, DATA.asuntos[i], row); else DATA.asuntos.push(row);
      persist({ asunto: row }); closeModal(); start();
    };
  }
  function formTarea(pre) {
    const aid = (pre && pre.asunto) || (DATA.asuntos[0] && DATA.asuntos[0].id) || "";
    const t = pre && pre.id ? pre : { id: "", asunto: aid, orden: 1, titulo: "", estado: "Pendiente", depende_de: "", comentarios: "" };
    openModal("<h3>" + (t.id ? "Editar tarea" : "Nueva tarea") + "</h3><form id=\"fT\"><label>Asunto<select name=\"asunto\">" + asuOpts(t.asunto) + "</select></label><label>Título<input name=\"titulo\" required value=\"" + (t.titulo || "") + "\"></label><label>Estado<select name=\"estado\">" + opts(EST_T, t.estado) + "</select></label><label>Orden<input name=\"orden\" type=\"number\" min=\"1\" value=\"" + (t.orden || 1) + "\"></label><label>Depende de<input name=\"depende_de\" value=\"" + (t.depende_de || "") + "\"></label><label>Comentarios<textarea name=\"comentarios\">" + (t.comentarios || "") + "</textarea></label><div class=\"rowbtns\"><button type=\"submit\">Guardar</button><button type=\"button\" data-close class=\"ghost\">Cancelar</button></div></form>");
    document.getElementById("fT").onsubmit = function (e) {
      e.preventDefault(); const fd = new FormData(e.target); const asunto = fd.get("asunto");
      const row = { id: t.id || nextTarea(asunto), asunto: asunto, orden: Number(fd.get("orden") || 1), titulo: fd.get("titulo"), estado: fd.get("estado"), depende_de: fd.get("depende_de"), comentarios: fd.get("comentarios"), tablero: BOARDS.current };
      const i = DATA.tareas.findIndex(function (x) { return x.id === row.id; });
      if (i >= 0) DATA.tareas[i] = row; else DATA.tareas.push(row);
      persist({ tarea: row }); closeModal(); start();
    };
  }
  function formCas() {
    openModal("<h3>Casilleros</h3><form id=\"fC\">" + (DATA.casilleros || []).sort(function (a, b) { return a.orden - b.orden; }).map(function (c, i) {
      return "<div class=\"casrow\"><input name=\"nombre\" data-i=\"" + i + "\" value=\"" + c.nombre + "\"><input name=\"orden\" type=\"number\" data-i=\"" + i + "\" value=\"" + c.orden + "\" style=\"width:70px\"><label class=\"chk\"><input type=\"checkbox\" name=\"activo\" data-i=\"" + i + "\"" + (c.activo ? " checked" : "") + "> activo</label></div>";
    }).join("") + "<label>Nuevo casillero<input name=\"nuevo\"></label><div class=\"rowbtns\"><button type=\"submit\">Guardar</button><button type=\"button\" data-close class=\"ghost\">Cancelar</button></div></form>");
    document.getElementById("fC").onsubmit = function (e) {
      e.preventDefault();
      sheet.querySelectorAll("input[name=nombre]").forEach(function (inp) {
        const i = Number(inp.getAttribute("data-i"));
        DATA.casilleros[i].nombre = inp.value.trim() || DATA.casilleros[i].nombre;
        DATA.casilleros[i].codigo = DATA.casilleros[i].nombre;
        DATA.casilleros[i].tablero = BOARDS.current;
      });
      sheet.querySelectorAll("input[name=orden]").forEach(function (inp) {
        DATA.casilleros[Number(inp.getAttribute("data-i"))].orden = Number(inp.value || 1);
      });
      sheet.querySelectorAll("input[name=activo]").forEach(function (inp) {
        DATA.casilleros[Number(inp.getAttribute("data-i"))].activo = inp.checked;
      });
      const neu = (e.target.nuevo.value || "").trim();
      if (neu) DATA.casilleros.push({ codigo: neu, nombre: neu, descripcion: "", orden: DATA.casilleros.length + 1, activo: true, tablero: BOARDS.current });
      persist({ replaceAll: DATA }); closeModal(); start();
    };
  }
  function exportar() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["const DATA = " + JSON.stringify(DATA) + ";\n"], { type: "text/javascript" }));
    a.download = "data.js"; a.click();
  }
  function start() {
    const $ = function (id) { return document.getElementById(id); };
    const list = $("list"), q = $("q"), cas = $("casillero"), est = $("estado");
    if (!list) return;
    if (!DATA || !DATA.asuntos) DATA = emptyData();
    if (!DATA.tareas) DATA.tareas = [];
    if (!DATA.casilleros) DATA.casilleros = [];
    const keepC = cas.value, keepE = est.value, keepQ = q.value;
    cas.innerHTML = '<option value="">Todos los casilleros</option>' + casOpts("");
    est.innerHTML = '<option value="">Todos los estados</option>' + opts([...new Set(DATA.asuntos.map(function (a) { return a.estado; }))].sort(), "");
    cas.value = keepC; est.value = keepE; q.value = keepQ;
    function tareasDe(id) {
      return DATA.tareas.filter(function (t) { return t.asunto === id; }).sort(function (a, b) { return a.orden - b.orden; });
    }
    function match(a) {
      const text = (q.value || "").trim().toLowerCase();
      const blob = [a.id, a.asunto, a.casillero, a.proximo].concat(tareasDe(a.id).map(function (t) { return t.id + " " + t.titulo; })).join(" ").toLowerCase();
      if (text && blob.indexOf(text) < 0) return false;
      if (cas.value && a.casillero !== cas.value) return false;
      if (est.value && a.estado !== est.value) return false;
      return true;
    }
    function render() {
      const items = DATA.asuntos.filter(match);
      const abiertos = DATA.asuntos.filter(function (a) { return String(a.estado).indexOf("Abierto") === 0; }).length;
      const pendT = DATA.tareas.filter(function (t) { return t.estado !== "Hecha"; }).length;
      $("stats").innerHTML = '<span class="chip">' + items.length + " asuntos</span><span class=\"chip\">" + abiertos + " abiertos</span><span class=\"chip\">" + pendT + " tareas pendientes</span>";
      list.innerHTML = "";
      if (!items.length) { list.innerHTML = '<p class="meta">Este tablero está vacío. Sumá un asunto para empezar.</p>'; return; }
      items.forEach(function (a) {
        const ts = tareasDe(a.id);
        const el = document.createElement("article");
        el.className = "asunto";
        el.innerHTML = '<button class="asunto-head" type="button"><div class="row1"><span class="id">' + a.id + '</span><span class="badge">' + a.estado + "</span></div><div class=\"cas\">" + (a.casillero || "") + "</div><h2 class=\"title\">" + a.asunto + "</h2><div class=\"meta\">" + (a.dueno || "") + " · " + ts.length + " tarea" + (ts.length === 1 ? "" : "s") + " · " + (a.proximo || "") + "</div></button><div class=\"tareas\"><div class=\"mini\"><button type=\"button\" class=\"edA ghost\">Editar asunto</button><button type=\"button\" class=\"addT ghost\">+ Tarea</button></div>" +
          (ts.map(function (t) {
            return '<div class="tarea" data-tid="' + t.id + '"><div class="row1"><span class="tid">' + t.id + " · orden " + t.orden + '</span><span class="badge">' + t.estado + "</span></div><div>" + t.titulo + "</div>" +
              (t.depende_de ? '<div class="cond">Depende de ' + t.depende_de + "</div>" : "") +
              (t.comentarios ? '<div class="cond">' + t.comentarios + "</div>" : "") +
              '<button type="button" class="edT ghost">Editar</button></div>';
          }).join("") || '<div class="tarea">Sin tareas.</div>') + "</div>";
        el.querySelector(".asunto-head").addEventListener("click", function () { el.classList.toggle("open"); });
        el.querySelector(".edA").addEventListener("click", function (e) { e.stopPropagation(); formAsunto(a); });
        el.querySelector(".addT").addEventListener("click", function (e) { e.stopPropagation(); formTarea({ asunto: a.id }); });
        el.querySelectorAll(".edT").forEach(function (btn) {
          btn.addEventListener("click", function (e) {
            e.stopPropagation();
            formTarea(DATA.tareas.filter(function (x) { return x.id === btn.closest(".tarea").getAttribute("data-tid"); })[0]);
          });
        });
        list.appendChild(el);
      });
    }
    q.oninput = render; cas.onchange = render; est.onchange = render;
    $("btnAsunto").onclick = function () { formAsunto(null); };
    $("btnTarea").onclick = function () { formTarea(null); };
    $("btnCas").onclick = formCas;
    $("btnExp").onclick = exportar;
    if ($("btnSync")) $("btnSync").onclick = function () { pullSheets().then(function () { start(); }); };
    bindBoardUi();
    render();
  }
})();
