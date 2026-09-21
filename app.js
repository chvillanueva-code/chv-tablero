(function () {
  const $ = (id) => document.getElementById(id);
  const list = $("list");
  const q = $("q");
  const cas = $("casillero");
  const est = $("estado");

  DATA.casilleros
    .filter((c) => c.activo)
    .sort((a, b) => a.orden - b.orden)
    .forEach((c) => {
      const o = document.createElement("option");
      o.value = c.codigo;
      o.textContent = c.nombre;
      cas.appendChild(o);
    });

  [...new Set(DATA.asuntos.map((a) => a.estado))].sort().forEach((e) => {
    const o = document.createElement("option");
    o.value = e;
    o.textContent = e;
    est.appendChild(o);
  });

  function tareasDe(id) {
    return DATA.tareas
      .filter((t) => t.asunto === id)
      .sort((a, b) => a.orden - b.orden);
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
    const open = DATA.asuntos.filter((a) => a.estado === "Abierto" || a.estado.indexOf("Abierto") === 0).length;
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
        <button class="asunto-head" type="button" aria-expanded="false">
          <div class="row1">
            <span class="id">${a.id}</span>
            <span class="badge ${a.estado}">${a.estado}</span>
          </div>
          <div class="cas">${a.casillero}</div>
          <h2 class="title">${a.asunto}</h2>
          <div class="meta">${a.dueno || ""} · ${ts.length} tarea${ts.length === 1 ? "" : "s"} · ${a.proximo || ""}</div>
        </button>
        <div class="tareas">
          ${ts.map((t) => `
            <div class="tarea ${t.estado}">
              <div class="row1">
                <span class="tid">${t.id} · orden ${t.orden}</span>
                <span class="badge ${t.estado}">${t.estado}</span>
              </div>
              <div>${t.titulo}</div>
              ${t.depende_de ? `<div class="cond">Depende de ${t.depende_de}${t.estado === "Bloqueada" ? " · bloqueada hasta cumplir la previa" : ""}</div>` : ""}
              ${t.comentarios ? `<div class="cond">${t.comentarios}</div>` : ""}
            </div>`).join("") || `<div class="tarea">Sin tareas cargadas.</div>`}
        </div>`;
      const btn = el.querySelector(".asunto-head");
      btn.addEventListener("click", () => {
        const openNow = el.classList.toggle("open");
        btn.setAttribute("aria-expanded", openNow ? "true" : "false");
      });
      list.appendChild(el);
    });
  }

  q.addEventListener("input", render);
  cas.addEventListener("change", render);
  est.addEventListener("change", render);
  render();
})();
