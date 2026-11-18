# Plan de negocio: juegos casuales móviles con anuncios

Documento de trabajo. Las cifras son estimaciones orientativas y varían mucho según país, formato de anuncio y calidad del juego. Hay que validarlas con datos reales del primer juego.

---

## 1. Resumen

- **Idea:** publicar muchos juegos casuales pequeños (básicos conocidos con un giro propio), pensados para engancharse sin ser dañinos, monetizados con anuncios poco intrusivos.
- **Meta de ingresos:** 100.000 a 300.000 COP al mes sumando todos los juegos, mientras crece. No se busca que un solo juego lo logre.
- **Mercado:** mundial, con varios idiomas (el tráfico de EE. UU., Europa y Japón paga varias veces más por anuncio que el latinoamericano).
- **Punto de partida:** ya existe una app publicada en Play Store con 40 usuarios que escriben pidiendo mejoras (señal de que hay gente que vuelve).
- **Forma de trabajo:** el código lo escribe la IA; la persona supervisa, prueba y revisa features.
- **Tecnología decidida:** Kotlin (no se usará Godot ni Unity).
- **Pendiente de decidir:** estilo gráfico del primer juego, 2D o 3D. Este documento deja ambos para decidir después.

---

## 2. Primer juego: esquivar obstáculos con nave

### Concepto
El jugador mueve una nave con el dedo y esquiva obstáculos que se acercan. Al subir la dificultad, el celular pide girar y la pantalla rota para complicar. Es un género conocido, pero la rotación de pantalla es el elemento diferenciador.

### Elementos de juego
- Nave que sigue el dedo.
- Obstáculos de dificultad creciente.
- Escudos y armas para destruir obstáculos.
- Retos especiales (por ejemplo, seguir un camino).
- Naves y mapas coleccionables, con mejoras de nave.
- Más adelante: multijugador y ranking mundial.

### Ideas para hacerlo "conocido pero diferente"
- La rotación de pantalla como gancho, fácil de mostrar en un video corto.
- Modo "caos" con giros impredecibles.
- Ranking mundial semanal.
- Naves con habilidades propias (no solo cambio de color).
- Mapas con mecánicas propias (por ejemplo, escudos que aparecen solos o zonas de giro).

### 2.1 Jefe final (propuesta, ya incluida en la demo web)

**Idea:** al llegar a cierto puntaje se desbloquea un jefe final. El jugador esquiva lo que el jefe lanza y le dispara.

**Armas**

| Arma | Cómo funciona | Para qué sirve |
|---|---|---|
| Básica | Daño bajo, disparo rápido | Daño constante mientras se esquiva |
| Pesada | Más daño por disparo, más lenta, bala más ancha | Aprovechar los momentos en que el jefe se mueve lento |
| Especial | Se carga cada minuto sobrevivido a la pelea; golpe fuerte que además limpia los proyectiles del jefe | Premia esquivar (no solo disparar) y sirve para salir de un apuro |

**Cómo está en la demo**
- Desbloqueo: 40 monedas en una sola partida (o activando el "modo demo" en el menú).
- Jefe "Centinela del Vacío": 300 de vida y 3 fases (abanicos y disparos dirigidos; más rápido con paredes con hueco; barridos).
- La pantalla se voltea cuando le queda la mitad de la vida y se balancea cuando le queda un cuarto.
- El Especial carga cada 30 s en la demo (en el juego real sería cada 60 s) y quita 60 de vida.
- Una cápsula de escudo cae cada ~22 s.
- Recompensa: 100 monedas al ganar; si pierdes, monedas según el daño que hiciste. Se puede revivir una vez viendo un anuncio con recompensa.

**Por qué ayuda a la retención**
- Da una meta clara ("llego a X puntos y desbloqueo la pelea") y una razón para mejorar armas y naves.
- Es contenido que se repite y se renueva: un jefe por zona, y un jefe del día o de la semana con ranking de tiempo.
- Abre anuncios con recompensa naturales: revivir en la pelea, recargar el Especial o un intento extra.

**Riesgos**
- Si el jefe es muy difícil o el ritmo muy lento, baja la retención en vez de subirla.
- El balance (vida del jefe, daño de cada arma, tiempo de carga del Especial) hay que probarlo con testers y medirlo: cuántos llegan al jefe y cuántos lo derrotan.

---

## 3. Sistema de recompensas y retención

### Por partida
- Monedas por distancia y por esquivar "por poco".
- Combos al esquivar varios obstáculos seguidos.
- Cápsulas con mejoras temporales: escudo, imán de monedas, arma, cámara lenta.

### Diario
- Cofre diario con premio creciente por racha (se puede duplicar viendo un anuncio). Cuidar que perder la racha no se sienta como castigo.
- Reto del día con regla especial y premio fijo.
- Misiones cortas ("esquiva 50 obstáculos", "destruye 10 con el arma").

### Largo plazo
- Naves con habilidad propia.
- Mapas desbloqueables por hitos.
- Colección con logros y álbum.
- Mejoras de nave con costo creciente y un tope para que no se sienta "paga o espera".

### Anuncios
| Formato | Uso | Comentario |
|---|---|---|
| Con recompensa (opcional) | Revivir una vez por partida, duplicar monedas, ruleta o cofre extra | Es el que mejor paga y menos molesta. El jugador ve qué gana antes de aceptar. |
| Intersticial con tope | Uno cada 3-4 niveles, nunca justo después de perder | Paga bien pero molesta; se usa con moderación. |
| Banner pequeño | Complemento en menús | Paga poco; mejora la experiencia, baja el ingreso por usuario. |

---

## 4. Tecnología

### Decidido
- **Lenguaje:** Kotlin.
- **Plataforma inicial:** solo Android.
- **Motor sugerido:** libGDX (soporta 2D y 3D, es gratis y está bien documentado).
- **Herramienta de desarrollo:** Android Studio (compilar, probar en el celular y depurar).

### Por qué Kotlin con IA
- Todo es código, lo que la IA genera y corrige de punta a punta.
- No requiere manejar un editor visual (a diferencia de Unity o Godot).
- Ya hay experiencia publicando en Play Store.

### Limitación importante
- **iOS después sale caro:** con Kotlin nativo, la versión de iPhone casi equivale a reescribir. Es un tope a tener presente, porque iOS paga más por anuncio. Para el MVP en Android no importa; se decide con datos si el juego retiene.

### Backend
- **MVP:** casi ninguno. El progreso, monedas y naves se guardan en el dispositivo.
- **Anuncios:** AdMob.
- **Analítica y retención:** Firebase (gratis al inicio).
- **Más adelante:** Firebase para guardar progreso en la nube y ranking mundial. Para multijugador en tiempo real, Firebase, Nakama (código abierto) u otra solución; es lo más complejo y se deja para una fase posterior.

---

## 5. Decisión pendiente: 2D vs 3D

### Opción A: 2D (o 2.5D, vista fija con objetos 3D simples)

**Beneficios**
- Más rápido de construir y de probar: se llega antes a saber si el juego engancha.
- Menos peso (la app puede quedar en 10-25 MB).
- Menos consumo de batería y calor; corre bien en teléfonos modestos (importante con público mundial).
- Menos trabajo de arte y menos detalles que supervisar (cámara, luces, colisiones).
- Se puede hacer casi todo con formas generadas por código.

**Desventajas**
- Menos impacto visual en capturas de pantalla y videos; cuesta más destacar.
- La rotación de pantalla y la sensación de velocidad se notan menos que en 3D.
- Es el estilo más saturado en la tienda.

### Opción B: 3D low-poly

**Beneficios**
- Más impacto visual y sensación de profundidad y velocidad; la rotación de pantalla luce más.
- Naves y mapas coleccionables se ven más atractivos (ayuda a la motivación de coleccionar).
- Mejor material para videos cortos de promoción.

**Desventajas**
- Más tiempo antes de tener algo jugable y de poder validar la idea.
- Más batería y calor; hay que ofrecer una opción de calidad baja.
- Hace falta arte 3D: modelos de naves y obstáculos. La IA no los dibuja sola; se pueden usar paquetes low-poly gratuitos (por ejemplo, Kenney.nl) o modelos sencillos hechos en Blender.
- Más difícil de probar y ajustar (cámara, luces, colisiones).
- Mayor riesgo de peso y de bajo rendimiento en teléfonos modestos.

### Cómo mantener liviano un 3D (objetivo 15-30 MB)
- Estilo low-poly con colores planos, sin texturas pesadas.
- Formas y efectos generados por código.
- Audio comprimido (OGG), pocos efectos y una o dos músicas cortas en bucle.
- Android App Bundle (Google Play entrega solo lo que cada dispositivo necesita).
- Naves y mapas extra descargables bajo demanda.

### Comparación rápida
| Criterio | 2D / 2.5D | 3D low-poly |
|---|---|---|
| Tiempo al MVP | Menor | Mayor |
| Peso de la app | Menor | Mayor (controlable) |
| Batería y rendimiento | Mejor | Exige cuidado |
| Impacto visual | Medio | Alto |
| Necesidad de arte | Baja | Media-alta |
| Complejidad de supervisión | Baja | Media |
| Riesgo antes de validar | Bajo | Mayor |

### Recomendación provisional
Empezar con 2D o 2.5D para validar la jugabilidad y la retención con el menor costo en tiempo, y subir a 3D low-poly en una segunda versión si el juego engancha. Alternativa: 3D desde el inicio si el impacto visual es prioridad, con límite de peso fijado desde el primer día y estilo "low-poly con formas por código, sin texturas".

---

## 6. Alcance del MVP

Incluir solo:
1. Nave que sigue el dedo.
2. Obstáculos que se acercan, con dificultad creciente.
3. Pantalla de game over con reinicio.
4. Monedas por partida.
5. Cofre diario.
6. Revivir viendo un anuncio con recompensa.
7. Medición de retención (Firebase).

Dejar para después: rotación de pantalla avanzada, naves y mapas múltiples, armas, retos de camino, multijugador, ranking.

**Nota:** la rotación de pantalla es el gancho del juego, así que conviene incluir una versión simple en el MVP para comprobar si realmente engancha.

### 6.1 Tiempo de desarrollo estimado (IA escribe el código, la persona supervisa a medio tiempo)

Son estimaciones; dependen de cuántas rondas de prueba y corrección se hagan.

| Etapa | Tiempo estimado (2D) |
|---|---|
| Prototipo jugable (nave, obstáculos, game over) | 2 a 5 días |
| MVP completo (monedas, cofre diario, anuncio con recompensa, rotación simple, Firebase, textos en varios idiomas) | 2 a 4 semanas |
| Contenido extra (varias naves y mapas, armas, retos de camino, misiones) | 4 a 8 semanas más |
| Jefe final con 3 armas (el primero) | 1 a 2 semanas más; los siguientes jefes, menos |
| Multijugador y ranking mundial | 1 a 3 meses más (lo más complejo) |
| Sobrecosto de pasar a 3D | +30% a +50% sobre el tiempo, sobre todo por arte y pruebas de rendimiento |

**Qué frena más que el código**
- Las pruebas en celular real (toque, rotación, anuncios): los errores aparecen ahí y la IA no los ve sola.
- Google Play puede exigir un periodo de pruebas cerradas antes de publicar si la cuenta es personal y reciente. Revisar en Play Console desde ya.

**Sobre la cantidad de niveles**
No hace falta construir cientos de niveles a mano (es lo más caro). Para que sigan jugando y regresen funciona mejor:
- **Modo infinito con dificultad generada por código:** nunca se acaba y la IA lo implementa con facilidad.
- **Reto del día y misiones diarias:** el principal motivo para volver cada día.
- **Contenido nuevo cada 2 semanas:** una nave, un mapa o un evento; mantiene viva la app con poco trabajo.
- **Colección y ranking:** el "me falta una" y el "quiero subir" retienen más que el número de niveles.

**Criterio:** no medir el avance en niveles. Publicar en 3 a 4 semanas con modo infinito y dejar que los datos de retención indiquen dónde invertir las semanas siguientes.

---

## 7. Modelo de ingresos y números de referencia

- Los juegos casuales con anuncios suelen generar centavos de dólar por usuario activo diario, con mucha variación por país y formato.
- Referencia aproximada: 300.000 COP (~US$75/mes) saldrían de unos 50 a 150 usuarios activos al día entre todos los juegos; 100.000 COP, de unos 20 a 50.
- Un juego con buena retención se mejora; uno sin ella se descarta rápido.
- Es un ingreso complementario que crece lento; no hay que contar con él desde el primer mes.

### Métricas a medir desde el primer día
- Retención al día 1 y al día 7.
- Usuarios activos diarios.
- Ingreso por usuario activo (por tipo de anuncio).
- Porcentaje de jugadores que aceptan anuncios con recompensa.
- Dónde abandonan los jugadores (nivel o momento de la partida).

---

## 8. Costos estimados

| Concepto | Costo |
|---|---|
| Cuenta de Google Play | US$25, pago único (ya existe) |
| AdMob | Gratis (Google se queda con parte de lo que paga el anunciante) |
| Firebase (analítica, nube) | Gratis al inicio |
| Cuenta de Apple (si se hace iOS) | US$99/año |
| Arte 3D (si se usa) | Gratis con paquetes libres, o pago por modelos propios |
| Dominio y página (política de privacidad) | Unos US$15-60/año, o gratis con alojamiento simple |
| Traducciones | Gratis con IA, con revisión de calidad |

El costo principal es tiempo.

---

## 9. Requisitos para publicar

- Política de privacidad (obligatoria con anuncios), publicada en una URL.
- Ficha de la tienda traducida: título, descripción, capturas y video.
- Clasificación de contenido y declaración de seguridad de datos en Play Console.
- Configurar AdMob y vincularlo a la app.
- Cumplir las políticas de anuncios de Google (no pedir clics, no colocar anuncios donde se toquen por error).
- Probar en varios tamaños de pantalla y en teléfonos de gama baja.

---

## 10. Riesgos y cómo manejarlos

| Riesgo | Manejo |
|---|---|
| Google Play marca como contenido repetitivo o spam si hay muchas apps casi idénticas | Que cada juego tenga mecánica e identidad distintas, o reunir varios en una sola app |
| El tráfico no llega (el problema real no es hacer el juego) | Videos cortos, optimización de la ficha (ASO), pedir reseñas dentro de la app, iterar con feedback de los usuarios actuales |
| Mercado saturado de juegos de esquivar | Diferenciar con la rotación de pantalla, modos y ranking |
| Anuncios muy intrusivos bajan la retención | Priorizar anuncios con recompensa opcional y topes de frecuencia |
| Rendimiento bajo en teléfonos modestos | Calidad gráfica ajustable, pruebas en gama baja |
| Dependencia de la IA para el código | Revisar el código con regularidad, pedir pruebas automáticas y mantener el proyecto organizado |
| Límite de iOS con Kotlin nativo | Decidir con datos tras el MVP si se reescribe |

---

## 11. Hoja de ruta sugerida

1. **Decidir 2D vs 3D** (ver sección 5).
2. **Prototipo mínimo jugable:** nave, obstáculos, game over.
3. **Añadir monedas, cofre diario y anuncio con recompensa; integrar Firebase.**
4. **Prueba con usuarios:** los 40 actuales y un grupo cercano; medir retención.
5. **Publicar en Play Store** con ficha traducida a varios idiomas.
6. **Iterar según los datos:** retención, abandonos, ingreso por usuario.
7. **Segundo y tercer juego**, reutilizando la base técnica y las lecciones aprendidas.
8. **Evaluar multijugador, ranking mundial e iOS** cuando haya datos.

---

## 12. Decisiones pendientes

- [ ] Estilo gráfico del primer juego: 2D, 2.5D o 3D low-poly.
- [ ] Nombre del juego y de la marca (o si se publica bajo la app actual).
- [ ] Si el primer juego se publica como app nueva o como actualización de la app existente.
- [ ] Idiomas iniciales (por ejemplo, español, inglés, portugués, y los siguientes por mercado).
- [ ] Límite de peso objetivo de la app.
- [ ] Qué dato de la app actual se puede aprovechar (usuarios que vuelven cada semana, si ya tiene anuncios).
- [ ] Cuándo decidir sobre multijugador e iOS (qué métrica dispara la decisión).
- [ ] Revisar en Play Console si la cuenta exige periodo de pruebas cerradas antes de publicar.
- [ ] Definir el ritmo de contenido nuevo (por ejemplo, una nave o mapa cada 2 semanas).
- [ ] Balance del jefe: vida, daño de cada arma y tiempo de carga del Especial (30 s en la demo, 60 s en el juego real).
- [ ] Umbral para desbloquear al jefe (40 monedas en una partida en la demo).
- [ ] Cuántos jefes habrá y cada cuánto sale uno nuevo (jefe del día o de la semana con ranking).

---

## 13. Primeras pruebas de la demo web y siguientes mejoras

### Feedback de 4 personas
| Reacción | Personas |
|---|---|
| Les gustó | 2 |
| "Está bien, es medio entretenido" | 1 |
| No ve dónde generar retención ni cómo monetizar ni 100 mil pesos al mes | 1 |

**Lectura:** lo visual y la jugabilidad convencen. La crítica sobre retención y monetización es válida: una demo de un minuto no muestra lo que genera ingresos, que son muchas partidas por día durante varios días. Hay que agregar lo que la demo todavía no tiene.

### Cómo responder a la crítica de retención y monetización
1. **Progresión visible:** nivel de jugador, naves y armas con mejoras.
2. **Un motivo para volver cada día:** cofre diario, reto del día y jefe del día con ranking.
3. **Más de un anuncio natural por sesión:** revivir, duplicar monedas y recargar el arma especial del jefe.
4. **Una meta clara:** el jefe final desbloqueado por puntos (ya se puede probar en la demo).

### Mejoras priorizadas para el MVP web
1. Jefe final con armas Básica, Pesada y Especial (hecho en la demo; falta balancearlo con testers).
2. Nivel de jugador y desbloqueo de armas con puntos o monedas.
3. Jefe del día o de la semana con ranking (aunque sea local al inicio).
4. Sonido, vibración y efectos al golpear (es lo que más cambia cómo se siente el juego y la demo aún no lo tiene).
5. Medir retención al día 1 y al día 7 y el porcentaje de jugadores que aceptan anuncios con recompensa.
6. Repetir la prueba con más personas y con preguntas concretas.

### Preguntas para la siguiente ronda de pruebas
- ¿Volverías a jugar mañana? ¿Qué te haría volver?
- ¿Llegaste al jefe? ¿Se sintió justo o muy difícil?
- ¿Qué anuncio no te molestaría ver y cuál sí?
- ¿Qué arma usaste más y por qué?
