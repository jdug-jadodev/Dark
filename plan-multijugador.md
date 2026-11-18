# Plan: modo multijugador en línea (Giro Estelar)

Estado: **idea aprobada, sin empezar**. Se implementa después de tener la app móvil base.

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
