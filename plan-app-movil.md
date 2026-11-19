# Plan: app móvil de Giro Estelar

## Decisión (2026-11-18)

La app es **Kotlin nativo + el mismo juego en Three.js dentro de un WebView**.

- Se probó primero rehacer los gráficos en libGDX: en el celular se veían muy distintos y se descartó. La regla es que **la app debe verse exactamente igual al juego web**, y la única forma de garantizarlo es usar el mismo código 3D.
- Esto cambia lo que decía `plan-de-negocio-juegos.md` (Kotlin + libGDX): Kotlin y Android Studio se mantienen; libGDX no.
- El intento con libGDX quedó apartado en `app/descartado-libgdx/` (no se compila). Se puede borrar.

## Dónde vive cada cosa

```
juego/                      CÓDIGO FUENTE DEL JUEGO (aquí se edita)
  src/                        módulos por responsabilidad (ver "Arquitectura del juego")
  index.html, estilos.css     la página y sus estilos
  build.mjs                   une todo en un solo archivo
  test/                       pruebas (regresión y arquitectura)
demo-juego.html             RESULTADO: un solo archivo, se abre en el navegador y se comparte.
                            Se genera con `npm run build`; no se edita a mano.
probar-sonidos.html         RESULTADO: página con un botón por cada tema de música y cada efecto, para oírlos sueltos.
app/                        App Android (Kotlin). Al compilar copia demo-juego.html.
```

## Cómo trabajamos

1. Un cambio del juego se hace en `juego/src/`.
2. `npm test` (dentro de `juego/`) construye `demo-juego.html` y corre las pruebas.
3. Se prueba en el navegador abriendo `demo-juego.html`, o en el celular compilando la app (que copia ese archivo sola).

La retención se ve después (`plan-retencion-y-negocio-giro-estelar.md`). El multijugador está en `plan-multijugador.md`.

## Pruebas del juego

| Prueba | Qué garantiza |
|---|---|
| **Regresión** (`test/golden.mjs`) | Juega 9 partidas automáticas con el azar y el reloj controlados (unos 3.000 puntos de control: marcador, avisos, ventanas, progreso guardado y cuántos números al azar pidió el juego). Si un cambio de código altera el comportamiento, dice en qué momento exacto. |
| **Arquitectura** (`test/arquitectura.mjs`) | Que las capas no se enreden más: `core` y `platform` no dependen del resto; Three.js solo se usa en `render`; la lógica no llama al sonido. |
| **Sonidos** (`test/sonidos.mjs`) | Que cada aviso del juego tenga su efecto; que cada efecto y cada tema de música se genere, suene y no sature; y que la mezcla en el peor momento (jefe + disparos + explosiones) no distorsione. No puede decir si suena bien: eso se oye. |

Lo que recorren las 9 partidas: menú y cofre con anuncio; Aventura completa (fases, agujeros negros, succión, nitro, turbulencia, jefe intermedio, giro de pantalla, jefe final derrotado); Supervivencia hasta el nivel 35 (casco, giros, vueltas de 360°, arcoíris, cometas, sin tope de naves) y arrancando directo en el nivel 20; Viaje espacial (sectores, vuelta 360°); pelea real contra el jefe (perder, revivir, reintentar); choques, revivir con anuncio, duplicar monedas, pausa y salir.

Cuando un cambio de comportamiento es **intencional** (balance, función nueva), se revisa la diferencia que muestra la prueba y se guarda la nueva referencia con `npm run golden:update`.

Límite: la prueba no mira los píxeles (no dibuja, para tardar 20 segundos y no 20 minutos). Un cambio puramente visual hay que verlo en pantalla.

## Arquitectura del juego (`juego/src/`)

| Capa | Qué contiene | Depende de |
|---|---|---|
| `core/` | Datos de balance, utilidades, curvas de dificultad, perfil, estado compartido | solo `core` y `platform` |
| `platform/` | Puente con el teléfono o el navegador (guardado, vibración) | nada |
| `game/` | Lógica de las partidas: nave, poderes, enemigos, jefes, agujeros negros, portales, modo espacial | `core`, y todavía `ui` y `render` (pendiente) |
| `render/` | Todo lo que es Three.js: motor, pista, modelos, fondo, texturas, dibujo | `core`, `ui/dom` |
| `ui/` | HTML: menú, marcador, flujo de partida, pantallas finales, anuncios, entrada | `core`, `game`, `audio` |
| `audio/` | Efectos de sonido y música, hechos por código | solo `core` |
| `main.js`, `loop.js` | Arranque en orden y bucle principal | todo |

**Primer paso del refactor (hecho, 2026-11-18):** el archivo único de 2.250 líneas se repartió en módulos (41 entonces) sin cambiar el comportamiento. Se hizo con una herramienta automática y se verificó con la prueba de regresión: las 9 partidas salen idénticas antes y después.

**Lo que este paso no arregla todavía** (siguientes pasos, de menor a mayor riesgo):

1. **Estado compartido.** Quedan 27 variables en un objeto global `G` (`core/state.js`). Hay que repartirlas en grupos con dueño: pantalla, partida, cámara y curvas.
2. **La lógica llama a la interfaz.** `game/` importa 15 veces de `ui/` (para mostrar avisos, alertas y el marcador). Debe ser al revés: la lógica avisa "pasó esto" y la interfaz decide cómo mostrarlo.
3. **`game/space.js` usa Three.js.** Separar su lógica de su dibujo, como el resto.
4. **Azar con semilla.** La lógica usa `Math.random()`. Para los retos y el multijugador necesita un generador con semilla propio, separado del azar visual.
5. **Arranque.** Cada módulo expone funciones `boot…()` que `main.js` llama en orden, y variables que se llenan ahí. Es un paso intermedio; el destino es que cada módulo cree y devuelva sus objetos.

## Supervivencia: locura por niveles (2026-11-18, en prueba en el HTML)

Pedido: en el nivel 10 era casi imposible sobrevivir a los disparos; se quería menos disparos, más asteroides y más locura.

| Desde el nivel | Qué pasa |
|---|---|
| 5 | Las naves disparan cada vez más espaciado (el doble de pausa desde el 13) y hay menos naves pesadas. Vueltas de 360°. La pista se curva más seguido. Los colores cambian cada 4 s. Cometas lentos (340 px/s, casi como una roca), uno cada 10–14 s. |
| 7, 10, 13… | Cápsula de reparación 🔧: +20 % de casco si se recoge. (Aparte, cruzar el portal de cada nivel repara 15 % solo.) |
| 10 | Máximo 3 naves a la vez (antes 4, y 5 desde el 20). Colores cada 2 s. Cometas a 580 px/s, cada 7–10 s. |
| 12 | Empiezan a caer más rocas juntas (sube de a poco hasta el nivel 24). |
| 15 | Arcoíris continuo, curvas más fuertes. Cometas a 810 px/s, cada 5–7,5 s. Las rocas aceleran su ritmo. |
| 18, 22, 28 | A veces caen tres rocas juntas, cada vez más seguido. |
| 20 | Cometas a toda velocidad (1050 px/s), cada 4–5,5 s; vueltas dobles de vez en cuando. Desde el 25 a veces vienen dos cometas. |

**Movimientos de pantalla (regulado el 2026-11-18, segunda pasada).** Queja: desde el nivel 7 era muy difícil, con giros demasiado seguidos y sin turbulencia. Ahora, desde el nivel 5, solo un movimiento a la vez (turbulencia, vuelta de 360° o giro de 180°) y después de cada uno un respiro con la pantalla quieta: 5–7 s en los niveles 5–9, 4–6 s en 10–14, 3–4,5 s en 15–19, 2–3 s desde el 20. La turbulencia arranca suave en el 5 y se mece más con cada nivel. Medido: en los niveles 5–14 la pantalla está quieta la mitad del tiempo, con turbulencia un cuarto, y cae una vuelta de 360° cada 40 s; desde el 15, una cada 17 s.

**Meta de dificultad:** jugador promedio hasta el nivel 15, pros hasta 25–30, sin final. Se midió con jugadores automáticos de reflejos limitados (`scratchpad/bot.mjs`, no está en el repositorio): uno calibrado para morir en el nivel 12–14 con el balance viejo (como el récord del usuario, 3:21) ahora muere en el 17–18; uno más hábil, en el 30 o más. El automático no se marea con los giros como una persona, así que la cifra real debería ser algo menor. Falta la opinión del usuario.

**Tercera pasada (2026-11-18).** Con la segunda pasada el usuario no pasaba del nivel 9. Se bajó fuerte:

- `pace()` en `core/difficulty.js`: del nivel 5 al 20 la dificultad de fondo (velocidad, rocas, naves) avanza a la mitad de ritmo; el nivel 9 tiene lo del antiguo nivel 7 y el 15 lo del antiguo 10. Desde el 20 vuelve a apretar.
- Golpes al casco: roca 15 % (antes 18), cometa 15 % (antes 20), nave 18 % (antes 22).
- Respiros más largos (8–11 s en niveles 5–9), turbulencia más rara y suave (arranca en 0,22), vueltas de 360° cada 22–32 s y más lentas (2,6 s), giro de 180° cada 75 % de progreso en vez de 40 %.
- Cometas: 300 px/s y uno cada 14–20 s en niveles 5–9, con 1,9 s de aviso (baja a 1,3 s en el 20).
- La pista casi no se retuerce más que antes hasta el nivel 10.
- Con la pantalla dando una vuelta caen menos rocas.

Los jugadores automáticos resultaron una vara poco fiable (mucho ruido y no se desorientan como una persona): los números de niveles alcanzados de arriba son solo orientativos. La vara real es el usuario.

Consumo con la música grabada (A56, sin cargador): menú 375 mA, jugando nivel 20 623 mA.

Cometas: cruzan en cualquier dirección apuntando a la nave. Avisan 1,3 s antes con el carril pintado en la pista, flechas que corren en el sentido en que vienen y tres pitidos. Golpe: 20 % de casco. No se pueden destruir.

Monedas (Aventura y Supervivencia): de a una o máximo dos seguidas (antes hasta tres).

Los números están en `core/config.js` (niveles, cometas, reparación) y `core/difficulty.js` (disparos, rocas, tramos de locura); las vueltas en `game/screenfx.js`; los cometas en `game/comets.js`; colores en `render/environment.js`; curvas en `render/track.js`.

Para probar niveles altos sin jugar varios minutos: al marcar "Modo demo" en el menú aparece "Supervivencia desde el nivel: 1 · 5 · 10 · 15 · 20".

Está en la app del A56. Sonidos nuevos por juzgar en `probar-sonidos.html`: giro de 360°, aviso de cometa, paso del cometa.

## Sonido

**Carácter pedido (2026-11-18): guerra y metal, no maquinita.** Debe sentirse fuerte y dar emoción.

**Efectos (39, por código).** `audio/synth.js` tiene la receta de cada uno; no hay archivos de audio.

- Disparos: cañones de energía con distorsión. Explosiones: ruido largo que retumba, con escombros. El láser sube de tono y chisporrotea a medida que se sobrecalienta.
- Los avisos musicales (cuenta regresiva, ¡YA!, victoria, derrota, cambio de fase, llegada del jefe) son acordes de guitarra distorsionada con platillo.
- ¡CASI! es un roce; el escape gravitatorio, motores acelerando; el escudo, energía; el arma nueva, un cambio mecánico. La moneda tiene tres opciones pendientes de elegir.
- La lógica no conoce al sonido: avisa con `emit('coin')`, `emit('crash')`… (`core/events.js`) y `audio/sound.js` escucha.
- Para que no aturda: tiempo mínimo entre repeticiones, tope de efectos simultáneos, y todo lo distorsionado pasa por un mismo recorte, así muchos disparos juntos suenan más densos pero no más fuertes de lo que aguanta el parlante.

**Música (por código, sin archivos).** `audio/music.js` tiene las partituras; `audio/guitar.js` y `audio/drums.js`, los instrumentos. Elegido el 2026-11-18, después de probar varias opciones en `probar-sonidos.html`:

| Tema | Cuándo suena | Cómo es |
|---|---|---|
| `doom` | Aventura y Supervivencia, al empezar | Metal industrial: riff pesado con sintetizador distorsionado |
| `metal` | Desde que la partida se pone pesada (el 45 % del avance, donde sale el jefe intermedio) y en todos los jefes | Metal con guitarras simuladas (cuerda + amplificador) |
| `menu` | Menú y fin de partida | Guitarra limpia arpegiada |
| `space` | Viaje espacial | Ambiental. Gustó así: no tocar |
| `boss` | Sin usar | Thrash con guitarras; queda como variante para jefes |

- Descartados: una canción MP3 generada con IA, y dos opciones electrónicas (electrónica oscura y drum & bass).
- Los riffs se escriben como texto, una letra por semicorchea (`'eeE-eeF-eeE-G-F-'`); cambiar la música es cambiar esas letras.
- La música la mueve el bucle del juego, no un temporizador.
- Queda el mecanismo para música de archivo (`audio/song.js`): si existe `juego/musica/partida.mp3`, el build lo mete en la página.

**Forma de trabajo acordada.** El sonido se prueba y se corrige en `probar-sonidos.html`, sonido por sonido; no se instala en el celular hasta que se diga.

**Lección de los efectos.** Un golpe de ruido corto más un tono grave que cae suena a tambor, no a disparo ni a explosión. Los disparos son rayos de energía (tono que cae en picada con timbre metálico) y las explosiones son ruido largo, sin tono, con escombros.

**Motor de la nave.** `audio/engine.js`: un rugido continuo y discreto durante la partida, en todos los modos. Sube con el avance y ruge con el nitro.

**Configuración (2026-11-18, en revisión en el HTML antes de pasarla a la app).** Pantalla ⚙ que se abre desde el menú y desde la pausa: volumen de la música y volumen de los efectos, cada uno graduable de 0 a 100 (0 = apagado), y el tipo de control. Se guarda. Los guardados viejos (sonido encendido/apagado) se convierten solos.

**Menú.** Se quitaron "Practicar jefe final" y el texto de ayuda de abajo. Al jefe se llega jugando la Aventura; desde su pantalla de fin se puede repetir la pelea.

**`probar-sonidos.html`** deja oír los temas de música, el motor y cada efecto, sueltos o unos encima de otros. Cada botón muestra el nombre con el que se pide un cambio.

**Límite.** Todo esto se hizo por números, sin escucharlo: las pruebas garantizan que suena y no satura, no que guste. Se afina con lo que se oiga en el celular.

## Música grabada (2026-11-18, a medio camino)

Objetivo doble: que la música deje de gastar procesador en el teléfono y poder descargarla en MP3.

Cómo funciona:

- `npm run musica` (`tools/grabar-musica.mjs`) toca cada tema de `src/audio/music.js` fuera de línea en el computador y lo guarda en `juego/musica/` con `pistas.json` (dónde se repite cada tema y a qué volumen va).
- Temas y duración de la vuelta: menu 12,6 s · doom 14,5 s (132 pulsos por minuto) · metal 28,1 s (171) · space 58,2 s · boss 10,4 s (solo archivo, no va en el juego).
- Bucle sin corte: se guarda la segunda de dos vueltas, el final se funde con lo que sonaba antes del comienzo y el archivo lleva un margen repetido a cada lado. Comprobado: en el punto de repetición no hay salto.
- El tempo queda fijo por tema (antes subía un 3 % a lo largo de la partida; no se nota).
- `build.mjs` mete los temas dentro de `demo-juego.html`; `src/audio/tracks.js` los reproduce en bucle. Lo que no esté grabado lo sigue tocando `music.js` en vivo.
- `probar-sonidos.html` muestra los temas grabados con botón para oírlos y enlaces para descargarlos.
- La prueba de sonidos falla si se cambia la música de código y no se vuelve a grabar.

Estado: hecho, con MP3 (codificador `@breezystack/lamejs`, solo se usa al grabar). Los cuatro temas del juego pesan 1,5 MB; `demo-juego.html` pasó de 220 KB a 2,3 MB y el APK de 1,6 a 3,1 MB. Instalado en el A56: suena, sin errores, 60 cuadros. Uso de procesador jugando: 211 % → 194 %. El consumo en mA no se pudo medir porque el teléfono estaba cargando; queda pendiente medirlo desconectado.

Si se cambia la música de código: `npm run musica` (graba y vuelve a compilar). Los MP3 para oír o usar fuera del juego están en `juego/musica/` y se descargan también desde `probar-sonidos.html`.

## App Android (`app/`)

```
app/android/
  src/main/assets/game/
    three.min.js         Three.js r128 incluido en la app (no necesita internet)
    index.html           copia generada de demo-juego.html (no se edita, no va a git)
  src/main/kotlin/com/giroestelar/
    application/GameHost.kt        reglas del lado nativo + puertos (Kotlin puro, con pruebas)
    adapters/AndroidAdapters.kt    SharedPreferences, vibrador y el puente con el juego (GiroNative)
    MainActivity.kt                punto de armado: adaptadores, WebView, "atrás", pausa
```

Arquitectura hexagonal en el lado nativo: `GameHost` no conoce Android; solo usa puertos (`GameStateStore`, `Haptics`). AdMob entrará como un puerto más con su adaptador.

| Desde el juego (JavaScript) | Qué hace en Kotlin |
|---|---|
| `GiroNative.loadState()` / `saveState(json)` | Lee y guarda el progreso en SharedPreferences |
| `GiroNative.haptic(ms)` | Vibra (hoy: al chocar) |
| `GiroNative.isDebug()` | Activa el medidor de fluidez en versiones de prueba |

| Desde la app (Kotlin) | Qué hace en el juego |
|---|---|
| `window.__giroBack()` | "Atrás" del sistema: pausa, reanuda o cierra el cofre; si no lo usa, la app se cierra |
| `window.__giroPause()` | Pausa cuando la app sale de pantalla |

## Medición en un celular real (Galaxy A56, pantalla de 120 Hz)

| | Resultado |
|---|---|
| Fluidez | 60 cuadros por segundo fijos (tope puesto a propósito; sin tope daba 90–100) |
| Resolución de dibujo | 823×1613 en calidad alta (densidad 2×) |
| Tamaño del APK de prueba | 1,6 MB |
| Internet para abrir | No hace falta |

## Calor y batería (2026-11-18)

El teléfono se recalentaba. Causa medida: el juego dibujaba tan rápido como aguantara la pantalla (120 Hz), incluso quieto en el menú.

Consumo del A56 (lectura `current now` de `dumpsys battery`; sin el juego, con pantalla encendida, 150–380 mA):

| | Antes | Ahora |
|---|---|---|
| Quieto en el menú | 1.155 mA | 430 mA |
| Jugando Supervivencia nivel 20, calidad alta | 1.231 mA | 779 mA |
| Lo mismo en calidad baja | — | 670 mA |
| Calidad baja y sin sonido | — | 480 mA |

Qué se hizo (`core/perf.js` decide; `loop.js` y `render/engine.js` obedecen):

- **Tope de 60 cuadros por segundo.** La app además le pide a la pantalla 60 Hz (`preferredRefreshRate` en `MainActivity`).
- **Menús, pausa y pantallas finales a media marcha:** la escena de fondo se pinta a 30 (pausa: 10); la lógica sigue igual.
- **Calidad gráfica en Configuración:** Auto, Alta (densidad 2), Media (1,5), Baja (1). Auto empieza en alta y baja un escalón si en partida no llega a 48 cuadros durante 4 s; recuerda dónde quedó.
- **Calor:** cada 5 s el juego le pregunta al teléfono (`GiroNative.heat()` → `PowerManager.currentThermalStatus`; el ahorro de batería cuenta como nivel 1). Nivel 1 → densidad 1,5; nivel 2 → 1,2; nivel 3 o más → densidad 1 y 30 cuadros. Probado con `adb shell cmd thermalservice override-status 2` (y `reset`).

Lo que falta:

- **El sonido es ahora lo que más gasta** (unos 190 mA): la música se genera nota por nota en vivo. Solución en curso: música grabada (ver abajo).
- Calidad baja ahorra poco (14 %) porque el cuello ya no es el dibujo sino el procesador.
- Sin probar en un teléfono de gama baja real. Tampoco el escalón de 30 cuadros por calor severo (no se simuló ese nivel en el teléfono).

## Estado

| Parte | Estado |
|---|---|
| Juego completo dentro de la app (los 3 modos, jefes, agujeros negros, nitro, casco, portales…) | **Hecho** |
| Guardado nativo, vibración, "atrás", pausa al salir, pantalla siempre encendida, pantalla completa, sin conexión | **Hecho** |
| Código del juego en módulos, con pruebas de regresión y de arquitectura | **Hecho (paso 1)** |
| Desenredar estado, lógica↔interfaz y azar con semilla | Pendiente (pasos 1–5 de arriba) |
| AdMob real (banner + anuncios con recompensa) | Pendiente: hoy son los simulados |
| Ícono, nombre e imagen de inicio propios | Pendiente |
| Efectos de sonido (39), música de metal y motor de la nave, todo por código | **Hecho**, afinándose sonido por sonido |
| Configuración: volumen de música y de efectos, y control | **Hecho en el HTML**, falta el visto bueno para pasarla a la app |
| Firma de la app y Android App Bundle para Play Store | Pendiente |
| Calor y batería: tope de 60 cuadros, calidad gráfica ajustable y reacción al calor | Hecho y medido en el A56 |
| Prueba en un teléfono de gama baja real | Pendiente |
| Música pregrabada al abrir (hoy es lo que más gasta) | Propuesto |
| Retención · Multijugador | Después |

## Comandos

Juego (dentro de `juego/`, la primera vez `npm install`):

```
npm run build          # genera ../demo-juego.html y ../probar-sonidos.html
npm test               # construye + arquitectura + sonidos + regresión
npm run golden:update  # guarda nueva referencia (solo si el cambio de comportamiento es intencional)
npm run format         # da formato al código
```

App (dentro de `app/`, o abriéndola en Android Studio):

```
gradlew.bat :android:testDebugUnitTest   # pruebas del lado nativo
gradlew.bat :android:assembleDebug       # APK en android/build/outputs/apk/debug/android-debug.apk
gradlew.bat :android:installDebug        # instala en el celular conectado
```

Para ver la fluidez en una versión de prueba: `adb logcat -s GiroEstelar` muestra una línea `FPS=…` cada 3 segundos.
