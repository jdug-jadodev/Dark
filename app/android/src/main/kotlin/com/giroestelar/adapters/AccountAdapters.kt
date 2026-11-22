package com.giroestelar.adapters

import android.app.Activity
import android.content.Context
import android.os.CancellationSignal
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import android.util.Log
import androidx.credentials.CredentialManager
import androidx.credentials.CredentialManagerCallback
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.GetCredentialException
import com.giroestelar.application.Account
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Lo que el puente necesita de la cuenta. */
interface AccountControl {
    /** ¿Esta app tiene configurado el inicio con Google? */
    fun ready(): Boolean

    /** Abre el inicio de sesión de Google; la respuesta le llega al juego por `window.__giroGoogle`. */
    fun signIn(nonce: String)

    fun secret(): String

    fun setSecret(value: String)
}

/**
 * La llave de sesión del jugador, guardada cifrada.
 *
 * Se cifra con una clave que vive en el almacén de claves de Android (AndroidKeyStore): esa clave
 * no se puede sacar del teléfono, ni siquiera la app la ve; solo puede pedirle que cifre o
 * descifre. Así, quien copie los archivos de la app (una copia de seguridad, un teléfono con
 * permisos de administrador) se lleva un texto que no sirve en ningún otro lado.
 * Si algo falla al descifrar (por ejemplo, tras restaurar una copia en otro teléfono), se borra
 * y el jugador simplemente vuelve a entrar.
 */
class SessionVault(context: Context) {
    private val prefs = context.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    fun get(): String = try {
        val saved = prefs.getString(KEY, null)?.split(":")
        if (saved == null || saved.size != 2) {
            ""
        } else {
            val cipher = Cipher.getInstance(TRANSFORM)
            cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(TAG_BITS, Base64.decode(saved[0], Base64.NO_WRAP)))
            String(cipher.doFinal(Base64.decode(saved[1], Base64.NO_WRAP)), Charsets.UTF_8)
        }
    } catch (e: Exception) {
        clear()
        ""
    }

    fun set(value: String) {
        if (!Account.validSecret(value)) return clear()
        try {
            val cipher = Cipher.getInstance(TRANSFORM)
            cipher.init(Cipher.ENCRYPT_MODE, key())
            val text = Base64.encodeToString(cipher.iv, Base64.NO_WRAP) + ":" +
                Base64.encodeToString(cipher.doFinal(value.toByteArray(Charsets.UTF_8)), Base64.NO_WRAP)
            prefs.edit().putString(KEY, text).apply()
        } catch (e: Exception) {
            clear()
        }
    }

    private fun clear() = prefs.edit().remove(KEY).apply()

    private fun key(): SecretKey {
        val store = KeyStore.getInstance(STORE).apply { load(null) }
        (store.getKey(ALIAS, null) as? SecretKey)?.let { return it }
        val spec = KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .build()
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, STORE).apply { init(spec) }.generateKey()
    }

    private companion object {
        const val FILE = "giro_cuenta" // este archivo no entra en las copias de seguridad (res/xml)
        const val KEY = "sesion"
        const val ALIAS = "giro_estelar_sesion"
        const val STORE = "AndroidKeyStore"
        const val TRANSFORM = "AES/GCM/NoPadding"
        const val TAG_BITS = 128
    }
}

/**
 * Entrar con Google usando el sistema de Android (Credential Manager): el jugador elige su cuenta
 * en una ventana del propio teléfono; la app nunca ve su contraseña. Devuelve el comprobante
 * firmado por Google, hecho para nuestro servidor ([clientId]) y con el número de un solo uso.
 */
class GoogleSignIn(private val activity: Activity, private val clientId: String) {
    fun ready(): Boolean = clientId.isNotEmpty()

    /** [reply] recibe el comprobante, o vacío si el jugador canceló o algo falló. Siempre en el hilo principal. */
    fun start(nonce: String, reply: (String) -> Unit) {
        if (!ready() || !Account.validNonce(nonce)) return reply("")
        try {
            val option = GetSignInWithGoogleOption.Builder(clientId).setNonce(nonce).build()
            val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
            CredentialManager.create(activity).getCredentialAsync(
                activity,
                request,
                CancellationSignal(),
                { task -> activity.runOnUiThread(task) },
                object : CredentialManagerCallback<GetCredentialResponse, GetCredentialException> {
                    override fun onResult(result: GetCredentialResponse) = reply(tokenOf(result))

                    override fun onError(e: GetCredentialException) {
                        /* por qué no se pudo (canceló, la app no está registrada en Google…): al registro, para diagnosticar */
                        Log.w(TAG, "Inicio con Google: ${e.type} · ${e.message}")
                        reply("")
                    }
                },
            )
        } catch (e: Exception) {
            Log.w(TAG, "Inicio con Google: ${e.javaClass.simpleName} · ${e.message}")
            reply("")
        }
    }

    private companion object { const val TAG = "GiroEstelar" }

    private fun tokenOf(result: GetCredentialResponse): String = try {
        val c = result.credential
        if (c is CustomCredential && c.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
            Account.safeToken(GoogleIdTokenCredential.createFrom(c.data).idToken)
        } else {
            ""
        }
    } catch (e: Exception) {
        ""
    }
}
