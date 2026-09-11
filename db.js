// Almacenamiento simple en un archivo JSON (sin dependencias nativas,
// para evitar problemas de compilación en hostings como Render).
const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "popups.json");

function readData() {
  try {
    const raw = fs.readFileSync(dataPath, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    return { nextId: 1, popups: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf8");
}

// Asegura que exista el archivo la primera vez
if (!fs.existsSync(dataPath)) {
  writeData({ nextId: 1, popups: [] });
}

function getAll() {
  return readData().popups.slice().sort((a, b) => b.id - a.id);
}

function getActive() {
  return readData().popups.filter((p) => p.active);
}

function getById(id) {
  return readData().popups.find((p) => String(p.id) === String(id));
}

function create(popup) {
  const data = readData();
  const newPopup = Object.assign({}, popup, {
    id: data.nextId,
    created_at: new Date().toISOString(),
  });
  data.popups.push(newPopup);
  data.nextId += 1;
  writeData(data);
  return newPopup;
}

function update(id, patch) {
  const data = readData();
  const idx = data.popups.findIndex((p) => String(p.id) === String(id));
  if (idx === -1) return null;
  data.popups[idx] = Object.assign({}, data.popups[idx], patch);
  writeData(data);
  return data.popups[idx];
}

function remove(id) {
  const data = readData();
  data.popups = data.popups.filter((p) => String(p.id) !== String(id));
  writeData(data);
}

module.exports = { getAll, getActive, getById, create, update, remove };
