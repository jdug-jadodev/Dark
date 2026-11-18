package com.giroestelar.adapters.render

import com.badlogic.gdx.graphics.Color
import com.badlogic.gdx.graphics.GL20
import com.badlogic.gdx.graphics.VertexAttributes.Usage
import com.badlogic.gdx.graphics.g3d.Material
import com.badlogic.gdx.graphics.g3d.Model
import com.badlogic.gdx.graphics.g3d.attributes.BlendingAttribute
import com.badlogic.gdx.graphics.g3d.attributes.ColorAttribute
import com.badlogic.gdx.graphics.g3d.attributes.DepthTestAttribute
import com.badlogic.gdx.graphics.g3d.attributes.FloatAttribute
import com.badlogic.gdx.graphics.g3d.attributes.IntAttribute
import com.badlogic.gdx.graphics.g3d.utils.MeshPartBuilder
import com.badlogic.gdx.graphics.g3d.utils.ModelBuilder
import com.badlogic.gdx.graphics.g3d.utils.shapebuilders.BoxShapeBuilder
import com.badlogic.gdx.graphics.g3d.utils.shapebuilders.ConeShapeBuilder
import com.badlogic.gdx.graphics.g3d.utils.shapebuilders.CylinderShapeBuilder
import com.badlogic.gdx.graphics.g3d.utils.shapebuilders.SphereShapeBuilder
import com.badlogic.gdx.math.MathUtils
import com.badlogic.gdx.math.Matrix4
import com.badlogic.gdx.math.Vector3
import com.badlogic.gdx.utils.Disposable
import kotlin.math.sqrt

/**
 * Modelos 3D construidos por código (sin archivos), portados del prototipo:
 * nave genérica, rocas facetadas, moneda, cubo unitario (rieles, piso),
 * esfera y anillo con textura (planetas) y llamas de los motores.
 */
class Models3D(shipColor: Color) : Disposable {
    private val mb = ModelBuilder()
    private val pn = (Usage.Position or Usage.Normal).toLong()
    private val pnt = (Usage.Position or Usage.Normal or Usage.TextureCoordinates).toLong()
    private val owned = mutableListOf<Model>()
    private val tmpA = Vector3()
    private val tmpB = Vector3()

    val ship: Model = buildShip(shipColor)
    val flame: Model = buildFlame()
    val rocks: List<Model> = List(6) { buildRock(it) }
    val coin: Model = buildCoin()
    /** Cubo 1×1×1 blanco: rieles, postes, travesaños y piso (el color se cambia por instancia). */
    val box: Model = own(mb.createBox(1f, 1f, 1f, Material(ColorAttribute.createDiffuse(Color.WHITE)), pn))
    /** Esfera de radio 1 con coordenadas de textura (planetas). */
    val sphere: Model = buildSphere()
    /** Anillo plano (planetas gaseosos). */
    val ring: Model = buildRing()

    private fun own(m: Model) = m.also { owned += it }

    /* ---------------- nave ---------------- */

    private fun buildShip(c: Color): Model {
        val hull = Material(
            "hull", ColorAttribute.createDiffuse(Color.valueOf("d8e0f0")),
            ColorAttribute.createSpecular(0.55f, 0.6f, 0.7f, 1f), FloatAttribute.createShininess(24f),
        )
        val paint = Material(
            "paint", ColorAttribute.createDiffuse(c), ColorAttribute.createEmissive(c.cpy().mul(0.22f)),
            ColorAttribute.createSpecular(0.4f, 0.45f, 0.5f, 1f), FloatAttribute.createShininess(16f),
        )
        val dark = Material("dark", ColorAttribute.createDiffuse(Color.valueOf("1a2142")), ColorAttribute.createSpecular(0.5f, 0.5f, 0.6f, 1f), FloatAttribute.createShininess(20f))
        val glass = Material(
            "glass", ColorAttribute.createDiffuse(Color.valueOf("8fe6ff")), ColorAttribute.createEmissive(Color.valueOf("0f3a55")),
            ColorAttribute.createSpecular(1f, 1f, 1f, 1f), FloatAttribute.createShininess(64f), BlendingAttribute(0.9f),
        )
        val glow = Material("glow", ColorAttribute.createDiffuse(Color.BLACK), ColorAttribute.createEmissive(c))
        val ember = Material("ember", ColorAttribute.createDiffuse(Color.BLACK), ColorAttribute.createEmissive(Color.valueOf("ffb454")))

        mb.begin()
        // fuselaje (elipsoide) + franja de color en la nariz
        mb.part("fuselage", GL20.GL_TRIANGLES, pn, hull).also { SphereShapeBuilder.build(it, 10f, 7.2f, 32f, 22, 14) }
        mb.part("nose", GL20.GL_TRIANGLES, pn, paint).also {
            it.setVertexTransform(Matrix4().translate(0f, 0f, -9.5f))
            SphereShapeBuilder.build(it, 8.2f, 6.1f, 15f, 18, 12)
        }
        // cabina de vidrio
        mb.part("cockpit", GL20.GL_TRIANGLES, pn, glass).also {
            it.setVertexTransform(Matrix4().translate(0f, 2.6f, -4f))
            SphereShapeBuilder.build(it, 5.8f, 4.4f, 12.4f, 16, 12)
        }
        // alas en delta (forma del prototipo) con aletas en las puntas
        val wing = listOf(3f to -6f, 19f to 6f, 20f to 10f, 3f to 8f)
        mb.part("wings", GL20.GL_TRIANGLES, pn, paint).also { p ->
            prism(p, wing, -1.3f, 0.1f)
            prism(p, wing.map { -it.first to it.second }, -1.3f, 0.1f)
        }
        mb.part("tips", GL20.GL_TRIANGLES, pn, hull).also { p ->
            for (sx in listOf(-1f, 1f)) BoxShapeBuilder.build(p, sx * 19.5f, 1.6f, 8f, 0.9f, 5f, 7f)
        }
        mb.part("tipLights", GL20.GL_TRIANGLES, pn, glow).also { p ->
            for (sx in listOf(-1f, 1f)) {
                p.setVertexTransform(Matrix4().translate(sx * 19.5f, 4.2f, 10.8f))
                SphereShapeBuilder.build(p, 2.2f, 2.2f, 2.2f, 8, 6)
            }
        }
        // aletas traseras
        mb.part("tailFins", GL20.GL_TRIANGLES, pn, paint).also { p ->
            for (sx in listOf(-1f, 1f)) {
                p.setVertexTransform(Matrix4().translate(sx * 3.4f, 3.4f, 8.5f).rotate(Vector3.Z, -sx * 21.8f))
                BoxShapeBuilder.build(p, 0f, 0f, 0f, 0.8f, 6f, 6.5f)
            }
        }
        // motores
        mb.part("engines", GL20.GL_TRIANGLES, pn, dark).also { p ->
            for (sx in listOf(-6f, 6f)) {
                p.setVertexTransform(Matrix4().translate(sx, -0.4f, 8.5f).rotate(Vector3.X, 90f))
                CylinderShapeBuilder.build(p, 5.4f, 10f, 5.4f, 16)
            }
        }
        mb.part("nozzles", GL20.GL_TRIANGLES, pn, ember).also { p ->
            for (sx in listOf(-6f, 6f)) {
                p.setVertexTransform(Matrix4().translate(sx, -0.4f, 13.5f))
                SphereShapeBuilder.build(p, 4.4f, 4.4f, 1.2f, 12, 6)
            }
        }
        return own(mb.end())
    }

    /** Llama de motor: cono hacia +Z (atrás), aditiva y brillante. */
    private fun buildFlame(): Model {
        fun flameMat(col: String, a: Float) = Material(
            ColorAttribute.createDiffuse(Color.BLACK), ColorAttribute.createEmissive(Color.valueOf(col)),
            BlendingAttribute(GL20.GL_SRC_ALPHA, GL20.GL_ONE, a), DepthTestAttribute(GL20.GL_LEQUAL, false),
            IntAttribute.createCullFace(GL20.GL_NONE),
        )
        mb.begin()
        mb.part("outer", GL20.GL_TRIANGLES, pn, flameMat("ff8a3c", 0.8f)).also {
            it.setVertexTransform(Matrix4().translate(0f, 0f, 6.5f).rotate(Vector3.X, 90f))
            ConeShapeBuilder.build(it, 4.6f, 13f, 4.6f, 14)
        }
        mb.part("inner", GL20.GL_TRIANGLES, pn, flameMat("fff2c0", 0.95f)).also {
            it.setVertexTransform(Matrix4().translate(0f, 0f, 4f).rotate(Vector3.X, 90f))
            ConeShapeBuilder.build(it, 2.4f, 8f, 2.4f, 10)
        }
        return own(mb.end())
    }

    /* ---------------- rocas ---------------- */

    /** Icosaedro subdividido con los vértices desplazados al azar: roca facetada. */
    private fun buildRock(seed: Int): Model {
        val rnd = java.util.Random(1000L + seed)
        val t = (1f + sqrt(5f)) / 2f
        val base = mutableListOf(
            Vector3(-1f, t, 0f), Vector3(1f, t, 0f), Vector3(-1f, -t, 0f), Vector3(1f, -t, 0f),
            Vector3(0f, -1f, t), Vector3(0f, 1f, t), Vector3(0f, -1f, -t), Vector3(0f, 1f, -t),
            Vector3(t, 0f, -1f), Vector3(t, 0f, 1f), Vector3(-t, 0f, -1f), Vector3(-t, 0f, 1f),
        ).onEach { it.nor() }
        var faces = listOf(
            intArrayOf(0, 11, 5), intArrayOf(0, 5, 1), intArrayOf(0, 1, 7), intArrayOf(0, 7, 10), intArrayOf(0, 10, 11),
            intArrayOf(1, 5, 9), intArrayOf(5, 11, 4), intArrayOf(11, 10, 2), intArrayOf(10, 7, 6), intArrayOf(7, 1, 8),
            intArrayOf(3, 9, 4), intArrayOf(3, 4, 2), intArrayOf(3, 2, 6), intArrayOf(3, 6, 8), intArrayOf(3, 8, 9),
            intArrayOf(4, 9, 5), intArrayOf(2, 4, 11), intArrayOf(6, 2, 10), intArrayOf(8, 6, 7), intArrayOf(9, 8, 1),
        )
        val mid = HashMap<Long, Int>()
        fun midpoint(a: Int, b: Int): Int {
            val key = if (a < b) a.toLong() * 100000 + b else b.toLong() * 100000 + a
            return mid.getOrPut(key) { base += Vector3(base[a]).add(base[b]).nor(); base.size - 1 }
        }
        faces = faces.flatMap { f ->
            val ab = midpoint(f[0], f[1]); val bc = midpoint(f[1], f[2]); val ca = midpoint(f[2], f[0])
            listOf(intArrayOf(f[0], ab, ca), intArrayOf(f[1], bc, ab), intArrayOf(f[2], ca, bc), intArrayOf(ab, bc, ca))
        }
        val verts = base.map { v -> val k = 0.76f + rnd.nextFloat() * 0.36f; Vector3(v.x * k, v.y * k * 0.85f, v.z * k) }

        val mat = Material("rock", ColorAttribute.createDiffuse(Color.valueOf("5d6aa0")), ColorAttribute.createSpecular(0.08f, 0.08f, 0.1f, 1f))
        mb.begin()
        val p = mb.part("rock", GL20.GL_TRIANGLES, pn, mat)
        for (f in faces) tri(p, verts[f[0]], verts[f[1]], verts[f[2]], null)
        return own(mb.end())
    }

    /* ---------------- moneda, esfera, anillo ---------------- */

    private fun buildCoin(): Model {
        val gold = Material(
            ColorAttribute.createDiffuse(Color.valueOf("ffd54a")), ColorAttribute.createEmissive(Color.valueOf("6a4400")),
            ColorAttribute.createSpecular(1f, 0.9f, 0.6f, 1f), FloatAttribute.createShininess(40f),
        )
        mb.begin()
        mb.part("coin", GL20.GL_TRIANGLES, pn, gold).also {
            it.setVertexTransform(Matrix4().rotate(Vector3.X, 90f))
            CylinderShapeBuilder.build(it, 14f, 2.2f, 14f, 24)
        }
        return own(mb.end())
    }

    private fun buildSphere(): Model {
        mb.begin()
        mb.part("planet", GL20.GL_TRIANGLES, pnt, Material(ColorAttribute.createDiffuse(Color.WHITE))).also {
            SphereShapeBuilder.build(it, 2f, 2f, 2f, 40, 26)
        }
        return own(mb.end())
    }

    /** Anillo en el plano XZ, radio interior 1.35 y exterior 2.3; la textura se mapea en plano. */
    private fun buildRing(): Model {
        val mat = Material(
            ColorAttribute.createDiffuse(Color.WHITE), BlendingAttribute(0.85f), IntAttribute.createCullFace(GL20.GL_NONE),
            DepthTestAttribute(GL20.GL_LEQUAL, false),
        )
        mb.begin()
        val p = mb.part("ring", GL20.GL_TRIANGLES, pnt, mat)
        val seg = 96
        val inner = 1.35f
        val outer = 2.3f
        fun v(r: Float, a: Float) = MeshPartBuilder.VertexInfo().setPos(MathUtils.cos(a) * r, 0f, MathUtils.sin(a) * r)
            .setNor(0f, 1f, 0f).setUV((MathUtils.cos(a) * r / outer + 1f) / 2f, (MathUtils.sin(a) * r / outer + 1f) / 2f)
        for (i in 0 until seg) {
            val a0 = i * MathUtils.PI2 / seg
            val a1 = (i + 1) * MathUtils.PI2 / seg
            p.rect(v(inner, a0), v(outer, a0), v(outer, a1), v(inner, a1))
        }
        return own(mb.end())
    }

    /* ---------------- ayudas de geometría ---------------- */

    /** Triángulo con normal de cara; si se da [want], orienta el triángulo hacia esa dirección (si no, hacia afuera del centro). */
    private fun tri(p: MeshPartBuilder, a: Vector3, b: Vector3, c: Vector3, want: Vector3?) {
        val n = tmpA.set(b).sub(a).crs(tmpB.set(c).sub(a)).nor()
        val out = want ?: Vector3(a).add(b).add(c)
        var bb = b
        var cc = c
        if (n.dot(out) < 0) { bb = c; cc = b; n.scl(-1f) }
        val nn = Vector3(n)
        p.triangle(
            MeshPartBuilder.VertexInfo().setPos(a).setNor(nn),
            MeshPartBuilder.VertexInfo().setPos(bb).setNor(nn),
            MeshPartBuilder.VertexInfo().setPos(cc).setNor(nn),
        )
    }

    /** Prisma de un polígono convexo en el plano XZ, entre las alturas y0 e y1. */
    private fun prism(p: MeshPartBuilder, poly: List<Pair<Float, Float>>, y0: Float, y1: Float) {
        val top = poly.map { Vector3(it.first, y1, it.second) }
        val bot = poly.map { Vector3(it.first, y0, it.second) }
        for (i in 1 until poly.size - 1) {
            tri(p, top[0], top[i], top[i + 1], Vector3.Y)
            tri(p, bot[0], bot[i], bot[i + 1], Vector3(0f, -1f, 0f))
        }
        val cx = poly.map { it.first }.average().toFloat()
        val cz = poly.map { it.second }.average().toFloat()
        for (i in poly.indices) {
            val j = (i + 1) % poly.size
            val out = Vector3((poly[i].first + poly[j].first) / 2 - cx, 0f, (poly[i].second + poly[j].second) / 2 - cz)
            tri(p, bot[i], bot[j], top[j], out)
            tri(p, bot[i], top[j], top[i], out)
        }
    }

    override fun dispose() = owned.forEach { it.dispose() }
}
