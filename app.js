(function () {
  const KEY = "chv_tablero_ok";
  const STORE = "chv_tablero_data";
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
  function sheetsUrl() { return String(CFG.WEBAPP_URL || "").trim(); }
  function setOrigen(t) {
    const el = document.getElementById("origen");
    if (el) el.textContent = t;
  }
  function persistLocal() {
    try { localStorage.setItem(STORE, JSON.stringify(DATA)); } catch (e) {}
  }
  function persist(extra) {
    persistLocal();
    if (!sheetsUrl()) return;
    fetch(sheetsUrl(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(Object.assign({ token: CFG.TOKEN || PASS }, extra || { replaceAll: DATA }))
    }).then(function () { setOrigen("Guardado en Google Sheets"); })
      .catch(function () { setOrigen("No se pudo escribir en Sheets — queda en este aparato"); });
  }
  function pullSheets() {
    const url = sheetsUrl();
    if (!url) return Promise.resolve(false);
    setOrigen("Leyendo Google Sheets…");
    return fetch(url + "?token=" + encodeURIComponent(CFG.TOKEN || PASS))
      .then(function (r) { return r.json(); })
      .then(function (json) {
        if (json && json.ok && json.data) {
          window.DATA = json.data;
          persistLocal();
          setOrigen("Conectado a Google Sheets");
          return true;
        }
        setOrigen("Sheets no respondió — usando copia local");
        return false;
      })
      .catch(function () {
        setOrigen("Sin conexión a Sheets — copia local");
        return false;
      });
  }
  function showApp() {
    gate.hidden = true;
    app.hidden = false;
    loadData();
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
    } else {
      err.hidden = false;
    }
  });
  document.getElementById("salir").addEventListener("click", function () {
    sessionStorage.removeItem(KEY);
    location.reload();
  });
  function loadData() {
    if (window.DATA) return boot();
    const s = document.createElement("script");
    s.src = "data.js";
    s.onload = boot;
    s.onerror = boot;
    document.body.appendChild(s);
  }
  function boot() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || "");
      if (saved && saved.asuntos) window.DATA = saved;
    } catch (e) {}
    if (!window.DATA) window.DATA = { casilleros: [], asuntos: [], tareas: [] };
    pullSheets().then(function () { start(); });
  }
  function nextAsunto() {
    const n = DATA.asuntos.reduce(function (m, a) {
      const x = parseInt(String(a.id).replace("CHV-", ""), 10);
      return isNaN(x) ? m : Math.max(m, x);
    }, 0);
    return "CHV-" + String(n + 1).padStart(3, "0");
  }
  function nextTarea(aid) {
    const n = DATA.tareas.filter(function (t) { return t.asunto === aid; }).reduce(function (m, t) {
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
    return list.map(function (v) {
      return "<option" + (v === val ? " selected" : "") + ">" + v + "</option>";
    }).join("");
  }
  function casOpts(val) {
    return (DATA.casilleros || []).filter(function (c) { return c.activo; })
      .sort(function (a, b) { return a.orden - b.orden; })
      .map(function (c) {
        return "<option value=\"" + c.codigo + "\"" + (c.codigo === val ? " selected" : "") + ">" + c.nombre + "</option>";
      }).join("");
  }
  function asuOpts(val) {
    return DATA.asuntos.map(function (a) {
      return "<option value=\"" + a.id + "\"" + (a.id === val ? " selected" : "") + ">" + a.id + " · " + a.asunto + "</option>";
    }).join("");
  }
  function formAsunto(a) {
    a = a || { id: nextAsunto(), casillero: "", asunto: "", estado: "Abierto", dueno: "Christian", proximo: "", notas: "" };
    openModal("<h3>" + (DATA.asuntos.some(function (x) { return x.id === a.id; }) ? "Editar" : "Nuevo") + " asunto</h3><form id=\"fA\"><label>Código<input name=\"id\" value=\"" + a.id + "\" readonly></label><label>Casillero<select name=\"casillero\">" + casOpts(a.casillero) + "</select></label><label>Asunto<input name=\"asunto\" required value=\"" + (a.asunto || "") + "\"></label><label>Estado<select name=\"estado\">" + opts(EST_A, a.estado) + "</select></label><label>Dueño<input name=\"dueno\" value=\"" + (a.dueno || "") + "\"></label><label>Próximo<input name=\"proximo\" value=\"" + (a.proximo || "") + "\"></label><label>Notas<textarea name=\"notas\">" + (a.notas || "") + "</textarea></label><div class=\"rowbtns\"><button type=\"submit\">Guardar</button><button type=\"button\" data-close class=\"ghost\">Cancelar</button></div></form>");
    document.getElementById("fA").onsubmit = function (e) {
      e.preventDefault();
      const fd = new FormData(e.target);
      const row = { id: fd.get("id"), casillero: fd.get("casillero"), asunto: fd.get("asunto"), estado: fd.get("estado"), dueno: fd.get("dueno"), proximo: fd.get("proximo"), notas: fd.get("notas"), carpeta: a.carpeta || "", link: a.link || "", cuenta: a.cuenta || "oficina" };
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
      e.preventDefault();
      const fd = new FormData(e.target);
      const asunto = fd.get("asunto");
      const row = { id: t.id || nextTarea(asunto), asunto: asunto, orden: Number(fd.get("orden") || 1), titulo: fd.get("titulo"), estado: fd.get("estado"), depende_de: fd.get("depende_de"), comentarios: fd.get("comentarios") };
      const i = DATA.tareas.findIndex(function (x) { return x.id === row.id; });
      if (i >= 0) DATA.tareas[i] = row; else DATA.tareas.push(row);
      persist({ tarea: row }); closeModal(); start();
    };
  }
  function formCas() {
    openModal("<h3>Casilleros</h3><form id=\"fC\">" + DATA.casilleros.sort(function (a, b) { return a.orden - b.orden; }).map(function (c, i) {
      return "<div class=\"casrow\"><input name=\"nombre\" data-i=\"" + i + "\" value=\"" + c.nombre + "\"><input name=\"orden\" type=\"number\" data-i=\"" + i + "\" value=\"" + c.orden + "\" style=\"width:70px\"><label class=\"chk\"><input type=\"checkbox\" name=\"activo\" data-i=\"" + i + "\"" + (c.activo ? " checked" : "") + "> activo</label></div>";
    }).join("") + "<label>Nuevo casillero<input name=\"nuevo\" placeholder=\"Ej. 4 CONSULTORÍA\"></label><div class=\"rowbtns\"><button type=\"submit\">Guardar</button><button type=\"button\" data-close class=\"ghost\">Cancelar</button></div></form>");
    document.getElementById("fC").onsubmit = function (e) {
      e.preventDefault();
      sheet.querySelectorAll("input[name=nombre]").forEach(function (inp) {
        const i = Number(inp.getAttribute("data-i"));
        DATA.casilleros[i].nombre = inp.value.trim() || DATA.casilleros[i].nombre;
        DATA.casilleros[i].codigo = DATA.casilleros[i].nombre;
      });
      sheet.querySelectorAll("input[name=orden]").forEach(function (inp) {
        DATA.casilleros[Number(inp.getAttribute("data-i"))].orden = Number(inp.value || 1);
      });
      sheet.querySelectorAll("input[name=activo]").forEach(function (inp) {
        DATA.casilleros[Number(inp.getAttribute("data-i"))].activo = inp.checked;
      });
      const neu = (e.target.nuevo.value || "").trim();
      if (neu) DATA.casilleros.push({ codigo: neu, nombre: neu, descripcion: "", orden: DATA.casilleros.length + 1, activo: true });
      persist({ replaceAll: DATA }); closeModal(); start();
    };
  }
  function exportar() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["const DATA = " + JSON.stringify(DATA) + ";\n"], { type: "text/javascript" }));
    a.download = "data.js";
    a.click();
  }
  function start() {
    const $ = function (id) { return document.getElementById(id); };
    const list = $("list"), q = $("q"), cas = $("casillero"), est = $("estado");
    if (!DATA || !DATA.asuntos) window.DATA = { casilleros: [], asuntos: [], tareas: [] };
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
      $("stats").innerHTML =
        '<span class="chip">' + items.length + " asuntos</span>" +
        '<span class="chip">' + abiertos + " abiertos</span>" +
        '<span class="chip">' + pendT + " tareas pendientes</span>";
      list.innerHTML = "";
      items.forEach(function (a) {
        const ts = tareasDe(a.id);
        const el = document.createElement("article");
        el.className = "asunto";
        el.innerHTML =
          '<button class="asunto-head" type="button">' +
          '<div class="row1"><span class="id">' + a.id + '</span><span class="badge">' + a.estado + "</span></div>" +
          '<div class="cas">' + (a.casillero || "") + "</div>" +
          '<h2 class="title">' + a.asunto + "</h2>" +
          '<div class="meta">' + (a.dueno || "") + " · " + ts.length + " tarea" + (ts.length === 1 ? "" : "s") + " · " + (a.proximo || "") + "</div>" +
          "</button><div class="tareas"><div class="mini">" +
          '<button type="button" class="edA ghost">Editar asunto</button>' +
          '<button type="button" class="addT ghost">+ Tarea</button></div>' +
          (ts.map(function (t) {
            return '<div class="tarea" data-tid="' + t.id + '">' +
              '<div class="row1"><span class="tid">' + t.id + " · orden " + t.orden + '</span><span class="badge">' + t.estado + "</span></div>" +
              "<div>" + t.titulo + "</div>" +
              (t.depende_de ? '<div class="cond">Depende de ' + t.depende_de + "</div>" : "") +
              (t.comentarios ? '<div class="cond">' + t.comentarios + "</div>" : "") +
              '<button type="button" class="edT ghost">Editar</button></div>';
          }).join("") || '<div class="tarea">Sin tareas.</div>') +
          "</div>";
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
    render();
  }
})();
