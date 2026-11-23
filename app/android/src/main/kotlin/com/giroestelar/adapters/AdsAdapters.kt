package com.giroestelar.adapters

import android.app.Activity
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.view.View
import android.widget.FrameLayout
import com.giroestelar.BuildConfig
import com.giroestelar.application.Ads
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdListener
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform

/**
 * Lo que el puente necesita de los anuncios.
 * El resultado de un video llega después, por `window.__giroAd('earned' | 'closed' | 'none')`.
 */
interface AdsControl {
    /** ¿Esta app trae anuncios de verdad? (si no, el juego muestra los suyos de mentira) */
    fun ready(): Boolean

    /** El jugador pidió un video con premio. */
    fun show()

    /** Encender o apagar la franja de abajo (quien compró "Sin anuncios" no la ve). */
    fun banner(on: Boolean)

    /** ¿A este jugador hay que ofrecerle cambiar su elección de privacidad? */
    fun privacyNeeded(): Boolean

    fun openPrivacy()
}

/** ¿La franja estaba encendida la última vez? Así la pantalla queda bien armada desde que abre. */
fun bannerWasOn(context: Context): Boolean =
    context.getSharedPreferences(ADS_PREFS, Context.MODE_PRIVATE).getBoolean(ADS_BANNER, true)

private const val ADS_PREFS = "giro_estelar_anuncios"
private const val ADS_BANNER = "franja"

/**
 * Anuncios con AdMob: un video con premio (lo pide el jugador) y una franja debajo del juego.
 *
 * Antes de pedir el primer anuncio se le pregunta a Google si a este jugador hay que pedirle
 * permiso (Europa y otros lugares con esa ley); si hace falta, Google muestra su propia ventana.
 * Hasta que eso no esté resuelto no se pide ningún anuncio.
 *
 * El video se va cargando por adelantado para que salga apenas el jugador lo pida. Si no estaba
 * listo, se espera unos segundos; si no llega, se le contesta al juego que no hay.
 *
 * Todos los métodos se llaman en el hilo principal. [strip] es el espacio de la franja.
 */
class AdMobAds(
    private val activity: Activity,
    private val strip: FrameLayout,
    debuggable: Boolean,
    private val reply: (String) -> Unit,
) {
    private val videoUnit = Ads.unit(BuildConfig.ADS_VIDEO, Ads.TEST_VIDEO, debuggable)
    private val bannerUnit = Ads.unit(BuildConfig.ADS_BANNER, Ads.TEST_BANNER, debuggable)
    private val prefs = activity.getSharedPreferences(ADS_PREFS, Context.MODE_PRIVATE)
    private val consent: ConsentInformation = UserMessagingPlatform.getConsentInformation(activity)
    private val handler = Handler(Looper.getMainLooper())

    private var asking = false // preguntándole a Google por el permiso del jugador
    private var started = false // la librería de anuncios ya arrancó
    private var alive = true

    private var video: RewardedAd? = null
    private var videoAt = 0L
    private var loading = false
    private var waiting = false // el jugador pidió un video y todavía se está cargando
    private var showing = false
    private val giveUp = Runnable { if (waiting) finish("none") }

    private var wantBanner = bannerWasOn(activity)
    private var banner: AdView? = null

    @Volatile private var privacy = false

    init {
        strip.layoutParams.height = bannerSize().getHeightInPixels(activity)
        strip.visibility = if (wantBanner) View.VISIBLE else View.GONE
    }

    /** Al abrir la app: resolver el permiso y, si se puede, arrancar los anuncios. */
    fun start() {
        if (started || asking) return
        asking = true
        val after = {
            asking = false
            privacy = consent.privacyOptionsRequirementStatus == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED
            if (consent.canRequestAds()) begin()
        }
        consent.requestConsentInfoUpdate(
            activity,
            ConsentRequestParameters.Builder().build(),
            {
                if (!alive) return@requestConsentInfoUpdate
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity) { error ->
                    if (error != null) Log.w(TAG, "Anuncios, permiso: ${error.errorCode} · ${error.message}")
                    after()
                }
            },
            { error ->
                Log.w(TAG, "Anuncios, consulta del permiso: ${error.errorCode} · ${error.message}")
                after()
            },
        )
        /* el jugador ya había contestado en otra ocasión: no hay que esperar la consulta */
        if (consent.canRequestAds()) begin()
    }

    private fun begin() {
        if (started || !alive) return
        started = true
        Thread {
            MobileAds.initialize(activity) {
                handler.post {
                    if (!alive) return@post
                    loadVideo()
                    showBanner()
                }
            }
        }.start()
    }

    /* ---------- video con premio ---------- */

    fun show() {
        if (showing || waiting) return
        if (!started) {
            start() // quizá al abrir no había conexión: se intenta otra vez para la próxima
            return reply("none")
        }
        if (video != null && !Ads.fresh(videoAt, SystemClock.elapsedRealtime())) video = null
        if (video != null) return play()
        waiting = true
        handler.postDelayed(giveUp, Ads.WAIT_MS)
        loadVideo()
    }

    private fun loadVideo() {
        if (!started || !alive || loading || video != null) return
        loading = true
        RewardedAd.load(
            activity,
            videoUnit,
            AdRequest.Builder().build(),
            object : RewardedAdLoadCallback() {
                override fun onAdLoaded(ad: RewardedAd) {
                    loading = false
                    video = ad
                    videoAt = SystemClock.elapsedRealtime()
                    if (waiting) play()
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    loading = false
                    Log.w(TAG, "Anuncios, cargar el video: ${error.code} · ${error.message}")
                    if (waiting) finish("none")
                }
            },
        )
    }

    private fun play() {
        val ad = video ?: return finish("none")
        video = null
        waiting = false
        handler.removeCallbacks(giveUp)
        if (!alive) return
        showing = true
        var shown = false
        var earned = false
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdShowedFullScreenContent() {
                shown = true
            }

            override fun onAdDismissedFullScreenContent() = finish(Ads.result(true, earned))

            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                Log.w(TAG, "Anuncios, mostrar el video: ${error.code} · ${error.message}")
                finish(Ads.result(shown, earned))
            }
        }
        ad.show(activity) { earned = true }
    }

    /* contarle al juego en qué terminó, y dejar cargando el siguiente */
    private fun finish(result: String) {
        waiting = false
        showing = false
        handler.removeCallbacks(giveUp)
        if (!alive) return
        reply(result)
        loadVideo()
    }

    /* ---------- franja de abajo ---------- */

    fun banner(on: Boolean) {
        if (on != wantBanner) prefs.edit().putBoolean(ADS_BANNER, on).apply()
        wantBanner = on
        showBanner()
    }

    private fun showBanner() {
        strip.visibility = if (wantBanner) View.VISIBLE else View.GONE
        if (!wantBanner) {
            banner?.let {
                strip.removeView(it)
                it.destroy()
            }
            banner = null
            return
        }
        if (!started || !alive || banner != null) return
        banner = AdView(activity).also {
            it.adUnitId = bannerUnit
            it.setAdSize(bannerSize())
            it.adListener = object : AdListener() {
                override fun onAdFailedToLoad(error: LoadAdError) {
                    Log.w(TAG, "Anuncios, cargar la franja: ${error.code} · ${error.message}")
                }
            }
            strip.addView(it, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
            it.loadAd(AdRequest.Builder().build())
        }
    }

    /* el tamaño de franja que Google recomienda para el ancho de esta pantalla */
    private fun bannerSize(): AdSize {
        val metrics = activity.resources.displayMetrics
        return AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(activity, (metrics.widthPixels / metrics.density).toInt())
    }

    /* ---------- privacidad ---------- */

    fun privacyNeeded(): Boolean = privacy

    fun openPrivacy() {
        UserMessagingPlatform.showPrivacyOptionsForm(activity) { error ->
            if (error != null) Log.w(TAG, "Anuncios, privacidad: ${error.errorCode} · ${error.message}")
        }
    }

    /* ---------- la app sale de pantalla, vuelve o se cierra ---------- */

    fun pause() {
        banner?.pause()
    }

    fun resume() {
        banner?.resume()
    }

    fun destroy() {
        alive = false
        handler.removeCallbacks(giveUp)
        banner?.destroy()
        banner = null
        video = null
    }

    private companion object { const val TAG = "GiroEstelar" }
}
