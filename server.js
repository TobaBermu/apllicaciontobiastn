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
  res.json(db.getAll());
});

app.post("/api/popups", requireAdmin, (req, res) => {
  const p = req.body || {};
  const created = db.create({
    name: p.name || "Sin nombre",
    keyword: p.keyword || "",
    match_type: p.match_type || "contains",
    delay_seconds: Number(p.delay_seconds) || 0,
    title: p.title || "",
    message: p.message || "",
    image_url: p.image_url || "",
    cta_text: p.cta_text || "",
    cta_url: p.cta_url || "",
    show_once_per_session: !!p.show_once_per_session,
    active: p.active !== false,
    design_mode: p.design_mode || "simple",
    position: p.position || "center",
    width: Number(p.width) || 420,
    border_radius: p.border_radius != null ? Number(p.border_radius) : 12,
    bg_color: p.bg_color || "#ffffff",
    title_color: p.title_color || "#111111",
    text_color: p.text_color || "#444444",
    button_bg_color: p.button_bg_color || "#111111",
    button_text_color: p.button_text_color || "#ffffff",
    font_family: p.font_family || "system",
    title_font_size: Number(p.title_font_size) || 20,
    text_font_size: Number(p.text_font_size) || 14,
    animation: p.animation || "fade",
    custom_html: p.custom_html || "",
    custom_css: p.custom_css || "",
    custom_js: p.custom_js || "",
  });
  res.status(201).json(created);
});

app.put("/api/popups/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const existing = db.getById(id);
  if (!existing) return res.status(404).json({ error: "No encontrado" });

  const p = req.body || {};
  const patch = {};
  [
    "name", "keyword", "match_type", "title", "message",
    "image_url", "cta_text", "cta_url",
    "design_mode", "position", "bg_color", "title_color", "text_color",
    "button_bg_color", "button_text_color", "font_family", "animation",
    "custom_html", "custom_css", "custom_js",
  ].forEach((key) => {
    if (p[key] !== undefined) patch[key] = p[key];
  });
  if (p.delay_seconds !== undefined) patch.delay_seconds = Number(p.delay_seconds) || 0;
  if (p.width !== undefined) patch.width = Number(p.width) || 420;
  if (p.border_radius !== undefined) patch.border_radius = Number(p.border_radius) || 0;
  if (p.title_font_size !== undefined) patch.title_font_size = Number(p.title_font_size) || 20;
  if (p.text_font_size !== undefined) patch.text_font_size = Number(p.text_font_size) || 14;
  if (p.show_once_per_session !== undefined) patch.show_once_per_session = !!p.show_once_per_session;
  if (p.active !== undefined) patch.active = !!p.active;

  const updated = db.update(id, patch);
  res.json(updated);
});

app.delete("/api/popups/:id", requireAdmin, (req, res) => {
  db.remove(req.params.id);
  res.status(204).end();
});

// ---------- Endpoint público que consulta el widget ----------
app.get("/api/popups/active", (req, res) => {
  const rows = db.getActive();
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
    design_mode: r.design_mode || "simple",
    position: r.position || "center",
    width: r.width || 420,
    border_radius: r.border_radius != null ? r.border_radius : 12,
    bg_color: r.bg_color || "#ffffff",
    title_color: r.title_color || "#111111",
    text_color: r.text_color || "#444444",
    button_bg_color: r.button_bg_color || "#111111",
    button_text_color: r.button_text_color || "#ffffff",
    font_family: r.font_family || "system",
    title_font_size: r.title_font_size || 20,
    text_font_size: r.text_font_size || 14,
    animation: r.animation || "fade",
    custom_html: r.custom_html || "",
    custom_css: r.custom_css || "",
    custom_js: r.custom_js || "",
  }));
  res.json(publicRows);
});

// ---------- Servir el widget público (JS que se inyecta en la tienda) ----------
app.get("/widget/popup.js", (req, res) => {
  res.sendFile(path.join(__dirname, "popup.js"));
});

// ---------- Servir el panel de admin (estático) ----------
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
app.get("/style.css", (req, res) => {
  res.sendFile(path.join(__dirname, "style.css"));
});
app.get("/app.js", (req, res) => {
  res.sendFile(path.join(__dirname, "app.js"));
});

app.get("/", (req, res) => {
  res.send('Backend de Pop-ups OK. Panel de admin en <a href="/admin">/admin</a>');
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
