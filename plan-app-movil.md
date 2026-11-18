# Plan: app móvil de Giro Estelar

## Decisión (2026-11-18)

La app es **Kotlin nativo + el mismo juego del HTML (Three.js) dentro de un WebView**.

- Se probó primero rehacer los gráficos en libGDX: en el celular se veían muy distintos al HTML y se descartó. La regla es que **la app debe verse exactamente igual al HTML**, y la única forma de garantizarlo es usar el mismo código 3D.
- Esto cambia lo que decía `plan-de-negocio-juegos.md` (Kotlin + libGDX): Kotlin y Android Studio se mantienen; libGDX no.
- El intento con libGDX quedó apartado en `app/descartado-libgdx/` (no se compila). Se puede borrar.

## Cómo trabajamos

- **`demo-juego.html` es el juego.** Ahí se prueba y ahí vive: reglas, 3D, menús.
- **`app/` es el cascarón nativo.** En cada compilación, Gradle copia `demo-juego.html` a la app (tarea `syncGame`) cambiando solo de dónde carga Three.js: de internet al archivo incluido en la app. No hay que pasar nada a mano.
- El HTML detecta si corre dentro de la app (`window.GiroNative`): si sí, usa el guardado nativo y la vibración; si no, funciona en el navegador como siempre.
- La retención se ve después (`plan-retencion-y-negocio-giro-estelar.md`). El multijugador está en `plan-multijugador.md`.

## Medición en un celular real (Galaxy A56, pantalla de 120 Hz)

| | Resultado |
|---|---|
| Fluidez jugando Aventura | 100–106 cuadros por segundo |
| Resolución de dibujo | 823×1613 (el juego limita la densidad a 2× para cuidar el rendimiento) |
| Tamaño del APK de prueba | 1,5 MB |
| Internet para abrir | No hace falta (Three.js va dentro de la app) |

Pendiente: medir en un celular de gama baja y en partidas largas (nivel 20+ de Supervivencia, jefe final).

## Arquitectura

```
demo-juego.html            El juego (laboratorio y fuente única)
app/
  android/
    src/main/assets/game/
      three.min.js         Three.js r128 incluido en la app
      index.html           copia generada de demo-juego.html (no se edita, no va a git)
    src/main/kotlin/com/giroestelar/
      application/GameHost.kt        reglas del lado nativo + puertos (Kotlin puro, con pruebas)
                                       puertos: GameStateStore (guardado), Haptics (vibración)
      adapters/AndroidAdapters.kt    SharedPreferences, vibrador y el puente con el juego (GiroNative)
      MainActivity.kt                punto de armado: crea adaptadores, WebView, "atrás", pausa
    src/test/...                     pruebas de GameHost
  descartado-libgdx/       intento anterior, fuera de la compilación
```

Arquitectura hexagonal en el lado nativo: `GameHost` no conoce Android; solo usa puertos. Los adaptadores son intercambiables (por ejemplo, AdMob entrará como un puerto `RewardedAds` con su adaptador).

**Límite honesto:** las reglas del juego están en JavaScript dentro del HTML, en un solo archivo. Ordenar ese JavaScript por capas (dominio, render, entrada) es un trabajo aparte; conviene hacerlo cuando el diseño del juego esté más quieto, porque hoy cambia en cada sesión.

## Puente entre el juego y la app

| Desde el juego (JavaScript) | Qué hace en Kotlin |
|---|---|
| `GiroNative.loadState()` / `saveState(json)` | Lee y guarda el progreso en SharedPreferences |
| `GiroNative.haptic(ms)` | Vibra (hoy: al chocar) |
| `GiroNative.isDebug()` | Activa el medidor de fluidez en versiones de prueba |

| Desde la app (Kotlin) | Qué hace en el juego |
|---|---|
| `window.__giroBack()` | "Atrás" del sistema: pausa, reanuda o cierra el cofre; si no lo usa, la app se cierra |
| `window.__giroPause()` | Pausa cuando la app sale de pantalla |

## Estado

| Parte | Estado |
|---|---|
| Juego completo dentro de la app (los 3 modos, jefes, agujeros negros, nitro, casco, portales…) | **Hecho** (es el HTML) |
| Guardado nativo, vibración, "atrás", pausa al salir, pantalla siempre encendida, pantalla completa | **Hecho** |
| Sin conexión | **Hecho** |
| AdMob real (banner + anuncios con recompensa) | Pendiente: hoy los anuncios son los simulados del HTML |
| Ícono, nombre e imagen de inicio propios | Pendiente |
| Sonido y música | Pendiente (el HTML tampoco tiene) |
| Firma de la app y Android App Bundle para Play Store | Pendiente |
| Prueba en gama baja y ajuste de calidad gráfica | Pendiente |
| Retención | Después |
| Multijugador | Después |

## Cómo compilar y probar

Desde `app/` (o abriéndola en Android Studio):

```
gradlew.bat :android:testDebugUnitTest   # pruebas del lado nativo
gradlew.bat :android:assembleDebug       # APK en android/build/outputs/apk/debug/android-debug.apk
gradlew.bat :android:installDebug        # instala en el celular conectado (USB o depuración inalámbrica)
```

Para ver la fluidez en una versión de prueba: `adb logcat -s GiroEstelar` muestra una línea `FPS=…` cada 3 segundos.
