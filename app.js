(function () {
  const KEY = "chv_tablero_ok";
  const USER = "chv";
  const PASS = "210078";

  const gate = document.getElementById("gate");
  const app = document.getElementById("app");
  const form = document.getElementById("login");
  const err = document.getElementById("err");

  function showApp() {
    gate.hidden = true;
    app.hidden = false;
    loadData();
  }

  if (sessionStorage.getItem(KEY) === "1") showApp();

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const u = document.getElementById("user").value.trim().toLowerCase();
    const p = document.getElementById("pass").value;
    if (u === USER && p === PASS) {
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
    if (window.DATA) return start();
    const s = document.createElement("script");
    s.src = "data.js";
    s.onload = start;
    document.body.appendChild(s);
  }

  function start() {
    const $ = (id) => document.getElementById(id);
    const list = $("list");
    const q = $("q");
    const cas = $("casillero");
    const est = $("estado");
    cas.innerHTML = '<option value="">Todos los casilleros</option>';
    est.innerHTML = '<option value="">Todos los estados</option>';

    DATA.casilleros.filter((c) => c.activo).sort((a, b) => a.orden - b.orden).forEach((c) => {
      const o = document.createElement("option");
      o.value = c.codigo; o.textContent = c.nombre; cas.appendChild(o);
    });
    [...new Set(DATA.asuntos.map((a) => a.estado))].sort().forEach((e) => {
      const o = document.createElement("option");
      o.value = e; o.textContent = e; est.appendChild(o);
    });

    function tareasDe(id) {
      return DATA.tareas.filter((t) => t.asunto === id).sort((a, b) => a.orden - b.orden);
    }
    function match(a) {
      const text = (q.value || "").trim().toLowerCase();
      const ts = tareasDe(a.id);
      const blob = [a.id, a.asunto, a.casillero, a.proximo, ...ts.map((t) => t.id + " " + t.titulo)].join(" ").toLowerCase();
      if (text && !blob.includes(text)) return false;
      if (cas.value && a.casillero !== cas.value) return false;
      if (est.value && a.estado !== est.value) return false;
      return true;
    }
    function render() {
      const items = DATA.asuntos.filter(match);
      const open = DATA.asuntos.filter((a) => a.estado.indexOf("Abierto") === 0).length;
      const pendT = DATA.tareas.filter((t) => t.estado !== "Hecha").length;
      $("stats").innerHTML =
        `<span class="chip">${items.length} asuntos</span>` +
        `<span class="chip">${open} abiertos</span>` +
        `<span class="chip">${pendT} tareas pendientes</span>`;
      list.innerHTML = "";
      items.forEach((a) => {
        const ts = tareasDe(a.id);
        const el = document.createElement("article");
        el.className = "asunto";
        el.innerHTML = `
          <button class="asunto-head" type="button">
            <div class="row1"><span class="id">${a.id}</span><span class="badge ${a.estado}">${a.estado}</span></div>
            <div class="cas">${a.casillero}</div>
            <h2 class="title">${a.asunto}</h2>
            <div class="meta">${a.dueno || ""} · ${ts.length} tarea${ts.length === 1 ? "" : "s"} · ${a.proximo || ""}</div>
          </button>
          <div class="tareas">${ts.map((t) => `
            <div class="tarea ${t.estado}">
              <div class="row1"><span class="tid">${t.id} · orden ${t.orden}</span><span class="badge ${t.estado}">${t.estado}</span></div>
              <div>${t.titulo}</div>
              ${t.depende_de ? `<div class="cond">Depende de ${t.depende_de}</div>` : ""}
              ${t.comentarios ? `<div class="cond">${t.comentarios}</div>` : ""}
            </div>`).join("") || `<div class="tarea">Sin tareas.</div>`}</div>`;
        el.querySelector(".asunto-head").addEventListener("click", () => el.classList.toggle("open"));
        list.appendChild(el);
      });
    }
    q.addEventListener("input", render);
    cas.addEventListener("change", render);
    est.addEventListener("change", render);
    render();
  }
})();
