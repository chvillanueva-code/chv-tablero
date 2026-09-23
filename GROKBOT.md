# Protocolo GROKBOT — Tablero CHV

Sitio: https://chvillanueva-code.github.io/chv-tablero/
Planilla: `1a4_ryH0pv0SleJzlSHgFI6JrjAmMJbl8FZdaPb7epR8`
App Script: `https://script.google.com/macros/s/AKfycbz2ciT4vVQIEkB1uq-sapd3wn6pUXxexzlWpv9_MCdkgXsp27xIw2tPX4y4g2vQdF7CYA/exec`
Código puente: `apps-script/Code.gs`

## Para qué es
Agenda operativa de CHV Inmobiliaria. No es un Excel de consulta: es la lista viva de **asuntos** (expedientes / temas) y **tareas** (pasos). GROKBOT lee, propone, carga y actualiza. Christian confirma en pantalla.

## Quién entra
| Usuario | Clave | Rol |
| CHV | 250578 | Titular / oficina |
| MLV | 250578 | Equipo |

Usuarios nuevos: hoja `Param_Usuarios` (`usuario`, `clave`, `nombre`).
Cada usuario ve solo lo suyo + lo que le compartieron.

## Unidades
1. **Tablero** — contenedor (CABEZA = trabajo diario oficina; HOGAR, Hobbies, etc.).
2. **Casillero** — bandeja / tipo (parametrizable por tablero).
3. **Asunto** — tema padre. Código: 3 letras del tablero + correlativo (`CAB-001`, `HOB-001`).
4. **Tarea** — paso hijo. Código: `{asunto}-01`, `-02`… Orden = prelación. `depende_de` = condición.

## Hojas de la planilla
- `Tableros` — id, nombre, descripcion, usuario
- `Param_Casilleros` — + columnas `tablero`, `usuario`
- `Asuntos` — id, casillero, asunto, estado, dueno, proximo, carpeta, link, cuenta, notas, fecha, tablero, usuario
- `Tareas` — id, asunto, orden, titulo, estado, depende_de, comentarios, fecha, tablero, usuario
- `Compartidos` — espejo (no copiar filas)
- `Param_Usuarios`

Filas viejas sin `usuario` se tratan como **CHV**.

## Cómo trabaja GROKBOT
1. Preguntar **usuario** y **tablero** si no están dichos (default CHV / CABEZA).
2. No inventar códigos: el sitio genera el siguiente.
3. Un asunto = un tema. Lo accionable va en tareas.
4. Estados asunto: Abierto / Abierto — aclarar / Pendiente aclarar / Casi cerrado / Hecha.
5. Estados tarea: Pendiente / Bloqueada / Hecha.
6. Si pide “agenda de hoy”: listar asuntos Abiertos + tareas Pendiente del tablero activo, ordenadas.
7. Si pide alta: armar asunto + primera tarea, casillero existente o crear casillero.
8. Si pide “compartir con MLV”: asunto entero (`tareas=*`) o IDs sueltos; tablero destino (default `cabeza` de MLV). Espejo: se edita la fila dueña.
9. No borrar masivo. No pisar otro usuario. No duplicar Excel.
10. Cambios de UI van al repo GitHub (`index.html`, `styles.css`, `app.js`, `config.js`). Cambios de datos van a Sheets vía el sitio o el Script. Si cambia el Script, Christian reimplementa la app web y pega la URL nueva en `config.js`.

## Frases útiles del titular
- “Sumá un asunto en CABEZA…” → alta CHV / cabeza.
- “Pasale esto a MLV” → share espejo.
- “Qué tengo pendiente” → filtro Pendiente / Abierto.
- “Cerrá la tarea X” → estado Hecha.
