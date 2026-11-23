/** Textos en inglés: ver core/i18n.js. clave (el texto en español, tal cual está en el código) → traducción.
    Esta parte: taller, cofre y misiones, rango de piloto, tienda, métricas, mapas, mundos y lobby. */
export default {
  /* comunes */
  Nave: 'Ship',
  Cerrar: 'Close',
  'Nivel {n}': 'Level {n}',

  /* lobby (ui/menu.js) */
  '{fire} racha 1 día': '{fire} 1-day streak',
  '{fire} racha {n} días': '{fire} {n}-day streak',
  '{star} Mundos: {n} de {total}': '{star} Worlds: {n} of {total}',
  '{timer} Supervivencia: {time}': '{timer} Survival: {time}',
  '{star} Aún sin récord: ¡juega tu primera partida!': '{star} No record yet: play your first run!',

  /* mapas de Supervivencia (ui/maps.js) */
  '{timer} Supervivencia': '{timer} Survival',
  'Elige el mapa, o deja que te sorprenda. Las reglas son las mismas en todos.':
    'Pick a map, or let it surprise you. The rules are the same on all of them.',
  'Al azar': 'Random',
  'No sabes cuál te va a tocar': "You won't know which one you get",

  /* mundos (ui/worlds.js) */
  '{name} · {n} de {total} completados': '{name} · {n} of {total} completed',
  '{rocket} Mundos': '{rocket} Worlds',
  'Cada mundo tiene su paisaje, sus enemigos y un jefe. Vence al jefe para abrir el siguiente.':
    'Each world has its own scenery, enemies and a boss. Beat the boss to unlock the next one.',
  Próximamente: 'Coming soon',
  '{lock} Vence al jefe de {name}': '{lock} Beat the boss of {name}',
  '{check} Jefe vencido ×{n} · jugar de nuevo': '{check} Boss beaten ×{n} · play again',
  '{check} Jefe vencido · jugar de nuevo': '{check} Boss beaten · play again',
  '{play} Jugar': '{play} Play',
  '{play} Ver en modo demo': '{play} View in demo mode',

  /* métricas (ui/stats.js) */
  'Aún sin partidas': 'No runs yet',
  'Mundos (de {total})': 'Worlds (of {total})',
  'Jefes vencidos': 'Bosses beaten',
  'Racha (día)': 'Streak (day)',
  'Racha (días)': 'Streak (days)',
  'Misiones hoy': 'Missions today',
  '{timer} Supervivencia: mejores tiempos': '{timer} Survival: best times',
  '{planet} Viaje espacial: mejores distancias': '{planet} Space Trip: best distances',
  '{puzzle} Piezas de la nave': '{puzzle} Ship parts',
  '{n} de {total}': '{n} of {total}',
  '{calendar} Días que has jugado': '{calendar} Days played',

  /* rango de piloto (ui/pilot.js) */
  '<b>{name}</b> nivel {n}': '<b>{name}</b> level {n}',
  'Nivel {n} · {x} / {total} de experiencia': 'Level {n} · {x} / {total} XP',
  'nivel {n}': 'level {n}',
  'Al subir de nivel': 'On level up',
  'Ascenso a {name} (nivel {n})': 'Promotion to {name} (level {n})',
  'Al llegar al nivel {n}': 'At level {n}',
  'una pieza {rarity}': '1 {rarity} part',
  '+{x} de experiencia': '+{x} XP',
  '¡Ascenso a {name}!': 'Promoted to {name}!',
  '¡Nivel {n}!': 'Level {n}!',
  '+{c} {coin} y una pieza: {name} ({rarity})': '+{c} {coin} and a part: {name} ({rarity})',
  ASCENSO: 'PROMOTION',
  'Pieza nueva: {name} ({rarity})': 'New part: {name} ({rarity})',
  'Toca para seguir': 'Tap to continue',

  /* cofre y misiones (ui/daily.js) */
  'Cofre diario': 'Daily Chest',
  '{fire} Racha: 1 día · si faltas un día, solo retrocede un paso':
    '{fire} Streak: 1 day · miss a day and it only drops one step',
  '{fire} Racha: {n} días · si faltas un día, solo retrocede un paso':
    '{fire} Streak: {n} days · miss a day and it only drops one step',
  'Día {n}': 'Day {n}',
  'El día 7 trae además una pieza rara o épica para tu nave.': 'Day 7 also brings a rare or epic part for your ship.',
  'Abrir cofre del día {n} · +{c} {coin}': 'Open day {n} chest · +{c} {coin}',
  '{gift} Pieza nueva: {name} ({rarity})': '{gift} New part: {name} ({rarity})',
  '{check} Duplicado': '{check} Doubled',
  '{play} Duplicar con anuncio · +{c} {coin}': '{play} Double with an ad · +{c} {coin}',
  '{play} Duplicar · +{c} {coin}': '{play} Double · +{c} {coin}',
  'Vuelve mañana: día {n} · +{c} {coin} y una pieza': 'Come back tomorrow: day {n} · +{c} {coin} and a part',
  'Vuelve mañana: día {n} · +{c} {coin}': 'Come back tomorrow: day {n} · +{c} {coin}',
  '{bell} Avísame mañana cuando esté listo': "{bell} Remind me tomorrow when it's ready",
  '{clipboard} Misiones de hoy': "{clipboard} Today's Missions",
  'Cambian cada día: una por modo de juego.': 'They change every day: one per game mode.',
  'Completa las tres': 'Complete all three',
  'Misiones de hoy': "Today's missions",
  '¡Misión completada! +{c} {coin}': 'Mission complete! +{c} {coin}',
  '{party} ¡Las tres misiones! +{c} {coin}': '{party} All three missions! +{c} {coin}',
  'En modo demo las misiones no avanzan.': "Missions don't progress in demo mode.",
  'Recompensa: duplicar el cofre diario (+{c} {coin})': 'Reward: double the daily chest (+{c} {coin})',

  /* taller (ui/garage.js) */
  Cuerpo: 'Body',
  Estilo: 'Style',
  Combate: 'Combat',
  Todas: 'All',
  Mías: 'Mine',
  'Tienes {n} de {total}': 'You own {n} of {total}',
  puesta: 'equipped',
  'es tuya': 'owned',
  'solo en {name}': 'only in {name}',
  '{check} Puesta': '{check} Equipped',
  Equipar: 'Equip',
  'Equipar (demo)': 'Equip (demo)',
  'Se consigue {dates}': 'Available {dates}',
  'Comprar · {coin} {n}': 'Buy · {coin} {n}',
  'Te faltan {coin} {n} · Tienda': 'Need {coin} {n} more · Shop',
  'Tu meta': 'Your goal',
  Meta: 'Goal',
  'Es tu meta: el lobby te dirá cuánto te falta': 'Your goal: the lobby shows how much you still need',
  'De {name}: se consigue {dates}': '{name} item: available {dates}',
  'Oferta de la semana: −{n} % hasta el domingo': 'Deal of the week: −{n}% until Sunday',
  'Su paquete (aparte): {x}': 'Its pack (sold separately): {x}',
  'y##entre dos nombres': 'and',
  'Llevas una nave única: equipar algo de aquí te devuelve a la armable':
    "You're flying a unique ship: equipping anything here brings back your custom build",
  'Disparos de muestra: así se ven las tres armas': 'Sample shots: this is how the three weapons look',
  'Toca una explosión para verla': 'Tap an explosion to see it',
  'Desliza para girar · flechas para cambiar de pieza': 'Swipe to rotate · arrows to change part',

  /* tienda (ui/shop.js) */
  'Las compras solo funcionan en la versión instalada desde Google Play.':
    'Purchases only work in the version installed from Google Play.',
  'Se quita la franja de anuncios y recibes las recompensas sin ver videos.':
    'Removes the ad banner and gives you the rewards without watching videos.',
  'Se quita la franja de anuncios y recibes las recompensas sin ver videos. Se puede renovar.':
    'Removes the ad banner and gives you the rewards without watching videos. Can be renewed.',
  '+{n} monedas': '+{n} coins',
  '{n} monedas': '{n} coins',
  '{name} · rinde {n} % más': '{name} · {n}% more value',
  'Ya no hace falta: tienes "para siempre".': 'No longer needed: you have "forever".',
  'Activo: te queda 1 día. Comprar suma {x} más.': 'Active: 1 day left. Buying adds {x} more.',
  'Activo: te quedan {n} días. Comprar suma {x} más.': 'Active: {n} days left. Buying adds {x} more.',
  '{check} Activo': '{check} Active',
  '¡Listo! Recibiste: {x}.': 'Done! You got: {x}.',
  'Tu pago está en proceso. Lo recibes apenas Google lo confirme.':
    "Your payment is processing. You'll get it as soon as Google confirms it.",
  'No pudimos confirmar la compra ahora. Si se cobró, se entrega sola cuando haya conexión.':
    "We couldn't confirm the purchase right now. If you were charged, it will be delivered automatically once you're online.",
  'Abriendo Google Play…': 'Opening Google Play…',
  'No se pudo abrir el pago. Intenta de nuevo.': "Couldn't open the payment. Try again.",
  'Confirmando tu compra…': 'Confirming your purchase…',
  'Pagar {price} (simulado)': 'Pay {price} (simulated)',
};
