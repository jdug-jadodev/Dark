# Plan: modo multijugador en línea (Giro Estelar)

Estado: **en marcha desde el 2026-11-21.** Hechos: la pista con semilla y los retos entre amigos (el paso 1 del orden recomendado). Pendientes: la carrera en vivo con fantasmas y los sabotajes.

## Qué hay hecho (2026-11-21)

**Pista con semilla, en Supervivencia.** Con la misma semilla sale la misma pista en cualquier teléfono; sin semilla todo sigue igual que antes (la prueba de regresión no cambió).

- Todo lo que decide qué sale en la pista pide su azar con nombre propio (`roll('rock')`, `roll('coin')`… en `juego/src/core/util.js`). Hay una fuente por cada cosa (rocas, paredes, monedas, cápsulas, naves, cometas, giros de pantalla, jefe, disparos, botín), para que lo que hace un jugador, como derribar naves, no le cambie las rocas.
- Con semilla la partida avanza a pasos fijos de 1/60 s, así no depende de qué tan rápido sea el teléfono.
- La semilla se fija con `G.nextSeed` antes de empezar Supervivencia (todavía no hay botón: es la base para lo que sigue).
- **Comprobado:** dos partidas con la misma semilla, jugadas de forma distinta y una con el procesador frenado, dejaron idénticas las 240 rocas, 5 paredes, 15 grupos de monedas y 4 cometas que salieron en minuto y medio. Con otra semilla sale otra pista.
- **Límite conocido:** las naves enemigas pueden variar entre jugadores (cuántas salen depende de cuántas siguen vivas), y después del jefe del nivel 10 la pista sigue en el mismo orden pero desfasada según cuánto dure la pelea de cada quien.
- Los modos Aventura y Viaje espacial aún no usan semilla.

**Pista del día: descartada (2026-11-21).** Se hizo (un botón en el lobby, la misma pista para todos ese día, con su tabla) y se quitó el mismo día: al usuario no le gustó. Se veía igual que Supervivencia y no se entendía qué tenía de distinto; él esperaba estilos de pista diferentes. No volver a proponerla.

**Retos entre amigos** (lo que este plan llamaba "retos por enlace"). En Copa, pestaña "Retos":

- *Crear un reto:* se juega una pista nueva; al terminar, el servidor entrega un código de 6 letras y el juego ofrece enviarlo por el chat.
- *Aceptar un reto:* se escribe el código y se juega esa misma pista. El marcador dice contra quién va y su tiempo, y avisa en el momento en que se le supera.
- Cada reto tiene su tabla: pueden jugarlo varios, las veces que quieran.
- Si alguien supera al jugador en uno de sus retos, el botón Copa del lobby muestra un punto rojo y el reto lo dice.
- En vez de enlace se usa un código: el juego no está en una tienda, así que un enlace no tendría a dónde llevar.
- **No hay nave fantasma todavía:** el rival es su tiempo, no su recorrido. El fantasma queda para la carrera en vivo.

Comprobado con dos jugadores contra un servidor local: el segundo recibió exactamente la misma pista que el creador, la tabla del reto los ordenó bien y el aviso de "te superaron" llegó.

**Lo que sigue:** la carrera en vivo (2 a 4 jugadores en la misma pista al mismo tiempo, viéndose como fantasmas) y, encima, los sabotajes. Necesita salas en tiempo real en el servidor.

**Cambios frente a lo escrito abajo:** el juego ya no está en Kotlin sino en JavaScript, así que la semilla vive en `juego/src/core`, no en un `SeededRandom` del dominio. Y como ya hay servidor en Cloudflare (proyecto `back-nave`), las salas en vivo pueden ir directo ahí, sin el prototipo de conexión directa entre celulares.

## Decisión

Modo **"Carrera de supervivencia con sabotajes"**, de 2 a 4 jugadores.

- Todos juegan **la misma pista al mismo tiempo**: mismos obstáculos, en el mismo orden.
- Cada uno juega en su propia pantalla y ve a los demás como **naves fantasma** translúcidas, con su casco y su posición.
- **Gana** el último que queda vivo (o el primero que llega al jefe, como variante).
- **Sabotajes** (la parte de "guerra"): con el nitro o con cápsulas especiales se le lanza a un rival:
  - girarle la pantalla,
  - mandarle una pared de rocas,
  - mandarle un agujero negro,
  - mandarle un escuadrón enemigo.

## Por qué esto y no combate directo

| | Carrera con sabotajes | Combate directo (naves disparándose) |
|---|---|---|
| Qué viaja por internet | Datos livianos: posición, casco, "te mandé un ataque" | Cada bala y cada impacto, en tiempo real |
| Si un mensaje llega 0,5 s tarde | Casi no se nota | Se siente injusto ("yo le di y no contó") |
| Reutiliza lo que ya existe | Supervivencia, casco, nitro, giro, agujeros negros | Hay que diseñar armas y balance nuevos |
| Dificultad técnica | Media | Alta |

## Requisitos técnicos

1. **Pista con semilla (obligatorio desde ya):** los obstáculos hoy salen con `Math.random()`. En la app, todo lo aleatorio del juego debe pasar por un generador con semilla (`SeededRandom` en el dominio), para que con la misma semilla todos vean la misma pista.
2. **Conexión:**
   - Prototipo: conexión directa entre celulares (WebRTC) con un código de sala corto.
   - Producción: servicio de tiempo real (por ejemplo un servidor propio con WebSockets o un servicio administrado), porque la conexión directa falla en algunas redes móviles.
3. **Mensajes mínimos:** `join`, `start(seed)`, `state(x, y, hull, alive)` unas 10 veces por segundo, `sabotage(type, target)`, `dead`.
4. **Trampas:** entre amigos no importa. Para un ranking público habría que validar en servidor.
5. **Arquitectura:** el multijugador entra como un **adaptador** nuevo (`NetworkPort`) en la arquitectura hexagonal de la app; el dominio no cambia.

## Orden recomendado

1. **Retos por enlace** (sin conexión en vivo): se juega y se comparte un enlace del tipo "supera mis 3:42 en esta misma pista" (enlace = semilla + tiempo). Es lo más barato y ayuda a que la gente comparta.
2. **Carrera en vivo con fantasmas**, hasta 4 jugadores.
3. **Sabotajes** encima de la carrera.

Los tres pasos usan la misma base (pista con semilla), así que nada se desperdicia.

## Preguntas abiertas

- ¿Salas solo con código, o también emparejamiento con desconocidos?
- ¿Los sabotajes se ganan con el nitro o con cápsulas propias del multijugador?
- ¿Se puede revivir con anuncio en multijugador? (probablemente no, para que sea justo)
