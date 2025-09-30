// src/db/sqlite.js
const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "dev.db");
const db = new Database(dbPath); // ouvre (ou crée) le fichier

// 1) Créer la table si elle n'existe pas (migrations mini)
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullname TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    source TEXT,
    status TEXT NOT NULL DEFAULT 'nouveau',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = db;
