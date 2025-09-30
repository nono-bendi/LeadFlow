// public/js/app.js
(function () {
  // ————— Utilitaires —————
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function showToast(message = "Opération réussie") {
    // Crée un petit toast discret en haut à droite
    let box = $("#toast-box");
    if (!box) {
      box = document.createElement("div");
      box.id = "toast-box";
      Object.assign(box.style, {
        position: "fixed",
        top: "16px",
        right: "16px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      });
      document.body.appendChild(box);
    }

    const toast = document.createElement("div");
    toast.textContent = message;
    Object.assign(toast.style, {
      background: "#111",
      color: "#fff",
      padding: "10px 12px",
      borderRadius: "10px",
      boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
      fontSize: "14px",
      opacity: "0",
      transform: "translateY(-6px)",
      transition: "all .25s ease",
    });
    box.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-6px)";
      setTimeout(() => toast.remove(), 250);
    }, 2200);
  }

  function setFlash(message) {
    try {
      localStorage.setItem("flash", message);
    } catch {}
  }
  function popFlash() {
    try {
      const msg = localStorage.getItem("flash");
      if (msg) {
        localStorage.removeItem("flash");
        showToast(msg);
      }
    } catch {}
  }

  function injectError(el, msg) {
    // Affiche une erreur juste sous le champ
    removeError(el);
    const small = document.createElement("small");
    small.className = "field-error";
    small.textContent = msg;
    Object.assign(small.style, { color: "#c0392b", display: "block", marginTop: "4px" });
    el.insertAdjacentElement("afterend", small);
    el.setAttribute("aria-invalid", "true");
    el.style.borderColor = "#c0392b";
  }
  function removeError(el) {
    el.removeAttribute("aria-invalid");
    el.style.borderColor = "";
    const next = el.nextElementSibling;
    if (next && next.classList.contains("field-error")) next.remove();
  }

  // ————— Validation formulaire d’AJOUT —————
  const createForm = $("#leadCreateForm");
  if (createForm) {
    createForm.addEventListener("submit", (e) => {
      const fullname = createForm.fullname;
      const email = createForm.email;
      let ok = true;

      // reset erreurs
      [fullname, email].forEach(removeError);

      // nom requis
      if (!fullname.value.trim()) {
        injectError(fullname, "Le nom complet est requis.");
        ok = false;
      }
      // email optionnel, mais s'il est renseigné → format
      if (email.value.trim() && !emailRegex.test(email.value.trim())) {
        injectError(email, "Format d'email invalide.");
        ok = false;
      }

      if (!ok) {
        e.preventDefault();
        return;
      }
      // petit flash après la redirection
      setFlash("Lead créé avec succès");
    });
  }

  // ————— Validation formulaire d’EDITION —————
  const editForm = $("#leadEditForm");
  if (editForm) {
    editForm.addEventListener("submit", (e) => {
      const fullname = editForm.fullname;
      const email = editForm.email;
      let ok = true;

      [fullname, email].forEach(removeError);

      if (!fullname.value.trim()) {
        injectError(fullname, "Le nom complet est requis.");
        ok = false;
      }
      if (email.value.trim() && !emailRegex.test(email.value.trim())) {
        injectError(email, "Format d'email invalide.");
        ok = false;
      }

      if (!ok) {
        e.preventDefault();
        return;
      }
      setFlash("Lead modifié");
    });
  }

  // ————— Maj statut (depuis la table) —————
  $$('form[data-action="status"]').forEach((form) => {
    form.addEventListener("submit", () => {
      setFlash("Statut mis à jour");
    });
  });

  // ————— Supprimer (confirmation custom) —————
  $$('form[data-action="delete"]').forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const ok = confirm("Supprimer ce lead ?");
      if (ok) {
        setFlash("Lead supprimé");
        // soumission manuelle si confirmé
        form.submit();
      }
    });
  });



  // ————— Remplir les compteurs du dashboard (index.html) —————
document.addEventListener("DOMContentLoaded", async () => {
  const totalEl = document.getElementById("stat-total");
  const devisEl = document.getElementById("stat-devis");
  const accepteEl = document.getElementById("stat-accepte");

  // Si on n'est pas sur la page d'accueil, ces éléments n'existent pas → on sort
  if (!totalEl || !devisEl || !accepteEl) return;

  try {
    const res = await fetch("/api/stats");
    if (!res.ok) throw new Error("Réponse non OK");
    const data = await res.json();

    totalEl.textContent = data.total ?? "0";
    devisEl.textContent = data.devis_envoye ?? "0";
    accepteEl.textContent = data.accepte ?? "0";
  } catch (err) {
    console.error("Erreur chargement stats:", err);
    totalEl.textContent = "—";
    devisEl.textContent = "—";
    accepteEl.textContent = "—";
  }
});

// Graph “Leads sur 7 jours” (index.html) avec Chart.js local
document.addEventListener("DOMContentLoaded", async () => {
  const canvas = document.getElementById("chart-7d");
  if (!canvas) return; // pas sur la page d'accueil

  try {
    const res = await fetch("/api/last7");
    if (!res.ok) throw new Error("Réponse non OK");
    const data = await res.json();

    const labels = data.map(d => d.label);
    const values = data.map(d => d.count);

    // Chart est dispo car on a chargé /vendor/chart.umd.js
    new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Nouveaux leads",
          data: values,
          backgroundColor: "rgba(79,70,229,0.9)",
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  } catch (err) {
    console.error("Erreur /api/last7:", err);
  }
});





  // ————— Affiche le flash si présent (après redirections) —————
  document.addEventListener("DOMContentLoaded", popFlash);
})();


app.use(express.static(path.join(__dirname, "public")));
