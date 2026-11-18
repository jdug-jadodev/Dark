package com.giroestelar.adapters.render

import com.badlogic.gdx.Gdx
import com.badlogic.gdx.graphics.Color
import com.badlogic.gdx.graphics.GL20
import com.badlogic.gdx.graphics.PerspectiveCamera
import com.badlogic.gdx.graphics.Texture
import com.badlogic.gdx.graphics.g3d.Environment
import com.badlogic.gdx.graphics.g3d.ModelBatch
import com.badlogic.gdx.graphics.g3d.ModelInstance
import com.badlogic.gdx.graphics.g3d.attributes.BlendingAttribute
import com.badlogic.gdx.graphics.g3d.attributes.ColorAttribute
import com.badlogic.gdx.graphics.g3d.attributes.TextureAttribute
import com.badlogic.gdx.graphics.g3d.decals.CameraGroupStrategy
import com.badlogic.gdx.graphics.g3d.decals.Decal
import com.badlogic.gdx.graphics.g3d.decals.DecalBatch
import com.badlogic.gdx.graphics.g3d.environment.DirectionalLight
import com.badlogic.gdx.math.MathUtils
import com.badlogic.gdx.math.Matrix4
import com.badlogic.gdx.math.Vector3
import com.badlogic.gdx.utils.Disposable
import com.giroestelar.adapters.ui.UiKit
import com.giroestelar.domain.run.Field
import com.giroestelar.domain.run.RunSession
import kotlin.math.atan
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.tan

/**
 * Dibuja en 3D lo que pasa en el plano de juego del dominio.
 * - Traduce coordenadas: x del juego → X 3D, y del juego → profundidad Z.
 * - La pista se curva a los lados y sube/baja: es solo visual (cerca de la nave la curva vale 0,
 *   así lo que se ve coincide con donde realmente están las cosas).
 */
class WorldRenderer(private val ui: UiKit, private val models: Models3D) : Disposable {
    /* ---------- cámaras y luces ---------- */
    val cam = PerspectiveCamera(72f, 1f, 1f).apply { near = 1f; far = 1700f }
    private val skyCam = PerspectiveCamera(72f, 1f, 1f).apply { near = 5f; far = 9000f }
    private val batch = ModelBatch()
    private val bgColor = Color(Color.valueOf("0a1030"))
    private val fog = ColorAttribute(ColorAttribute.Fog, bgColor)
    private val env = Environment().apply {
        set(ColorAttribute(ColorAttribute.AmbientLight, 0.42f, 0.46f, 0.62f, 1f))
        set(fog)
        add(DirectionalLight().set(1f, 0.98f, 0.95f, 0.45f, -0.75f, -0.55f))
        add(DirectionalLight().set(0.25f, 0.6f, 0.75f, -0.55f, -0.15f, 0.8f))
        add(DirectionalLight().set(0.45f, 0.45f, 0.5f, 0f, -0.4f, -1f))
    }
    private val skyEnv = Environment().apply {
        set(ColorAttribute(ColorAttribute.AmbientLight, 0.35f, 0.38f, 0.5f, 1f))
        add(DirectionalLight().set(1f, 0.97f, 0.92f, 0.5f, -0.7f, -0.5f))
    }
    private val decals = DecalBatch(CameraGroupStrategy(cam))
    private val skyDecals = DecalBatch(CameraGroupStrategy(skyCam))

    private var camY = 180f
    private var camZ = 280f
    private var pitch = 22f * MathUtils.degreesToRadians
    private var camX = 0f
    var shake = 0f

    /* ---------- curvas (solo visuales) ---------- */
    private var bendX = 0f
    private var bendY = 0f
    private var bendTX = 0f
    private var bendTY = 0f
    private var bendTimer = 2f
    private fun bd(z: Float): Float { val d = max(0f, -z) / 1000f; return d * d }
    private fun tanX(z: Float) = if (z < 0f) bendX * 2f * z / 1e6f else 0f
    private fun tanY(z: Float) = if (z < 0f) bendY * 2f * z / 1e6f else 0f
    private fun x3(x: Float) = x - Field.W / 2f
    private fun z3(y: Float) = y - Field.SHIP_Y
    private val tmp = Vector3()

    /** Posición 3D de un punto del plano de juego, siguiendo la curva. */
    fun put(out: Vector3, x: Float, h: Float, y: Float): Vector3 {
        val z = z3(y)
        val b = bd(z)
        return out.set(x3(x) + bendX * b, h + bendY * b, z)
    }

    /* ---------- pista: rieles, postes y piso ---------- */
    private val segments = 36
    private val segLen = 50f
    private fun boxInstance(diffuse: Color, emissive: Color? = null, alpha: Float = 1f) = ModelInstance(models.box).also { mi ->
        val m = mi.materials.first()
        m.set(ColorAttribute.createDiffuse(diffuse))
        if (emissive != null) m.set(ColorAttribute.createEmissive(emissive))
        if (alpha < 1f) m.set(BlendingAttribute(alpha))
    }
    private val rails = List(segments * 2) { boxInstance(Color(0.05f, 0.08f, 0.12f, 1f), Color(0.37f, 0.88f, 1f, 1f)) }
    private val posts = List(segments * 2) { boxInstance(Color(0.05f, 0.08f, 0.12f, 1f), Color(0.37f, 0.88f, 1f, 1f)) }
    private val bars = List(segments) { boxInstance(Color(0.05f, 0.08f, 0.12f, 1f), Color(0.37f, 0.88f, 1f, 1f), 0.25f) }
    private val floor = List(segments) { boxInstance(Color(0.06f, 0.08f, 0.2f, 1f), Color(0.02f, 0.03f, 0.08f, 1f), 0.84f) }
    private var scroll = 0f

    /* ---------- nave ---------- */
    private val ship = ModelInstance(models.ship)
    private val flames = List(2) { ModelInstance(models.flame) }
    private var lastShipX = Field.W / 2
    private var lastShipY = Field.SHIP_Y
    private var vxs = 0f
    private var vys = 0f
    var shipVisible = true

    /* ---------- rocas y monedas (una instancia por id) ---------- */
    private val rockInstances = HashMap<Int, ModelInstance>()
    private val coinInstances = HashMap<Int, ModelInstance>()
    private val alive = HashSet<Int>()

    /* ---------- planetas ---------- */
    private class Planet(val body: ModelInstance, val ring: ModelInstance, val glow: Decal, val low: Boolean) {
        var tex: Texture? = null
        var ringTex: Texture? = null
        var hasRing = false
        var radius = 100f
        var spin = 0.05f
        var angle = 0f
        val pos = Vector3()
    }
    private val planets = List(5) { i ->
        Planet(
            ModelInstance(models.sphere), ModelInstance(models.ring),
            Decal.newDecal(1f, 1f, ui.glow, GL20.GL_SRC_ALPHA, GL20.GL_ONE), low = i >= 3,
        ).also { placePlanet(it, initial = true) }
    }

    private fun placePlanet(p: Planet, initial: Boolean) {
        p.tex?.dispose(); p.ringTex?.dispose()
        val kind = listOf(SpaceTextures.PlanetKind.GAS, SpaceTextures.PlanetKind.GAS, SpaceTextures.PlanetKind.EARTH,
            SpaceTextures.PlanetKind.ICE, SpaceTextures.PlanetKind.LAVA, SpaceTextures.PlanetKind.ROCK).random()
        val tex = SpaceTextures.planet(kind)
        p.tex = tex
        p.body.materials.first().set(TextureAttribute.createDiffuse(tex))
        p.body.materials.first().set(ColorAttribute.createEmissive(if (kind == SpaceTextures.PlanetKind.LAVA) Color(0.45f, 0.15f, 0.02f, 1f) else Color.BLACK))
        p.hasRing = !p.low && kind == SpaceTextures.PlanetKind.GAS && MathUtils.randomBoolean(0.7f)
        if (p.hasRing) { val rt = SpaceTextures.ring(); p.ringTex = rt; p.ring.materials.first().set(TextureAttribute.createDiffuse(rt)) } else p.ringTex = null
        p.glow.color.set(
            when (kind) {
                SpaceTextures.PlanetKind.EARTH -> Color(0.5f, 0.78f, 1f, 0.35f)
                SpaceTextures.PlanetKind.ICE -> Color(0.75f, 0.94f, 1f, 0.35f)
                SpaceTextures.PlanetKind.LAVA -> Color(1f, 0.54f, 0.24f, 0.4f)
                SpaceTextures.PlanetKind.ROCK -> Color(0.6f, 0.6f, 0.65f, 0.15f)
                SpaceTextures.PlanetKind.GAS -> Color().fromHsv(MathUtils.random(360f), 0.5f, 1f).also { it.a = 0.32f }
            },
        )
        p.spin = MathUtils.random(0.02f, 0.08f)
        p.angle = MathUtils.random(6.28f)
        val side = if (MathUtils.randomBoolean()) -1f else 1f
        if (p.low) {
            p.radius = MathUtils.random(220f, 500f)
            p.pos.set(side * MathUtils.random(320f, 1000f), -(p.radius + MathUtils.random(420f, 1050f)),
                if (initial) MathUtils.random(-3400f, -500f) else MathUtils.random(-4400f, -3500f))
        } else {
            p.radius = MathUtils.random(110f, 380f)
            val off = if (p.hasRing) 2.3f * p.radius + 200f else p.radius + 300f
            p.pos.set(side * MathUtils.random(off, off + 600f), MathUtils.random(120f, 650f),
                if (initial) MathUtils.random(-4600f, -1800f) else MathUtils.random(-5600f, -4600f))
        }
    }

    /* ---------- partículas ---------- */
    private class Spark(var x: Float, var y: Float, var h: Float, var vx: Float, var vy: Float, var vh: Float, var life: Float, val max: Float, val color: Color, val size: Float)
    private val sparks = ArrayList<Spark>()
    private val sparkDecals = ArrayList<Decal>()

    /** Explosión de chispas en un punto del plano de juego. */
    fun burst(x: Float, y: Float, color: Color, count: Int, speed: Float = 220f, size: Float = 9f) {
        repeat(count) {
            val a = MathUtils.random(MathUtils.PI2)
            val v = MathUtils.random(40f, speed)
            sparks += Spark(x, y, MathUtils.random(-2f, 6f), MathUtils.cos(a) * v, MathUtils.sin(a) * v, MathUtils.random(-90f, 150f),
                MathUtils.random(0.3f, 0.7f), 0.7f, color, size * MathUtils.random(0.7f, 1.3f))
        }
    }

    /** Coordenadas de pantalla (píxeles, y hacia arriba) de un punto del juego. */
    fun project(x: Float, h: Float, y: Float): Vector3 = cam.project(put(Vector3(), x, h, y))

    fun resize(width: Int, height: Int) {
        val a = width.toFloat() / height
        val vHalf = 36f * MathUtils.degreesToRadians
        val tanV = tan(vHalf)
        pitch = 22f * MathUtils.degreesToRadians
        val beta = atan(0.6f * tanV)
        val th = pitch + beta
        val dist = max(200f, 100f / (a * tanV)) / cos(beta)
        camY = dist * sin(th)
        camZ = dist * cos(th)
        for (c in listOf(cam, skyCam)) { c.viewportWidth = width.toFloat(); c.viewportHeight = height.toFloat(); c.fieldOfView = 72f }
    }

    /** Desplazamiento del fondo 2D según las curvas (para que el cielo acompañe el giro). */
    val skyShiftX get() = -bendX * 0.00022f - camX * 0.0004f
    val skyShiftY get() = bendY * 0.0003f

    /**
     * Dibuja un cuadro.
     * @param playing si la partida avanza (las curvas solo cambian jugando)
     */
    fun render(run: RunSession, dt: Float, speed: Float, playing: Boolean, bg: Color, accent: Color) {
        bgColor.set(bg)
        fog.color.set(bg)
        scroll += speed * dt
        tickBend(dt, playing, run.progress)
        shake = max(0f, shake - dt * 1.6f)

        updateCamera(run, dt)
        drawPlanets(dt, speed)

        Gdx.gl.glClear(GL20.GL_DEPTH_BUFFER_BIT)
        batch.begin(cam)
        drawTrack(accent, bg)
        drawEntities(run)
        drawShip(run, dt)
        batch.end()
        drawSparks(dt)
    }

    private fun tickBend(dt: Float, playing: Boolean, progress: Float) {
        if (playing) {
            bendTimer -= dt
            if (bendTimer <= 0f) {
                bendTimer = MathUtils.random(3f, 6f)
                val amp = min(1f, 0.5f + progress / 150f)
                bendTX = if (MathUtils.randomBoolean(0.15f)) 0f else (if (bendTX > 0) -1f else 1f) * MathUtils.random(0.4f, 1f) * 400f * amp
                bendTY = MathUtils.random(-0.7f, 1f) * 110f * amp
            }
        } else { bendTX = 0f; bendTY = 0f }
        val k = min(1f, dt * 0.8f)
        bendX += (bendTX - bendX) * k
        bendY += (bendTY - bendY) * k
    }

    private fun updateCamera(run: RunSession, dt: Float) {
        camX += (x3(run.shipX) * 0.78f - camX) * min(1f, dt * 6f)
        val ox = if (shake > 0) MathUtils.random(-1f, 1f) * shake * 10f else 0f
        val oy = if (shake > 0) MathUtils.random(-1f, 1f) * shake * 10f else 0f
        for (c in listOf(cam, skyCam)) {
            c.position.set(camX + ox, camY + oy, camZ)
            c.direction.set(0f, -sin(pitch), -cos(pitch))
            c.up.set(0f, cos(pitch), -sin(pitch))
            c.rotate(Vector3.Y, -bendX * 0.00016f * MathUtils.radiansToDegrees)
            c.rotate(tmp.set(c.direction).crs(c.up).nor(), bendY * 0.00018f * MathUtils.radiansToDegrees)
            val roll = MathUtils.clamp(-vxs * 0.00016f, -0.07f, 0.07f) - bendX * 0.00014f
            c.rotate(c.direction, roll * MathUtils.radiansToDegrees)
            c.update()
        }
    }

    private fun drawPlanets(dt: Float, speed: Float) {
        Gdx.gl.glClear(GL20.GL_DEPTH_BUFFER_BIT)
        batch.begin(skyCam)
        for (p in planets) {
            p.pos.z += speed * (if (p.low) 0.3f else 0.1f) * dt
            p.angle += p.spin * dt
            if ((p.low && p.pos.z > 800f) || (!p.low && p.pos.z > -700f)) placePlanet(p, initial = false)
            p.body.transform.setToTranslation(p.pos).rotateRad(Vector3.Z, 0.25f).rotateRad(Vector3.Y, p.angle).scale(p.radius, p.radius, p.radius)
            batch.render(p.body, skyEnv)
            if (p.hasRing) {
                p.ring.transform.setToTranslation(p.pos).rotateRad(Vector3.X, 0.35f).rotateRad(Vector3.Z, 0.2f).scale(p.radius, p.radius, p.radius)
                batch.render(p.ring, skyEnv)
            }
        }
        batch.end()
        for (p in planets) {
            p.glow.setPosition(p.pos)
            p.glow.setDimensions(p.radius * 2.8f, p.radius * 2.8f)
            p.glow.lookAt(skyCam.position, skyCam.up)
            skyDecals.add(p.glow)
        }
        skyDecals.flush()
    }

    private val m = Matrix4()

    private fun drawTrack(accent: Color, bg: Color) {
        val off = scroll % segLen
        val hw = Field.W / 2f + 6f
        for (i in 0 until segments) {
            val z = 240f - i * segLen + off
            val b = bd(z)
            val cx = bendX * b
            val cy = -30f + bendY * b
            val yaw = atan(tanX(z)) * MathUtils.radiansToDegrees
            val pt = -atan(tanY(z)) * MathUtils.radiansToDegrees
            for (k in 0..1) {
                val x = cx + if (k == 0) -hw else hw
                rails[i * 2 + k].apply {
                    transform.setToTranslation(x, cy, z).rotate(Vector3.Y, yaw).rotate(Vector3.X, pt).scale(2f, 2f, segLen + 3f)
                    (materials.first().get(ColorAttribute.Emissive) as ColorAttribute).color.set(accent)
                    batch.render(this, env)
                }
                posts[i * 2 + k].apply {
                    transform.setToTranslation(x, cy + 4f, z).rotate(Vector3.Y, yaw).rotate(Vector3.X, pt).scale(3f, 7f, 3f)
                    (materials.first().get(ColorAttribute.Emissive) as ColorAttribute).color.set(accent)
                    batch.render(this, env)
                }
            }
            bars[i].apply {
                transform.setToTranslation(cx, cy - 1f, z).rotate(Vector3.Y, yaw).rotate(Vector3.X, pt).scale(hw * 2f, 1f, 1.5f)
                (materials.first().get(ColorAttribute.Emissive) as ColorAttribute).color.set(accent)
                batch.render(this, env)
            }
            floor[i].apply {
                transform.setToTranslation(cx, cy - 3f, z).rotate(Vector3.Y, yaw).rotate(Vector3.X, pt).scale(hw * 2f, 1f, segLen + 1f)
                (materials.first().get(ColorAttribute.Diffuse) as ColorAttribute).color.set(bg).lerp(Color.BLACK, 0.55f)
                (materials.first().get(ColorAttribute.Emissive) as ColorAttribute).color.set(bg).mul(0.35f)
                batch.render(this, env)
            }
        }
    }

    private fun drawEntities(run: RunSession) {
        val now = (System.nanoTime() / 1_000_000_000.0).toFloat()
        alive.clear()
        for (o in run.rocks) {
            alive += o.id
            val mi = rockInstances.getOrPut(o.id) {
                ModelInstance(models.rocks[o.variant % models.rocks.size]).also {
                    if (o.wall) {
                        it.materials.first().set(ColorAttribute.createDiffuse(Color.valueOf("6e4c55")))
                        it.materials.first().set(ColorAttribute.createEmissive(Color.valueOf("4a2000")))
                    }
                }
            }
            put(tmp, o.x, 0f, o.y)
            mi.transform.setToTranslation(tmp).rotateRad(Vector3.Y, o.rot).rotateRad(Vector3.X, o.rot * 0.7f + o.variant).scale(o.r, o.r, o.r)
            batch.render(mi, env)
        }
        rockInstances.keys.retainAll(alive)
        alive.clear()
        for (c in run.coinItems) {
            alive += c.id
            val mi = coinInstances.getOrPut(c.id) { ModelInstance(models.coin) }
            put(tmp, c.x, 3f, c.y)
            mi.transform.setToTranslation(tmp).rotateRad(Vector3.Y, now * 4f + c.x * 0.05f)
            batch.render(mi, env)
        }
        coinInstances.keys.retainAll(alive)
    }

    private fun drawShip(run: RunSession, dt: Float) {
        val safeDt = max(dt, 1e-3f)
        val k = min(1f, dt * 10f)
        vxs += ((run.shipX - lastShipX) / safeDt - vxs) * k
        vys += ((run.shipY - lastShipY) / safeDt - vys) * k
        lastShipX = run.shipX; lastShipY = run.shipY
        if (!shipVisible) return
        if (run.invulnerable > 0f && (System.currentTimeMillis() / 70) % 2 == 0L) return
        val now = System.nanoTime() / 1e9
        put(tmp, run.shipX, 3f + sin(now * 3).toFloat() * 1.2f, run.shipY)
        ship.transform.setToTranslation(tmp)
            .rotateRad(Vector3.X, MathUtils.clamp(vys * 0.0012f, -0.3f, 0.3f))
            .rotateRad(Vector3.Y, MathUtils.clamp(-vxs * 0.0009f, -0.35f, 0.35f))
            .rotateRad(Vector3.Z, MathUtils.clamp(-vxs * 0.0028f, -0.75f, 0.75f))
        batch.render(ship, env)
        for ((i, f) in flames.withIndex()) {
            val len = 0.75f + MathUtils.random(0.5f) + if (vys < -60f) 0.4f else 0f
            f.transform.set(ship.transform).translate(if (i == 0) -6f else 6f, -0.4f, 13.6f).scale(1f, 1f, len)
            batch.render(f, env)
        }
    }

    private fun drawSparks(dt: Float) {
        var i = sparks.size - 1
        while (i >= 0) {
            val s = sparks[i]
            s.x += s.vx * dt; s.y += s.vy * dt; s.h += s.vh * dt; s.life -= dt
            if (s.life <= 0f) sparks.removeAt(i)
            i--
        }
        while (sparkDecals.size < sparks.size) sparkDecals += Decal.newDecal(1f, 1f, ui.glow, GL20.GL_SRC_ALPHA, GL20.GL_ONE)
        for ((n, s) in sparks.withIndex()) {
            val d = sparkDecals[n]
            put(tmp, s.x, s.h, s.y)
            d.setPosition(tmp)
            d.setDimensions(s.size, s.size)
            val a = MathUtils.clamp(s.life / s.max, 0f, 1f)
            d.setColor(s.color.r, s.color.g, s.color.b, a)
            d.lookAt(cam.position, cam.up)
            decals.add(d)
        }
        decals.flush()
    }

    override fun dispose() {
        batch.dispose()
        decals.dispose()
        skyDecals.dispose()
        planets.forEach { it.tex?.dispose(); it.ringTex?.dispose() }
    }
}
