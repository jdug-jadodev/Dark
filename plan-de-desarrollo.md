# Plan de desarrollo — Giro Estelar

**Para qué es este documento:** el orden en que se construye lo que sigue después del juego base. Acordado el 2026-11-20. Los detalles de negocio están en [plan-retencion-y-negocio-giro-estelar.md](plan-retencion-y-negocio-giro-estelar.md), los del multijugador en [plan-multijugador.md](plan-multijugador.md) y el estado técnico en [plan-app-movil.md](plan-app-movil.md).

## Meta

Que quien probó el juego vuelva cada día, sin complicarlo y sin patrones que hagan daño.

## Decisiones

- **No se agregan modos nuevos por ahora.** Los tres que hay (Aventura, Supervivencia, Viaje espacial) gustaron. Lo que hace volver es que cada día haya algo distinto que hacer con ellos.
- **Las piezas de la nave son solo apariencia.** Ninguna da ventaja. Es obligatorio para que el multijugador sea justo.
- **Las piezas no se descargan de un servidor.** La nave se dibuja con números en el código: todo el dibujo ocupa unos pocos KB y solo se construyen las piezas que el jugador lleva puestas. Descargar bajo demanda rompería el juego sin conexión.
- **Cloudflare se usa para el multijugador** (salas) y más adelante para la copa semanal, no para las piezas.
- **Todo se prueba primero en el HTML** y después pasa a la app.

## Lo que no se usa

- Perder todo el progreso por faltar un día.
- Vidas o energía que obligan a esperar.
- Cajas sorpresa pagadas.
- Más de un recordatorio al día.
- Piezas o compras que den ventaja.

## Orden de trabajo

| Paso | Qué | Estado |
|---|---|---|
| 1 | Piezas de nave, Taller y Lobby | **Hecho en el HTML (2026-11-20), falta el visto bueno** |
| 2 | Día real, misiones diarias y nivel de piloto | **Cofre, racha y misiones hechos en el HTML (2026-11-20)**; falta el nivel de piloto |
| 3 | Pista con semilla y retos por enlace | **Hecho (2026-11-21):** pista con semilla y retos con código. La pista del día se hizo y se descartó. Ver `plan-multijugador.md` |
| 4 | Multijugador en vivo | Pendiente |
| 5 | Recordatorio diario y medición de retorno (Android) | Pendiente |
| 6 | Tienda de pago: monedas y sin anuncios | **Hecho en el HTML con pago simulado**; falta el cobro real |

Los pasos 1 y 2 funcionan sin internet y sin servidor.

### Paso 1 — Piezas de nave, Taller y Lobby

**La nave tiene 11 ranuras** y cada una se cambia por separado:

| Ranura | Qué cambia |
|---|---|
| Nave | Armable (con las piezas de abajo) o una **nave única**: un vehículo entero con su propio modelo |
| Casco | Forma del fuselaje |
| Trompa | La punta de adelante: de avión, de carro, de camión, de tren, de tiburón, taladro, dragón… |
| Alas | Forma de las alas (delta, gaviota, biplano, en equis, de ángel…) |
| Alerón | La cola: en V, en T, en H, de tiburón, alerón de carro… |
| Pintura | Color de la nave y del fuselaje |
| Cabina | Forma y color del parabrisas |
| Motor | Cuántos, de qué tamaño y de qué tipo (toberas, hélices, rotor, motor de carro…) |
| Llama | Color y estilo del fuego |
| Armas | Aspecto de los cañones y de los disparos |
| Boom | Cómo revienta la nave al perder |

- Lo que se guarda del jugador son las piezas que tiene y las 11 que lleva puestas (un nombre por ranura). En multijugador eso mismo es lo que se envía para que los demás vean la nave.
- Cada pieza tiene una rareza (común, rara, épica, legendaria) que decide su precio en monedas. En el paso 2 parte de las piezas pasan a ser premio de nivel, misiones o racha.
- Catálogo actual: 298 piezas (10 naves, 16 cascos, 28 trompas, 27 alas, 18 alerones, 63 pinturas, 20 cabinas, 25 motores, 57 llamas, 27 armas, 7 explosiones). Todo está en la app del A56.
- **Naves únicas (2026-11-20), pedidas por el dueño como lo que de verdad hace volver:** Clásico espacial, Avión de combate, Carro de helados, Patito de hule, Tiburón espacial, Platillo con extraterrestre, Unicornio, Dragón espacial y Trineo de Papá Noel. Son vehículos enteros, varios con partes que se mueven (el dragón bate las alas, el unicornio galopa, las luces del platillo giran). Rareza "Única": 10.000 monedas (precio fijado por el dueño el 2026-11-20).
- El dueño vio la primera versión y la rechazó por verse hecha a la carrera para ser premium. Seis se rehicieron con mucho más detalle (`render/models/vehiclesPro.js`): carro clásico, carro de helados, tiburón, unicornio, dragón y trineo. Quedan con el modelo sencillo el avión, el platillo y el patito. Criterio para las que vengan: siluetas de verdad, muchas piezas pequeñas, cromo que refleja y partes que se mueven.
- Para que tanto detalle no pese, las piezas quietas de cada nave única se juntan en pocas mallas al construirla.
- Una nave única reemplaza casco, trompa, alas, alerón, pintura, cabina y motor; sigue usando llama, armas y explosión. Equipar una pieza del cuerpo devuelve a la nave armable.
- **Pinturas míticas** (2.500 monedas), que se mueven solas: Aurora boreal, Eclipse, Eclipse azul, Cristal vivo, Cosmos, Fuego vivo, Oro líquido y Arcoíris neón.
- **Paquetes temáticos** de las naves únicas: piezas que les van y se compran aparte con monedas (900 cada una). Trineo: Cajitas de regalo (disparo) y Camino de elfos. Platillo: Rayo alienígena (disparo) y Vacas abducidas (camino). El taller lo avisa al mirar la nave. Faltan los paquetes de las demás.
- **Caminos con banderas** (450 monedas): 15 países (Colombia, México, Argentina, Brasil, Venezuela, Ecuador, Perú, Chile, Bolivia, España, EE. UU., Francia, Italia, Alemania, Japón) y la del orgullo. Las franjas van a lo ancho del camino.
- Ideas de más naves únicas: por temporada (Halloween, Navidad), animales, vehículos de la vida real.
- El Trineo de Papá Noel está disponible siempre; falta decidir si se vuelve de temporada.
- Casco, alas y alerones se combinan libremente: cualquier fuselaje con cualquier ala y cualquier cola.
- Motores que no son toberas: hélices, avioneta (hélice en la nariz), ventiladores, rotor de helicóptero, motor V8 de carro, escapes de carro y anillo reactor.
- Pinturas especiales: tornasol (cambia de color según el ángulo), prisma, arcoíris, espectro (translúcida), holograma, neón que late, escarcha, lava y metales que reflejan (cromo, oro, cobre, obsidiana).
- Llamas con formas y ritmos distintos (aguja, postquemador, cristal, rombos de choque, estrobo) y **estelas**: una cinta de luz que queda atrás como un camino y sigue los movimientos de la nave.
- Caminos de figuras: la nave va soltando estrellas, corazones, notas musicales, copos de nieve, burbujas, chispas, rayos, huellas o píxeles.
- En Alas existe "Sin alas", para que la nave quede como un cohete.
- Armas con disparos de láser, flechas, bombas, aros, corazones, estrellas y cosas al azar (patitos, pizzas, balones, caja sorpresa).
- Las explosiones gustaron como están (2026-11-20): no tocarlas.
- Precios de prueba, sin afinar: común 80, rara 200, épica 450, legendaria 900 monedas. El jugador empieza con 100.

**Taller rediseñado (2026-11-20, en el HTML, pendiente del visto bueno para pasarlo a la app):** las 11 ranuras se reparten en 4 grupos (Nave, Cuerpo, Estilo, Combate); se elige el grupo y luego la ranura, que muestra cuántas piezas se tienen. Sobre la nave hay flechas para pasar de pieza en pieza, una placa con el nombre y la rareza, y un dado que arma una nave al azar con lo que se tiene. La lista tiene filtro "Todas / Mías" y se agranda tocando la barrita de arriba. Aspecto de cabina: bordes de luz, líneas de escáner y color por rareza.

**Taller (lo que se mantiene):** la nave en 3D arriba, quieta: solo se gira con el dedo (el giro automático incomodaba y se quitó, igual que el vaivén del lobby). Al abrir Cabina se acomoda una vez de frente, y en Motores y Llama, de espaldas. Abajo, una pestaña por ranura y las piezas en tarjetas. Al tocar una pieza se ve puesta al instante aunque esté bloqueada, y el botón dice si se puede equipar, cuánto cuesta o cuánto falta.

**Lobby (menú principal):** la nave con lo que el jugador lleva puesto en el centro, volando sobre la pista. Arriba monedas y racha, y dos botoncitos: Métricas (récords, racha, piezas) y Configuración. A un lado Taller, Cofre, Misiones (con calendario) y Tienda. Abajo los tres modos. Se limpió el 2026-11-20: los récords ya no van escritos arriba.

**Rendimiento:** el lobby usa la misma escena del juego (no hay una segunda escena) y se dibuja a 30 cuadros por segundo, igual que el menú anterior.

**Cómo quedó hecho:**

- `juego/src/core/parts.js` es el catálogo: agregar una pieza es agregar un renglón.
- `core/garage.js` sabe qué piezas tiene el jugador y cuáles lleva puestas. Solo se guarda lo comprado y lo equipado; un guardado viejo sigue sirviendo.
- `render/models/ship.js` arma la nave con las piezas. `ui/garage.js` es el taller y `game/showroom.js` los disparos y la explosión de muestra.
- En el taller, la pestaña Armas muestra la nave de frente disparando las tres armas, y la pestaña Explosión revienta la nave al tocar cada una.
- Con "Modo demo" marcado en el lobby se puede equipar cualquier pieza sin comprarla, para verlas todas.
- Las partidas no cambiaron: la prueba de regresión da idéntico en los 9 escenarios con la nave de serie.

**En la app (2026-11-20):** instalado en el Galaxy A56. No hubo que cambiar nada de la parte Android. Pinturas especiales, metales que reflejan y estelas se ven bien en el teléfono.

**Medición en el A56** (Supervivencia desde el nivel 20, 5 minutos y medio, con pintura Espectro y estela de corazones, calidad automática):

- 60 cuadros por segundo en 109 de 110 tramos de 3 segundos; el otro, 59. La calidad automática no tuvo que bajar la nitidez.
- Chip de 40 °C a 42 °C y ahí se estabilizó; carcasa de 34,7 °C a 35,9 °C. El teléfono nunca avisó de calor (nivel 0).
- Lobby y taller: 60 cuadros, chip a 36 °C.
- El teléfono estaba cargando, y cargar calienta por sí solo: sin cargador debería calentar igual o menos. Por lo mismo no se pudo medir el gasto de batería.

**Falta en este paso:** medir el gasto de batería del lobby sin cargador (el menú anterior gastaba 375 mA), afinar precios y probar en un teléfono de gama baja.

### Paso 2 — Día real, misiones y nivel de piloto

**Hecho en el HTML (2026-11-20):**

- **Cofre diario de verdad:** uno por día, con calendario de 7 días a la vista (30, 40, 50, 70, 90, 120 y 250 monedas). El día 7 regala además una pieza rara o épica que el jugador no tenga. Se puede duplicar con anuncio.
- **Racha real:** cuenta los días seguidos. Faltar un día la hace retroceder un paso, no la borra; tras muchos días sin entrar llega a cero.
- **Tres misiones que cambian cada día**, una por modo (Aventura, Supervivencia, Viaje espacial), elegidas por la fecha. 60 monedas cada una y 150 más por completar las tres. Se ven en el lobby ("Misiones de hoy 1/3"), en su ventana y al terminar cada partida.
- En el lobby, el cofre lleva un punto rojo cuando está por abrir.
- Las partidas en modo demo no cuentan para las misiones.
- La misión falsa de "esquiva 50" se quitó. La racha falsa de 3 días de los perfiles viejos arranca en cero.
- Las reglas están en `juego/src/core/daily.js` (premios y lista de misiones se cambian ahí) y las pantallas en `ui/daily.js`.
- Probado simulando 21 días en el navegador. Las partidas no cambiaron: la prueba de regresión solo difiere en los textos del menú, del cofre y del fin de partida.

**Lo que sigue de este paso:**

1. **Nivel de piloto:** cada partida da experiencia y siempre se ve qué pieza se desbloquea después.
2. **Pantalla de fin que invite a otra partida:** mostrar lo cerca que quedó el jugador de su récord o de una misión.
3. **Regla loca del día** (opcional): Supervivencia con un cambio distinto cada día.

### Paso 3 — Pista con semilla y retos por enlace

- Que la misma semilla produzca la misma pista. Es requisito de todo el multijugador.
- Avance ya hecho: el azar de los adornos (llamas, explosión de la nave) va aparte del azar de la partida, así que el aspecto de la nave no cambia lo que sale en la pista.
- Retos por enlace: "supera mis 3:42 en esta misma pista". Casi no necesitan servidor.

### Paso 4 — Multijugador en vivo

Según [plan-multijugador.md](plan-multijugador.md): carrera de supervivencia con naves fantasma en salas con código entre amigos, y después los sabotajes. Salas en Cloudflare. Emparejar con desconocidos queda para cuando haya suficientes jugadores conectados a la vez.

### Paso 5 — Recordatorio y medición (Android)

- Un recordatorio al día como máximo, que se pueda apagar ("tu cofre está listo").
- Registrar cuánta gente vuelve al día siguiente y a la semana. Hoy el juego no mide nada.

### Paso 6 — Tienda de pago (decidido el 2026-11-20)

**Decisión del dueño:** no se venden skins. Se venden **monedas** (para llegar a las piezas más caras) y **quitar los anuncios**. Todo muy barato. Las ideas anteriores (skins completas, "Color a tu gusto", paquete Fundador) quedan descartadas por ahora.

**Qué se vende** (precios de prueba, se cambian en `juego/src/core/shop.js`):

| Producto | Precio | Qué recibe |
|---|---:|---|
| Bolsa de monedas | 1.000 | 1.200 monedas (una pieza legendaria y sobra) |
| Saco de monedas | 2.000 | 2.800 monedas (rinde 17 % más) |
| Cofre de monedas | 5.000 | 8.000 monedas (rinde 33 % más) |
| Sin anuncios por 30 días | 1.000 | Durante 30 días se quita la franja de anuncios y las recompensas (revivir, duplicar monedas, duplicar cofre) se reciben sin ver videos. Se puede renovar: cada compra suma 30 días |
| Sin anuncios para siempre | 3.000 | Lo mismo, sin vencimiento |

- Nada da ventaja: las monedas solo compran piezas de apariencia.
- Las monedas y el mes sin anuncios se pueden comprar las veces que se quiera; "para siempre", una sola vez (y con él ya no se ofrece el mes).
- Precios de anuncios decididos por el dueño el 2026-11-20: mes a 1.000 y para siempre a 3.000.
- Por qué es viable: un video con recompensa deja entre 8 y 14 pesos (en Latinoamérica paga entre 2 y 3,4 dólares por mil vistas en Android, [según Appodeal y Playio](https://blog.playio.co/mobile-game-ecpm-benchmarks-2026); dólar supuesto a 4.000). Los 3.000 pesos equivalen a entre 150 y 320 videos vistos por la misma persona: solo se pierde con quien jugaría a diario varios meses, y para esos está el mes renovable.

**Hecho en el HTML (2026-11-20), con el pago simulado:** botón Tienda en el lobby (también al tocar las monedas), y en el taller el botón "Te faltan 🪙 X · Tienda" lleva a la tienda y al volver ya deja comprar. Probado de punta a punta en el navegador. Falta pasarlo a la app y, sobre todo, el cobro real.

**Datos comprobados de Google Play:**

- En Colombia se puede cobrar desde 221 pesos, así que 1.000 pesos es un precio permitido ([tabla de precios por país](https://support.google.com/googleplay/android-developer/answer/138294)).
- Google se queda con el 15 % del primer millón de dólares al año, para quien se inscribe en ese programa ([comisión de servicio](https://support.google.com/googleplay/android-developer/answer/112622)). Google anunció un modelo nuevo de comisiones que entra por regiones: hay que revisarlo al crear la cuenta.
- **Sin comprobar:** cuánto se va en IVA. Si el IVA va incluido en el precio, de cada 1.000 pesos quedarían cerca de 700; si no, cerca de 850.

**Cosas por resolver antes de cobrar de verdad:**

1. **Que las monedas valgan la pena.** Todo el catálogo cuesta 88.300 monedas y una legendaria 900. El dueño, jugando, juntó unas 9.500 en dos días: si a los jugadores les sobran monedas, nadie las compra. Hay que medir cuántas gana un jugador normal por partida y, si hace falta, subir el precio de las piezas más raras o crear un nivel por encima de legendaria.
2. **Que lo comprado no se pierda.** El progreso se guarda solo en el teléfono. "Sin anuncios" lo puede devolver Google al reinstalar, pero las monedas compradas y las piezas no. La app tiene activada la copia de seguridad de Android, que suele restaurar el guardado al reinstalar con la misma cuenta; hay que probarlo antes de vender.
3. **"Sin anuncios" necesita anuncios reales.** Hoy los anuncios son simulados: primero va AdMob.
4. **El mes se cuenta con el reloj del teléfono.** En el HTML basta; con el cobro real conviene usar la fecha de compra que da Google, para que no se alargue cambiando la hora del teléfono.
5. **El cobro real:** cuenta de desarrollador de Google Play con perfil de pagos, la app subida al menos a pruebas internas (sin eso no se pueden probar compras), y la biblioteca de pagos de Google Play en la parte Kotlin con un puente para que el juego pida "comprar" y reciba "comprado".

**Cuentas honestas:** la primera señal de 20.000 pesos al mes equivale a unas 28 compras de 1.000 (bolsas o meses sin anuncios) o 9 "para siempre", y en los juegos gratis suele comprar solo una minoría pequeña de los jugadores.

## Plan de retención, segunda parte (acordado el 2026-11-20)

**Diagnóstico:** de los cinco motivos por los que se vuelve a un juego así, ya están el hábito diario (cofre, racha, misiones) y la colección (piezas y naves únicas). Faltan: que el juego llame a quien no lo abrió, competir con alguien, y saber si funciona.

**Decisión sobre Aventura:** no se le invierte más. Queda como entrada para el jugador nuevo. Lo mejor que tiene, los jefes, pasa a Supervivencia. Tampoco se hacen mapas a mano por ahora.

Se ejecuta en este orden, uno por uno:

| # | Qué | Estado |
|---|---|---|
| R1 | Recordatorio diario y medición | **Hecho (2026-11-20).** Falta ver el aviso en un teléfono real |
| R2 | Copa semanal entre amigos | **Hecho y publicado (2026-11-20)** |
| R3 | Meta a la vista (la pieza que el jugador quiere) | **Hecho (2026-11-20).** Se quitó la invitación "Elige tu meta" del lobby: se sentía como una tarea. Queda opcional, desde el taller |
| R4 | Eventos con fecha | **Hecho (2026-11-20)** |
| R5 | Jefes en Supervivencia | **Hecho (2026-11-20).** Los números de aguante y tiempo son una primera propuesta: hay que ajustarlos jugando |

**El servidor está publicado** desde el 2026-11-20 en `https://giro-estelar.giro-estelar-servidor.workers.dev` (cuenta de negocios de Cloudflare). Es un proyecto aparte: `C:\Users\Usuario\Documents\back-nave`, con su `LEEME.md`. El juego lo usa desde `API_URL` (`juego/src/core/config.js`). El panel de retorno está en `/panel` y pide una clave que se guarda en ese proyecto.

Las pruebas automáticas del juego no hablan con el servidor (`localStorage.giro_api = 'off'`), para no ensuciar sus datos.

### R1 — Recordatorio diario y medición

- **Recordatorio (solo en la app):** un aviso al día como máximo, a las 7 de la noche, solo si ese día no se abrió el juego. Nombra la racha si la hay. Tras 3 avisos seguidos sin que el jugador entre, deja de insistir; al volver a entrar se retoma. Sobrevive a un reinicio del teléfono.
- **Es voluntario:** está apagado hasta que el jugador lo enciende. Se le ofrece una sola vez, justo después de abrir el cofre ("Avísame mañana cuando esté listo"), y se cambia en Configuración. Encenderlo abre la pregunta de permiso de Android.
- **Dónde está:** reglas en `app/.../application/Reminders.kt` (8 pruebas), alarma y aviso en `adapters/ReminderAdapters.kt`, y en el juego `ui/reminder.js`.
- **Medición:** el juego anota cada día en que se abre (`core/visits.js`) y lo envía al servidor con un número al azar por instalación, sin datos personales. El servidor calcula cuántos de los que llegaron un día volvieron al día siguiente, a los 3, a los 7 y a los 30, y lo muestra en una página con clave (`/panel`). En Métricas el jugador ve sus "días jugados".

### R2 — Copa semanal entre amigos

- Tabla con el mejor tiempo de Supervivencia de la semana (lunes a domingo, hora de Colombia). Muestra los 20 primeros y siempre el puesto propio.
- Botón **Copa** en el lobby con el puesto. Si alguien lo pasa desde la última vez, el botón lleva un punto rojo y la ventana dice "Te pasaron: ibas 2.º y ahora vas 4.º".
- Apodo de 2 a 14 letras, que se puede cambiar. Sin apodo se juega igual; el tiempo entra a la tabla cuando se elige.
- Al terminar una partida de Supervivencia sale la línea de la copa con el puesto. En modo demo no cuenta.
- Sin conexión, la marca se guarda y se envía después. Una marca de una semana ya terminada no entra.
- **Servidor:** proyecto aparte en `C:\Users\Usuario\Documents\back-nave` (Cloudflare Workers + D1; salió de este repositorio el 2026-11-20), con 11 pruebas y un servidor local para probar (`node local.mjs`). En el juego: `core/cup.js` y `ui/cup.js`.
- **Límites:** una sola tabla para todos y sin control fuerte de trampas (solo se rechazan tiempos imposibles). Alcanza entre amigos; para la tienda habría que partir en grupos y validar partidas.

### R3 — Meta a la vista

- En el taller, cualquier pieza que no se tenga se marca con el botón **Meta**.
- El lobby muestra la meta arriba a la izquierda con una barra y cuánto falta; al tocarla abre el taller en esa pieza. Cuando ya alcanza, lo dice.
- Al terminar cualquier partida sale "Tu meta: … te faltan N".
- Sin meta, el lobby invita a elegir una. Al comprarla, se borra sola.
- En el juego: `core/goal.js` y `ui/news.js`.

### R4 — Eventos con fecha

Todo sale del calendario del teléfono, sin servidor (`core/season.js`):

- **Fin de semana de monedas dobles:** sábado y domingo, lo que se gana en cada partida vale doble. El lobby lo avisa desde el jueves.
- **Oferta de la semana:** una nave única con 30 % de descuento, distinta cada semana y la misma para todos.
- **Piezas de temporada:** el Trineo de Papá Noel y su paquete (regalos y elfos) solo se pueden comprar del 1 de diciembre al 6 de enero. Quien ya los tiene los conserva. Fuera de fecha el taller dice cuándo vuelven, y el lobby avisa cuando faltan 14 días o menos.
- El lobby muestra como mucho dos avisos, primero lo que vale hoy.
- Para agregar otra temporada (Halloween, etc.) basta añadirla a `SEASONS` con sus piezas.

### R5 — Jefes en Supervivencia

- Al llegar a los niveles 10, 20, 30… llega un jefe. Se turnan el Vigía Ámbar y el Centinela del Vacío, cada pareja con más aguante y más premio.
- Hay un tiempo para derribarlo (45 s el Vigía, 60 s el Centinela). Premio: monedas (40 u 80 la primera vez), 25 % de casco y un escudo. Si no se le derriba, se retira sin premio y la partida sigue: nunca se traba.
- Durante la pelea el nivel no sube, pero el tiempo aguantado sí sigue contando (también para la copa).
- El jefe espera a que la pantalla esté quieta: sin giros, cometas ni paredes a la vista.
- Los jefes derribados se suman a "Jefes vencidos" en Métricas.
- **Por ajustar jugando:** el aguante (hoy 70 % del de Aventura), el tiempo y los premios, en `core/config.js` (`SURV_BOSS_*`).

## Retención, tercera parte (2026-11-21)

**De dónde salió:** a quienes se les envió el juego "no les dan muchas ganas de jugar o no recuerdan abrirlo". El servidor, con un día de datos, mostraba solo 3 instalaciones (2 del día 20, de las que volvió 1; 1 del día 21) y 2 jugadores en la copa (9:19 y 3:23). Es muy poco para concluir, pero no apunta a que el juego sea demasiado difícil.

| Qué | Para qué | Estado |
|---|---|---|
| Icono propio de la app | La app usaba el icono genérico de Android: en la pantalla del teléfono no se reconocía ni se recordaba | Hecho. Vectores en `app/android/src/main/res` |
| Rango de piloto con medallas | Que ninguna partida sea "en vano": toda partida da experiencia, cada nivel paga y cada medalla es un ascenso | Hecho. `core/pilot.js`, `ui/pilot.js` |
| Retar a mis amigos | Que los jugadores se recuerden el juego entre ellos por su chat | Hecho. Botón al terminar Supervivencia y en la Copa |
| Pregunta del aviso | El aviso solo se ofrecía tras abrir el cofre: quien no lo abría nunca lo veía | Hecho. Se pregunta una vez, al volver al lobby tras la segunda partida |
| Avisos según el día | Que el aviso diga algo que importe ese día | Hecho. Domingo: la copa termina y el puesto; fin de semana: monedas dobles; resto: racha o cofre |
| Avión de combate | Se veía pobre para ser una nave única | Hecho de nuevo, con más detalle (`vehiclesPro.js`) |

**Rango de piloto, en números:** 1 de experiencia por segundo aguantado, 2 por nave derribada, 40 por jefe de Supervivencia y 60 por vencer al jefe final. Pasar del nivel N al siguiente cuesta 80 + 40·(N−1). Cada nivel da 40 + 10·N monedas. El modo demo no da experiencia.

**Medallas:** Bronce (niveles 1–4), Plata (5–9), Oro (10–14), Platino (15–19), Diamante (20–24), Maestro (25–29) y Leyenda (30 en adelante). Dentro de cada una se sube de I a V. Cambiar de medalla es un ascenso y trae una pieza: rara en Plata, épica en Oro y Platino, legendaria desde Diamante. Cada medalla tiene su dibujo propio (`rank0` a `rank6` en `ui/icons.js`).

**Cómo se ve:** al terminar la partida la barra de experiencia se llena a la vista y el número sube contando; al subir de nivel la medalla salta y la barra destella; en un ascenso aparece la medalla nueva en grande, con rayos, hasta que el jugador toca. El lobby muestra la medalla junto a las monedas y Métricas muestra la escalera completa.

**Fallo corregido (2026-11-21):** los avisos del lobby (monedas dobles, Navidad, oferta) quedaban encima de las ventanas (cofre, misiones, copa, tienda, métricas, configuración) porque tenían prioridad de capa. Ya no.

**Lo que sigue sin poderse medir bien:** con tan pocas instalaciones el panel todavía no dice nada. Hay que repartir este APK (los anteriores al 20 de noviembre no reportan) y mirar el panel a la semana.

## Mundos, en lugar de Aventura (empezado el 2026-11-21)

**De dónde salió:** el usuario pensaba eliminar Aventura y lo que echaba de menos eran pistas de verdad distintas. Su pedido: viajar por un agujero negro, un mundo de hielo, uno de fuego, uno de gases donde caen meteoritos y una ciudad con edificios; en todos se esquivan obstáculos y se pelea contra enemigos distintos, que se vean diferentes.

**Cómo funciona:** el botón "Mundos" del lobby (donde estaba Aventura) abre un mapa con los cinco. Cada mundo es un recorrido con su paisaje, sus obstáculos, sus enemigos y un jefe al final. Vencer al jefe da 300 monedas la primera vez (100 las siguientes) y abre el mundo siguiente.

| # | Mundo | Qué lo distingue | Estado |
|---|---|---|---|
| 1 | Mundo de hielo | La nave resbala. Pista de hielo, campo de nieve agrietado, agujas de hielo, cordillera nevada, aurora y nieve. Obstáculos: racimos de agujas y témpanos. Enemigos: drones de escarcha. Jefe: Coloso de Escarcha | **Hecho** |
| 2 | Mundo de fuego | Bolas de fuego cruzan la pista. Losas con juntas encendidas, ríos de lava, volcanes, brasas. Obstáculos: rocas de lava. Enemigos: murciélagos de magma. Jefe: Señor de la Ceniza | **Hecho** |
| 3 | Mundo de gases | Pedido del usuario: montañas más grandes, arcos de piedra y menos enemigos. Niebla morada, charcos de gas, agujas de roca. Montañas macizas en la pista, arcos de piedra, meteoritos que cruzan. Enemigos (pocos): medusas de gas. Jefe: Titán de la Tormenta | **Hecho** |
| 4 | Ciudad | Noche de neón. Asfalto con carriles, torres con ventanas encendidas. Obstáculos: carros voladores de frente y barreras de obra. En la pista: torres y puentes de autopista. Enemigos: drones de policía. Jefe: Guardián de Neón | **Hecho** |
| 5 | Agujero negro | Cielo negro con el anillo de luz, la rejilla del espacio. Agujeros negros que jalan la nave y la pantalla se voltea. Obstáculos: esquirlas de obsidiana. En la pista: monolitos y aros de luz. Enemigos: espectros del vacío. Jefe: Devorador del Horizonte | **Hecho** |

**Arcos (2026-11-21):** en gases, ciudad y agujero negro, además de las montañas salen arcos: dos pilares con un paso en medio (a veces estrecho, a veces casi toda la pista) y algo por encima (arco de piedra, puente, aro de luz).

**Montañas en la pista (pedido del usuario, 2026-11-21):** además de los obstáculos que vuelan, cada mundo tiene obstáculos grandes plantados en la pista que hay que rodear: montañas nevadas en el hielo y volcanes en el fuego. Se ven venir de lejos, no se rompen con las armas (con nitro se atraviesan) y a veces salen dos dejando un paso entre ellas. Nunca salen junto con una pared. En los mundos que faltan serán nubes de gas, edificios y restos del agujero negro.

**Dónde está:** los datos de cada mundo en `juego/src/core/worlds.js` (colores, largo, qué peligros tiene, jefe, nombres de los tramos); el aspecto en `juego/src/render/worlds.js` (cielo, cordilleras, terreno, paisaje, obstáculos y enemigos); el mapa en `juego/src/ui/worlds.js`. Un mundo nuevo se agrega con una entrada en cada uno.

**Aprobado por el usuario (2026-11-21):** el estilo de hielo y fuego ("me encanta"); con eso se hicieron los otros tres. **Pendiente:** los jefes de mundo son por ahora el jefe final de antes con otros colores y otro nombre; faltan jefes con forma propia. Los números (cuánto resbala la nave, cada cuánto cruzan las bolas de fuego, el aguante de los jefes) son una primera propuesta.

**Segunda vuelta de los mundos (pedido del usuario al probarlos, 2026-11-21):**

- **Nada de cometas cruzando la pista en los mundos.** En su lugar, cosas que avisan en el suelo y luego golpean (`game/blasts.js`): **meteoritos que caen del cielo** donde está la nave (fuego, y en gases desde el 35 %) y **cráteres** que vienen por la pista hirviendo y estallan (gases).
- **Fuego:** las montañas son volcanes de verdad (relieve, ríos de lava por la ladera, humo, chispas) y hay **charcos de lava** que se rodean, junto a los volcanes y sueltos.
- **Gases:** piedra café con musgo verde y gas por todos lados (cielo, suelo, bancos de gas junto a la pista); montañas con estratos, cornisas y respiraderos; arcos de piedra quebrada.
- **Un jefe propio en cada mundo** (`render/bosses.js`), con un ataque suyo que intercala con los de siempre:

| Mundo | Jefe | Qué es | Su ataque |
|---|---|---|---|
| Hielo | Coloso de Escarcha | Gigante de hielo con dos puños que flotan | Filas de púas que salen del suelo, con un hueco |
| Fuego | Señor de la Ceniza | Dragón de magma | Lluvia de meteoritos sobre la nave |
| Gases | Titán de la Tormenta | Cabeza de piedra con musgo, rodeada de rocas | Cráteres que se abren y estallan uno tras otro |
| Ciudad | Guardián de Neón | Nave patrulla con sirena y cañones | Marca carriles y los barre con un rayo |
| Agujero negro | Devorador del Horizonte | Boca con dientes, ojos y tentáculos | Tentáculos que caen a lo largo de la pista, y **traga**: arrastra la nave hacia su boca (hay que tirar hacia atrás; si llega, muerde). Si gana, **se traga la nave** en vez de explotar |

- **Mundos más largos:** de 0.6–0.9 a 1.15–1.6 veces la meta base. Medido en la prueba automática del hielo: de 1:32 a 2:40 hasta el jefe.
- **La ciudad no se tocó** (el usuario dijo que está perfecta), salvo el jefe y el largo.

**Sin comprobar:** todo esto solo se vio en el navegador; falta en el teléfono (rendimiento incluido). Los números (cada cuánto cae un meteorito, tamaño de los cráteres, fuerza con que traga el Devorador, aguante de los jefes) son un primer intento.

**Supervivencia en un mapa al azar (pedido del usuario, 2026-11-21):** cada partida de Supervivencia se juega en uno de seis mapas, sin saber cuál va a tocar: el del espacio (el de siempre, que se conserva) o el paisaje de uno de los cinco mundos. No repite el de la partida anterior. **Solo cambia lo que se ve** (cielo, pista, terreno, rocas, enemigos); las reglas de Supervivencia son las mismas en todos: no salen montañas, meteoritos ni jefes de mundo. En un reto entre amigos el mapa sale de la semilla, así que los dos juegan en el mismo. Comprobado: con el mapa del espacio la regresión queda idéntica a la de antes. Por decidir con el usuario: si quiere que en cada mapa salgan también los obstáculos propios de ese mundo.

**Elegir el mapa de Supervivencia, y el mundo del espacio (pedido del usuario, 2026-11-21):** al probar el mapa al azar no le salió el del espacio en muchos intentos, así que ahora el botón Supervivencia abre un selector (`ui/maps.js`): "Al azar" o uno de los seis mapas, cada uno con una foto pequeña de cómo se ve. La elección se recuerda (`S.survMap`) y es la que usan "Jugar de nuevo" y la copa. Las fotos las toma `tools/miniaturas.mjs` y quedan en `src/ui/mapThumbs.js`: hay que volver a correrlo cuando cambie cómo se ve un mundo. En Mundos se agregó **Espacio** como mundo 1: la Aventura de siempre (sus tramos, el Vigía Ámbar a mitad de camino, agujeros negros, el giro de pantalla y el Centinela del Vacío). El espacio y el hielo están abiertos desde el principio, para no cerrarle el hielo a quien ya lo tenía.

**Experiencia más lenta y medalla Cósmico (pedido del usuario, 2026-11-22):** dijo que la experiencia subía "demasiado rápido y fácil" y pidió un nivel más, Cósmico, con un agujero negro de insignia.

- Cada partida da cerca de la mitad: 1 por cada 2 segundos (antes 1 por segundo), 1 por nave (antes 2), 30 por jefe de Supervivencia (antes 40), 60 por vencer al jefe final (igual).
- Cada nivel cuesta más que el anterior, y cada vez más: 150, 230, 320, 420… (antes 80, 120, 160…).
- Ocho medallas: se agregó **Cósmico** desde el nivel 35 (Leyenda queda de 30 a 34).
- Quien ya tenía nivel lo conserva: su experiencia se convierte una sola vez a la escala nueva (`S.xpV = 2`).

| Medalla | Nivel | Experiencia total antes | Ahora |
|---|---|---|---|
| Plata | 5 | 560 | 1.120 |
| Oro | 10 | 2.160 | 5.070 |
| Platino | 15 | 4.760 | 13.020 |
| Diamante | 20 | 8.360 | 26.220 |
| Maestro | 25 | 12.960 | 45.920 |
| Leyenda | 30 | 18.560 | 73.370 |
| Cósmico | 35 | — | 109.820 |

Como además cada partida da la mitad, llegar a cada medalla cuesta entre 4 y 8 veces más juego que antes. Las horas son una estimación (no hay medición de cuánta experiencia se gana por hora): Leyenda pasaba de unas 4 horas de juego a cerca de 30, y Cósmico queda cerca de 45. **Por confirmar con el usuario** si ese ritmo es el que quiere.

**Sin medir todavía:** el rendimiento de los mundos en el teléfono (el terreno y la pista se pintan con cálculos nuevos en cada punto de la pantalla).

## Iconos propios en vez de emojis (empezado el 2026-11-20)

Los emojis cambian de un teléfono a otro y no son nuestros. Se reemplazan por un juego de iconos propio dibujado en vectores (`juego/src/ui/icons.js`), de colores planos y formas redondeadas.

- **Cómo se usan:** en el código se escribe `{coin}`, `{fire}`, `{play}`… y se convierte en dibujo al mostrarse en pantalla o al pintarse dentro de la partida. En `index.html` se convierten al construir.
- **Etapa 1, hecha en el HTML (pendiente del visto bueno del estilo):** 62 iconos para toda la interfaz: lobby, marcador, avisos que flotan en la partida, cápsulas, tienda, cofre, misiones, métricas, pantallas de fin, pausa, configuración y los grupos del taller. La prueba de regresión confirmó que lo único que cambió fueron los emojis.
- **Etapa 2, pendiente:** las miniaturas del taller que todavía son emojis (naves únicas y trompas: unas 30).
- **Etapa 3, pendiente:** lo que se dispara o se deja de camino con emojis (patitos, pizzas, fantasmitas, notas, balones, caja sorpresa y la vaca), y dos marcas de visto bueno que están en los estilos.

## Después

Copa semanal (necesita servidor), anuncios reales, ícono y firma para Play Store, prueba en un teléfono de gama baja.

## Cuentas: guardar el progreso en la nube (2026-11-22)

Pedido del usuario: que el jugador no pierda su progreso, entrando con Google o con correo, cuidando la seguridad. **Decidió:** solo Google, y la cuenta es opcional.

**Cómo queda protegido**

| Qué | Cómo |
|---|---|
| Contraseñas | No existen: Google confirma quién es el jugador |
| Correo y nombre | No se piden ni se guardan |
| Identidad en el servidor | Una huella con secreto del número de cuenta de Google: con la base de datos sola no se sabe de quién es cada cuenta |
| Llave de sesión, en el servidor | Solo su huella (SHA-256) |
| Llave de sesión, en el teléfono | Cifrada con el almacén de claves de Android, y fuera de las copias de seguridad |
| Comprobante de Google | Se revisa la firma, que sea para este juego, que no esté vencido y que traiga el número de un solo uso que dio el servidor (no se puede reutilizar) |
| Dos teléfonos | Cada guardado lleva su versión; si no coincide, no se pisa nada: el jugador elige con cuál progreso se queda |
| Abuso | Tope de intentos de entrar por dirección y de guardados por cuenta; tamaño máximo del progreso |
| Derecho a irse | "Borrar mi cuenta y lo guardado" borra todo del servidor |

**Hecho:** el servidor (`back-nave/src/cuentas.js`, 13 pruebas), el juego (`core/account.js`, `ui/account.js`: aviso en el lobby una sola vez, renglón en Configuración, pantalla de la cuenta) y Android (`adapters/AccountAdapters.kt`). Probado de punta a punta en el navegador con un Google de mentira: guardar, recuperar en otro teléfono, elegir entre dos progresos, cerrar sesión y borrar la cuenta.

**Encendido el 2026-11-22:** el usuario creó el proyecto "Nave" en Google Cloud y sus credenciales; se crearon las tablas en la base publicada (los datos de la copa y las visitas quedaron intactos), se puso el secreto y se publicó el servidor. Comprobado en vivo: la copa sigue respondiendo, las cuentas entregan el número de un solo uso y rechazan comprobantes falsos y llaves inventadas. La pantalla de consentimiento de Google está "En pruebas": solo entran los correos agregados como usuarios de prueba; para abrirlo a todos hay que publicarla.

**Pendiente después:** probar el inicio con Google en un teléfono de verdad (no se puede hasta tener el identificador); una firma de publicación propia (hoy solo existe la de pruebas de este computador); una página de política de privacidad (la tienda la exige cuando hay cuentas); y recordar que el progreso lo manda el teléfono (alguien con conocimientos podría inventarse monedas): cuando haya compras de verdad, esas se validan en el servidor, aparte.

