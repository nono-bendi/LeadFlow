// src/routes/leads.js
const express = require("express");
const router = express.Router();
const db = require("../db/sqlite");

// Pipeline de statuts
const STATUSES = ["nouveau", "devis_envoye", "accepte", "refuse"];

/* A. LISTE */
router.get("/", (req, res) => {
  // 1) Lire les paramètres
  const q = (req.query.q || "").trim();
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = 10;
  const offset = (page - 1) * limit;

  // 2) Construire le WHERE + params si recherche
  let where = "";
  let params = {};
  if (q) {
    where = "WHERE fullname LIKE @like OR email LIKE @like";
    params.like = `%${q}%`;
  }

  // 3) Compter le total (pour la pagination)
  const totalRow = db.prepare(`SELECT COUNT(*) AS cnt FROM leads ${where}`).get(params);
  const total = totalRow.cnt;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // 4) Récupérer la page de données
  const rows = db.prepare(`
    SELECT id, fullname, phone, email, source, status,
           strftime('%d/%m/%Y %H:%M', created_at, 'localtime') AS created_at
    FROM leads
    ${where}
    ORDER BY id DESC
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit, offset });

  // 5) Rendre la vue
  res.render("leads/index", {
    title: "Leads",
    leads: rows,
    STATUSES,
    q,
    page,
    total,
    totalPages,
    limit,
  });
});


/* B. CREER */
router.post("/", (req, res) => {
  const { fullname, phone, email, source } = req.body;
  if (!fullname || !fullname.trim()) return res.status(400).send("Nom requis");
  db.prepare(`
    INSERT INTO leads (fullname, phone, email, source, status)
    VALUES (?, ?, ?, ?, 'nouveau')
  `).run(fullname.trim(), (phone || "").trim(), (email || "").trim(), (source || "").trim());
  res.redirect("/leads");
});

/* C. FORM EDIT */
router.get("/:id/edit", (req, res) => {
  const id = Number(req.params.id);
  const lead = db.prepare(`
    SELECT
      id,
      fullname,
      phone,
      email,
      source,
      status,
      -- date lisible côté vue
      strftime('%d/%m/%Y %H:%M', created_at, 'localtime') AS created_at
    FROM leads
    WHERE id = ?
  `).get(id);

  if (!lead) return res.status(404).send("Lead introuvable");
  res.render("leads/edit", { title: `Modifier lead #${id}`, lead, STATUSES });
});


/* D. ENREGISTRER EDIT */
router.post("/:id", (req, res) => {
  const id = Number(req.params.id);
  const { fullname, phone, email, source, status } = req.body;
  if (!fullname || !fullname.trim()) return res.status(400).send("Nom requis");
  if (status && !STATUSES.includes(status)) return res.status(400).send("Statut invalide");

  const info = db.prepare(`
    UPDATE leads
    SET fullname = ?, phone = ?, email = ?, source = ?, status = ?
    WHERE id = ?
  `).run(
    fullname.trim(),
    (phone || "").trim(),
    (email || "").trim(),
    (source || "").trim(),
    status && STATUSES.includes(status) ? status : "nouveau",
    id
  );

  if (info.changes === 0) return res.status(404).send("Lead introuvable");
  res.redirect("/leads");
});

/* E. CHANGER STATUT (depuis la liste) */
router.post("/:id/status", (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!STATUSES.includes(status)) return res.status(400).send("Statut invalide");

  const info = db.prepare(`UPDATE leads SET status = ? WHERE id = ?`).run(status, id);
  if (info.changes === 0) return res.status(404).send("Lead introuvable");
  res.redirect("/leads");
});

/* F. SUPPRIMER */
router.post("/:id/delete", (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare(`DELETE FROM leads WHERE id = ?`).run(id);
  if (info.changes === 0) return res.status(404).send("Lead introuvable");
  res.redirect("/leads");
});

module.exports = router;



