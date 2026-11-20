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
| 3 | Pista con semilla y retos por enlace | Pendiente |
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

## Después

Copa semanal (necesita servidor), anuncios reales, ícono y firma para Play Store, prueba en un teléfono de gama baja.
