package com.giroestelar.adapters

import android.Manifest
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import com.giroestelar.MainActivity
import com.giroestelar.R
import com.giroestelar.application.ReminderAlarm
import com.giroestelar.application.ReminderStore
import com.giroestelar.application.Reminders
import java.time.LocalDateTime
import java.time.ZoneId

/** Lo que el recordatorio guarda entre un día y otro (SharedPreferences propio). */
class PrefsReminderStore(context: Context) : ReminderStore {
    private val prefs = context.getSharedPreferences("giro_estelar_recordatorio", Context.MODE_PRIVATE)
    override var enabled: Boolean
        get() = prefs.getBoolean("enabled", false)
        set(v) = prefs.edit().putBoolean("enabled", v).apply()
    override var lastOpenDay: Long
        get() = prefs.getLong("lastOpenDay", -1)
        set(v) = prefs.edit().putLong("lastOpenDay", v).apply()
    override var unanswered: Int
        get() = prefs.getInt("unanswered", 0)
        set(v) = prefs.edit().putInt("unanswered", v).apply()
    override var streak: Int
        get() = prefs.getInt("streak", 0)
        set(v) = prefs.edit().putInt("streak", v).apply()
    override var cupRank: Int
        get() = prefs.getInt("cupRank", 0)
        set(v) = prefs.edit().putInt("cupRank", v).apply()
}

/**
 * La alarma del sistema que despierta a la app para avisar. No es exacta al minuto (no hace
 * falta, y así no se necesita un permiso especial): Android la entrega cerca de la hora pedida.
 */
class AndroidReminderAlarm(private val context: Context) : ReminderAlarm {
    private val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    private fun intent(): PendingIntent =
        PendingIntent.getBroadcast(
            context,
            0,
            Intent(context, ReminderReceiver::class.java).setAction(ACTION),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

    override fun setAt(time: LocalDateTime) {
        val at = time.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
        alarms.setWindow(AlarmManager.RTC_WAKEUP, at, WINDOW_MS, intent())
    }

    override fun cancel() = alarms.cancel(intent())

    companion object {
        const val ACTION = "com.giroestelar.RECORDATORIO"
        const val WINDOW_MS = 15 * 60 * 1000L
    }
}

fun reminders(context: Context) = Reminders(PrefsReminderStore(context), AndroidReminderAlarm(context))

/** ¿La app puede mostrar avisos? (desde Android 13 hay que pedir permiso) */
fun canNotify(context: Context): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
        context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

/** Suena la alarma (o el teléfono se reinició): decide si avisa y deja lista la siguiente. */
class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val rules = reminders(context)
        val now = LocalDateTime.now()
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            rules.restore(now)
            return
        }
        val text = rules.alarmFired(now) ?: return
        if (canNotify(context)) show(context, text)
    }

    private fun show(context: Context, text: String) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL, "Recordatorio diario", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "Un aviso al día, solo si no has jugado"
            },
        )
        val open = PendingIntent.getActivity(
            context,
            1,
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = Notification.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_ship)
            .setContentTitle("Giro Estelar")
            .setContentText(text)
            .setStyle(Notification.BigTextStyle().bigText(text))
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        manager.notify(NOTIFICATION_ID, notification)
    }

    private companion object {
        const val CHANNEL = "recordatorio"
        const val NOTIFICATION_ID = 1
    }
}
