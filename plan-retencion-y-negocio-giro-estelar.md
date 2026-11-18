# Plan de producto, retención y negocio — Giro Estelar

**Documento de decisión para continuar después del demo.** Meta: construir un juego pequeño, jugable sin conexión y con una comunidad inicial reducida, y comprobar si puede producir un ingreso complementario. Las cifras de ingreso son escenarios, no promesas.

## 1. Decisión ejecutiva

Giro Estelar debe crecer primero como un arcade de partidas cortas con una identidad clara: **sobrevive a una ruta, domina el giro de pantalla, completa una misión y vuelve para mejorar tu récord o participar en la copa semanal**.

La prioridad no es llenar el juego de sistemas. Es comprobar, en este orden, que:

1. La partida central se disfruta y se entiende.
2. La progresión da una razón concreta para volver durante la semana.
3. El modo sin conexión sigue siendo un juego completo.
4. Los anuncios opcionales y, más adelante, una compra cosmética pueden generar algo sin dañar la experiencia.

La primera versión pública debe limitarse a **un mundo espacial bien terminado, supervivencia sin conexión, pocas misiones, un jefe, tres naves y una copa semanal asíncrona**. Tierra, aire, agua y multijugador en tiempo real quedan para después de observar retención real.

## 2. Punto de partida

El archivo [demo-juego.html](demo-juego.html) ya contiene una prueba jugable con supervivencia por tiempo, dificultad creciente, giro de pantalla, poderes temporales, monedas, tres naves, cofre, misión, jefe con tres armas y botones de anuncios simulados. Guarda parte del progreso en `localStorage` del navegador.

El demo todavía no comprueba el negocio: el banner y los videos son representaciones, no anuncios servidos; tampoco hay cuentas, guardado en la nube, telemetría de producción, rankings globales ni sincronización entre dispositivos. El documento [plan-de-negocio-juegos.md](plan-de-negocio-juegos.md) propone Android con Kotlin/libGDX; por eso se debe usar el HTML para validar la experiencia antes de invertir en el paso a la app final.

## 3. Meta comercial realista

Usar dos metas separadas:

- **Primera señal económica:** acumular unos **20.000 COP al mes** entre anuncios opcionales y compras cosméticas.
- **Meta deseada:** acercarse a **100.000 COP al mes**, como objetivo de crecimiento y no como ingreso garantizado.

“40 usuarios” necesita una definición. **40 personas que instalaron el juego no equivalen a 40 usuarios activos diarios (DAU)**; solo una parte de quienes lo probaron volverá cada día. La publicidad se calcula sobre impresiones monetizadas, y su valor cambia por país, formato, demanda y disponibilidad de anuncios. AdMob define eCPM como ingresos por cada mil impresiones y advierte que puede fluctuar según mercado y plataforma ([cómo fluctúa el eCPM](https://support.google.com/admob/answer/15337570?hl=en-GB)).

### Escenario ilustrativo, no pronóstico

La tabla supone **40 DAU durante 30 días**, que cada anuncio mostrado cuenta como impresión monetizada y un eCPM hipotético. No son tarifas de mercado ni una promesa de lo que pagará AdMob.

| eCPM hipotético | Ingreso con 1 impresión por DAU al día | Impresiones por DAU al día necesarias para 100.000 COP/mes |
|---:|---:|---:|
| 2.000 COP | 2.400 COP/mes | 41,7 |
| 5.000 COP | 6.000 COP/mes | 16,7 |
| 15.000 COP | 18.000 COP/mes | 5,6 |

La fórmula es: **ingreso estimado = impresiones ÷ 1.000 × eCPM observado**. Incluso con 40 personas jugando todos los días, depender solo de anuncios voluntarios para llegar a 100.000 COP exigiría muchas impresiones por persona. Si 40 es la cantidad total de jugadores, la publicidad probablemente será bastante menor. Por eso conviene medir también una compra opcional de bajo precio —por ejemplo, un paquete de apoyo con pinturas y estelas exclusivas— cuando algunos jugadores ya quieran apoyar el proyecto.

Los ingresos de AdMob pueden quedar acumulados hasta superar el umbral de pago de la cuenta; para una cuenta con moneda de informe USD, la tabla oficial indica **100 USD**. La moneda de informe puede cambiar el umbral, así que hay que verificarlo en la propia cuenta de AdMob ([umbrales de pago](https://support.google.com/admob/answer/2772208?hl=es)). Por tanto, “generar 20.000 COP este mes” no necesariamente significa recibir ese dinero en la cuenta bancaria ese mismo mes.

## 4. Retención: por qué volver

El ciclo principal debe ser corto y comprensible:

**Elegir una ruta → jugar 1–3 minutos → recibir puntos, experiencia y monedas → avanzar una misión o récord → desbloquear algo visual → jugar otra ruta o volver a la copa semanal.**

Cada regreso debe aportar algo distinto:

- **En cada partida:** mejorar el récord, subir combo o completar un objetivo de habilidad.
- **Durante la semana:** avanzar una misión rotativa y probar la copa semanal con la misma semilla y reglas para todos.
- **A largo plazo:** subir el nivel de piloto, completar una colección y desbloquear naves, pinturas, estelas e insignias.

El cofre y la racha pueden ser extras, pero no deben ser el motor principal. Perder un día no debe borrar progreso, bajar nivel ni castigar al jugador. La misión diaria puede acumular avance o tener una alternativa semanal para quien juega pocos días.

## 5. Progresión, puntuación y contenido

### Puntos, experiencia y monedas

Conviene separar tres cosas para que el marcador sea competitivo y la economía sea fácil de balancear:

- **Puntuación de partida:** mide habilidad y decide el récord/ranking. Propuesta inicial para probar: 10 puntos por cada 5 segundos sobrevividos, 5 por obstáculo esquivado y 5 extra por esquiva cercana bien calculada (máximo una bonificación por obstáculo), más 25–100 por objetivo completado. Los valores son provisionales y deben ajustarse al probar.
- **Experiencia de piloto:** se gana al terminar partidas, cumplir misiones y vencer al jefe. Sube el nivel del jugador y desbloquea hitos, pero no compra ventajas competitivas.
- **Monedas:** premio moderado por jugar y completar objetivos. Se gastan en cosméticos y naves, sin comprar puntuación ni intentos de copa.

Los anuncios, compras y monedas nunca deben aumentar el puntaje de un ranking. Para copas, todos compiten con la misma nave base y la misma carga de poderes; las diferencias de naves con velocidad o escudo se pueden mantener en supervivencia normal, pero no en la clasificación común.

### Nivel y mapa inicial

Evitar cientos de niveles diseñados a mano. Para la primera entrega:

- **Mundo 1: Espacio**, con tres sectores visuales que reutilicen el mismo sistema de juego (por ejemplo: campo de asteroides, ruinas orbitales y nebulosa).
- **Cinco contratos cortos** que cambien una regla u objetivo, como sobrevivir cierto tiempo, recoger una ruta de energía o vencer a un enemigo.
- **Un jefe de zona**, basado en el Centinela actual, con fases legibles y dificultad balanceada.
- **Supervivencia infinita**, siempre disponible sin internet.
- **Tres naves y un conjunto pequeño de pinturas/estelas/insignias**. En la primera versión, preferir que las naves sean cosméticas o tengan diferencias muy pequeñas; separar las estadísticas si compiten.

Las armas y poderes funcionan mejor como elecciones temporales dentro de la partida. El arsenal actual puede crecer con disparo básico, pesado y especial para el jefe, más poderes de supervivencia como escudo, láser e imán. No vender armas más fuertes. Dejar que el jugador consiga insignias por retos, no solo por iniciar sesión.

### Mundos futuros

Usar el mismo motor de obstáculos para añadir temas y reglas gradualmente: **aire** (ráfagas y corrientes), **tierra** (rutas estrechas y obstáculos móviles) y **agua** (corrientes, remolinos y visibilidad). Cada mundo nuevo necesita al menos una mecánica que lo diferencie; cambiar solo el color no es suficiente. No producir los tres hasta ver que el mundo espacial conserva jugadores.

## 6. Juego sin conexión

El modo sin internet debe seguir ofreciendo partidas, progreso y metas. Conservar localmente:

- Supervivencia y contratos/campaña ya descargados.
- Récord personal, nivel, monedas, inventario y selección de nave.
- Progreso de misiones; los retos diarios/semanales pueden generarse desde la fecha y guardarse en el dispositivo.

Sin conexión no se muestran anuncios ni se bloquea el juego por falta de conexión. Al volver a conectarse, el juego puede cargar anuncios, actualizar el reto y sincronizar datos permitidos. Los récords offline se conservan como récord personal; solo entran a la tabla mundial si el servidor puede validarlos. El juego debe conservar en el dispositivo los objetos ganados offline y no descartarlos por falta de sincronización.

En la app final, usar guardado local confiable y respaldo en la nube solo cuando haya conexión y una necesidad comprobada. `localStorage` sirve para la demo web, pero no debe asumirse como guardado de la versión Android.

## 7. Monetización sin presión

### Anuncios

Empezar solo con anuncios recompensados voluntarios. Ofrecer una recompensa concreta antes de cada anuncio, por ejemplo: “Ver anuncio para duplicar las monedas de esta partida”. Google requiere que el jugador elija cada anuncio y que la recompensa se explique claramente; rechazarlo no debe impedir el uso normal del juego ([políticas de anuncios recompensados](https://support.google.com/admob/answer/7313578?hl=en)).

Reglas de experiencia propuestas:

- Nunca interrumpir una partida ni mostrar un anuncio antes de jugar.
- Como máximo, **un anuncio visto por partida** al inicio; el jugador decide o cierra la oferta.
- Ese anuncio puede servir para revivir o para duplicar el premio final, pero no para ambas cosas en la misma partida. No encadenar además el duplicado del cofre.
- Sin conexión o si el anuncio no carga, continuar sin anuncio y sin bloquear la recompensa normal.
- El banner de la demo no debe pasar automáticamente a la versión final; probar si aporta algo sin ocupar espacio o distraer.
- Medir tanto ingresos como abandono, duración de sesión y retención. Si aumentan los ingresos por partida pero cae el regreso, reducir frecuencia.

### Compras opcionales

Después de validar que hay jugadores que vuelven, probar un único paquete cosmético de apoyo: pinturas, estela y una insignia. No crear suscripción, cajas aleatorias de pago, energía, vidas pagas ni ventajas en copas. La tienda no debe ser necesaria para desbloquear el contenido jugable.

## 8. Competencias y juego social

### Copa semanal asíncrona

Es la primera función competitiva recomendada: una pista, semilla y regla iguales para todos durante una semana; se registra el mejor resultado entre un número limitado de intentos para reducir la repetición automática. Mostrar el top mundial y, cuando haya suficientes jugadores, una tabla por país. Entregar insignias o cosméticos de temporada, nunca dinero ni mejoras de poder.

El jugador offline puede practicar la misma copa y guardar su marca local. El envío al top mundial requiere conexión y validación. Si al comienzo el tablero se ve vacío, mostrar primero récord personal, grupo de amigos mediante código o tabla semanal, en lugar de presentar una clasificación mundial sin participantes.

### Multijugador en tiempo real

No incluirlo en el plan base. Con una comunidad de unas decenas de jugadores es probable que no haya suficientes personas conectadas al mismo tiempo para emparejamientos rápidos; además, obliga a mantener servidores, sincronización y medidas contra trampas. Si la copa semanal demuestra interés, el siguiente paso puede ser competir contra la “sombra” (repetición) de otro jugador. Revisar multijugador en vivo solo cuando haya actividad simultánea suficiente y la comunidad lo pida.

## 9. Fases de trabajo y puertas de decisión

| Fase | Trabajo | Resultado / condición para avanzar |
|---|---|---|
| **0. Enfoque** | Confirmar que la promesa es arcade corto con partidas offline; decidir si la app objetivo será Android Kotlin/libGDX y usar el HTML como prototipo; definir que 20.000 COP es la primera señal y 100.000 COP la meta deseada. | Documento de alcance cerrado: un mundo, una copa semanal futura, cero multijugador en vivo. |
| **1. Demo de retención** | Pulir el control, dificultad y giro; explicar mejor el objetivo; corregir el flujo del jefe; persistir de manera clara récord, monedas, nave y misiones; añadir contratos y progresión visual pequeña. No integrar anuncios reales. | Probar con jugadores nuevos durante 7 días. Registrar quién vuelve, cuántas partidas hace, dónde abandona y qué motivo de regreso menciona. |
| **2. MVP offline** | Llevar el núcleo al formato final elegido; supervivencia, 5 contratos, 1 mundo/3 sectores, 1 jefe, 3 naves, cosméticos básicos, guardado local y navegación usable. Mantener rendimiento en teléfonos modestos. | Completar una prueba cerrada sin depender de internet; recuperar progreso al cerrar/abrir y verificar partidas offline. |
| **3. Prueba de retención** | Lanzamiento pequeño a la audiencia disponible; instrumentar eventos mínimos: instalación/primera partida, fin de partida, retorno día 1/7/30, misión completada, jefe alcanzado/derrotado, sesiones y fallos. | Tomar una decisión basada en dos o más cohortes. Si pocos vuelven, mejorar la partida y el motivo de regreso antes de producir más mundos. Como umbrales internos iniciales (no promedios universales), buscar D1 ≥20% y D7 ≥8%; con pocas instalaciones son señales débiles, no una prueba estadística. |
| **4. Monetización controlada** | Integrar AdMob en la app final cuando ya exista una ruta estable de fin de partida; empezar con una oferta recompensada por partida y revisar llenado, eCPM observado, ingresos, aceptación y retención. Después probar el paquete cosmético. | Mantener anuncios solo si no deterioran D1/D7 ni el uso normal. Comparar el ingreso real con el objetivo de 20.000 COP acumulados al mes. |
| **5. Copa y expansión ligera** | Crear una copa semanal asíncrona con semilla común, clasificación validada y premio cosmético. Añadir el segundo mundo solo cuando el primero retenga y el contenido actual se complete. | El ranking tiene actividad semanal y los jugadores piden nuevos retos. Publicar contenido mensual o cuando esté listo, no prometer actualizaciones cada dos semanas. |
| **6. Multijugador en vivo (opcional)** | Explorar solo con evidencia de jugadores simultáneos, demanda y capacidad de mantener backend. | Se aprueba si el emparejamiento se puede llenar de forma consistente y el costo técnico cabe en los ingresos o en un presupuesto explícito. No es requisito para el negocio pequeño planteado. |

## 10. Tablero de métricas

Revisar semanalmente:

- **Retención:** D1, D7 y D30; porcentaje que juega tres o más sesiones durante la primera semana.
- **Diversión/progresión:** duración de partida y sesión, punto de abandono, porcentaje que termina misión, llega al jefe y lo vence, desbloqueo del primer cosmético.
- **Competencia:** participación en copa, intentos por participante, jugadores que regresan por el reinicio semanal.
- **Monetización:** DAU, impresiones por usuario activo, eCPM, solicitudes/impresiones, tasa de aceptación y COP acumulados. Comparar segmentos por país solo si hay volumen suficiente.
- **Calidad:** cierres inesperados, pérdida de guardado, fallos al reanudar y porcentaje de sesiones sin conexión.

No tomar decisiones de producto por una semana con cuatro testers. Usar entrevistas breves con los primeros jugadores y comparar cohortes antes/después de cada cambio.

## 11. Qué no construir todavía

- Cuatro biomas completos de una vez.
- Multijugador en tiempo real, chat o clanes.
- Cientos de niveles hechos a mano.
- Varias monedas, pases de temporada y recompensas aleatorias pagadas.
- Anuncios obligatorios o varios anuncios seguidos por una sola partida.
- Naves con ventaja en el top mundial.
- Un calendario de contenido que no se pueda sostener.

## 12. Próximas decisiones concretas

1. Definir si “40 usuarios” significa jugadores totales, activos mensuales o DAU; usar DAU para el cálculo de anuncios.
2. Confirmar Android/Kotlin/libGDX como destino final y mantener el HTML como herramienta de prueba rápida.
3. Elegir el primer contenido de la demo: misiones, nivel de piloto y economía inicial, usando la puntuación anterior como hipótesis.
4. Hacer una prueba de 7 días con un grupo mayor que los cuatro comentarios iniciales y preguntar qué hizo que volvieran o no.
5. Revisar el umbral de pago y la moneda de informe en la cuenta de AdMob antes de interpretar “ingreso mensual” como efectivo recibido.

**Resumen de alcance:** una experiencia arcade offline sólida; progreso pequeño y visible; copa semanal asíncrona como primera competencia; anuncios recompensados limitados; cosméticos como segunda fuente; mundos nuevos y multijugador solo después de medir retorno y demanda.
