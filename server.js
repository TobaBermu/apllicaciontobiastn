require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fetch = require("node-fetch");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const {
  ADMIN_PASSWORD,
  TN_STORE_ID,
  TN_ACCESS_TOKEN,
  PORT = 3000,
  PUBLIC_BACKEND_URL = "",
} = process.env;

// ---------- Auth simple para el panel de admin ----------
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ error: "ADMIN_PASSWORD no configurado en el servidor" });
  }
  if (token !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "No autorizado" });
  }
  next();
}

app.post("/api/login", (req, res) => {
  const { password } = req.body || {};
  if (password && password === ADMIN_PASSWORD) {
    return res.json({ token: password });
  }
  return res.status(401).json({ error: "Contraseña incorrecta" });
});

// ---------- CRUD de pop-ups (protegido) ----------
app.get("/api/popups", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM popups ORDER BY id DESC").all();
  res.json(rows);
});

app.post("/api/popups", requireAdmin, (req, res) => {
  const p = req.body || {};
  const stmt = db.prepare(`
    INSERT INTO popups
      (name, keyword, match_type, delay_seconds, title, message, image_url, cta_text, cta_url, show_once_per_session, active)
    VALUES (@name, @keyword, @match_type, @delay_seconds, @title, @message, @image_url, @cta_text, @cta_url, @show_once_per_session, @active)
  `);
  const info = stmt.run({
    name: p.name || "Sin nombre",
    keyword: p.keyword || "",
    match_type: p.match_type || "contains",
    delay_seconds: Number(p.delay_seconds) || 0,
    title: p.title || "",
    message: p.message || "",
    image_url: p.image_url || "",
    cta_text: p.cta_text || "",
    cta_url: p.cta_url || "",
    show_once_per_session: p.show_once_per_session ? 1 : 0,
    active: p.active === false ? 0 : 1,
  });
  const created = db.prepare("SELECT * FROM popups WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(created);
});

app.put("/api/popups/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare("SELECT * FROM popups WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "No encontrado" });

  const p = { ...existing, ...req.body };
  db.prepare(`
    UPDATE popups SET
      name=@name, keyword=@keyword, match_type=@match_type, delay_seconds=@delay_seconds,
      title=@title, message=@message, image_url=@image_url, cta_text=@cta_text, cta_url=@cta_url,
      show_once_per_session=@show_once_per_session, active=@active
    WHERE id=@id
  `).run({
    id,
    name: p.name,
    keyword: p.keyword,
    match_type: p.match_type,
    delay_seconds: Number(p.delay_seconds) || 0,
    title: p.title,
    message: p.message,
    image_url: p.image_url,
    cta_text: p.cta_text,
    cta_url: p.cta_url,
    show_once_per_session: p.show_once_per_session ? 1 : 0,
    active: p.active ? 1 : 0,
  });
  const updated = db.prepare("SELECT * FROM popups WHERE id = ?").get(id);
  res.json(updated);
});

app.delete("/api/popups/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM popups WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

// ---------- Endpoint público que consulta el widget ----------
app.get("/api/popups/active", (req, res) => {
  const rows = db.prepare("SELECT * FROM popups WHERE active = 1").all();
  // Solo exponemos los campos necesarios para el front público
  const publicRows = rows.map((r) => ({
    id: r.id,
    keyword: r.keyword,
    match_type: r.match_type,
    delay_seconds: r.delay_seconds,
    title: r.title,
    message: r.message,
    image_url: r.image_url,
    cta_text: r.cta_text,
    cta_url: r.cta_url,
    show_once_per_session: !!r.show_once_per_session,
  }));
  res.json(publicRows);
});

// ---------- Registrar el script en Tienda Nube (Script Tags API) ----------
app.post("/api/tiendanube/register-script", requireAdmin, async (req, res) => {
  const storeId = req.body?.store_id || TN_STORE_ID;
  const accessToken = req.body?.access_token || TN_ACCESS_TOKEN;
  const backendUrl = req.body?.backend_url || PUBLIC_BACKEND_URL;

  if (!storeId || !accessToken) {
    return res.status(400).json({ error: "Falta store_id o access_token (definilos en .env o en el body)" });
  }
  if (!backendUrl) {
    return res.status(400).json({ error: "Falta PUBLIC_BACKEND_URL para saber dónde está alojado el widget" });
  }

  const scriptUrl = `${backendUrl.replace(/\/$/, "")}/widget/popup.js`;

  try {
    const response = await fetch(`https://api.tiendanube.com/v1/${storeId}/scripts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authentication: `bearer ${accessToken}`,
        "User-Agent": "TiendaNube Popup App (contacto@tudominio.com)",
      },
      body: JSON.stringify({
        src: scriptUrl,
        event: "onload",
        where: "storefront",
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: "Error de la API de Tienda Nube", detail: data });
    }
    res.json({ ok: true, script: data });
  } catch (err) {
    res.status(500).json({ error: "Error al registrar el script", detail: String(err) });
  }
});

// ---------- Servir el widget público (JS que se inyecta en la tienda) ----------
app.use("/widget", express.static(path.join(__dirname, "..", "widget")));

// ---------- Servir el panel de admin (estático) ----------
app.use("/admin", express.static(path.join(__dirname, "public", "admin")));

app.get("/", (req, res) => {
  res.send('Backend de Pop-ups OK. Panel de admin en <a href="/admin">/admin</a>');
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
