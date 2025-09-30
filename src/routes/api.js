// src/routes/api.js
const express = require("express");
const router = express.Router();
const db = require("../db/sqlite");

// GET /api/stats -> renvoie les compteurs pour le dashboard
router.get("/stats", (req, res) => {
  // 1) total
  const total = db.prepare(`SELECT COUNT(*) AS c FROM leads`).get().c;

  // 2) par statut
  const rows = db.prepare(`
    SELECT status, COUNT(*) AS c
    FROM leads
    GROUP BY status
  `).all();

  // 3) on transforme le résultat en objet { nouveau: X, devis_envoye: Y, ... }
  const byStatus = { nouveau: 0, devis_envoye: 0, accepte: 0, refuse: 0 };
  rows.forEach(r => {
    if (byStatus.hasOwnProperty(r.status)) {
      byStatus[r.status] = r.c;
    }
  });

  res.json({
    total,
    ...byStatus // => nouveau, devis_envoye, accepte, refuse
  });
});



// GET /api/stats/last7 -> nombre de leads par jour sur 7 jours (localtime)
router.get("/last7", (req, res) => {
  // Génère 7 jours (J-6 à J)
  const rows = db.prepare(`
    WITH RECURSIVE d(n) AS (
      SELECT 6
      UNION ALL
      SELECT n - 1 FROM d WHERE n > 0
    )
    SELECT
      -- ISO pour trier si besoin
      strftime('%Y-%m-%d', 'now', 'localtime', '-' || n || ' days')      AS day_iso,
      -- Label court pour l'axe X
      strftime('%d/%m',      'now', 'localtime', '-' || n || ' days')      AS label,
      -- Compte des leads du jour
      (
        SELECT COUNT(*)
        FROM leads
        WHERE date(created_at, 'localtime') = date('now', 'localtime', '-' || n || ' days')
      ) AS count
    FROM d
    ORDER BY day_iso
  `).all();

  res.json(rows);
});


module.exports = router;
