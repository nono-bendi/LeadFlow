const express = require('express');
const router = express.Router();
const db = require('../db/sqlite');
const puppeteer = require('puppeteer');

// GET /quotes/:id/pdf
router.get('/:id/pdf', async (req, res) => {
  const id = Number(req.params.id);
  const quote = db.prepare('SELECT * FROM quotes WHERE id=?').get(id);
  if (!quote) return res.status(404).send('Devis introuvable');
  const items = db.prepare('SELECT * FROM quote_items WHERE quote_id=?').all(id);
  const company = db.prepare('SELECT * FROM company WHERE id=1').get() || { name: 'CoverPro' };

  try {
    // 1) Rendre la vue EJS en HTML (sans l’envoyer au client)
    const html = await new Promise((resolve, reject) => {
      req.app.render('quotes/pdf', { quote, items, company }, (err, rendered) => {
        if (err) reject(err); else resolve(rendered);
      });
    });

    // 2) Convertir HTML → PDF avec Puppeteer
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '12mm', left: '10mm' }
    });
    await browser.close();

    // 3) Envoyer le PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${quote.number}.pdf"`);
    res.send(pdf);

  } catch (e) {
    console.error('PDF error:', e);
    res.status(500).send('Erreur génération PDF');
  }
});

module.exports = router;
