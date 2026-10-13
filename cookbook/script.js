/* ============ WIDGET PORZIONI ============ */

const numeroEl = document.getElementById("persone");
const bottoni = document.querySelectorAll(".porzioni-btn");
const qtaEls = document.querySelectorAll(".ing-qta[data-base], .qta-dinamica[data-base]");

// La base viene letta dall'HTML: <span id="persone">4</span>
// In questo modo ogni ricetta può avere la sua base (4, 6, 8...)
const BASE_PERSONE = parseInt(numeroEl.textContent, 10) || 1;
const MIN_PERSONE = 1;
const MAX_PERSONE = 20;

let persone = BASE_PERSONE;

/* formatta un numero: intero senza decimali, decimale con virgola */
function formattaNumero(n) {
  const arrotondato = Math.round(n * 10) / 10;
  if (Number.isInteger(arrotondato)) return arrotondato.toString();
  return arrotondato.toString().replace(".", ",");
}

/* aggiorna tutte le quantità in base al numero di persone */
function aggiorna() {
  numeroEl.textContent = persone;

  const fattore = persone / BASE_PERSONE;

  qtaEls.forEach(el => {
    const base = parseFloat(el.dataset.base);
    const unita = el.dataset.unita || "";

    let valore = base * fattore;

    if (unita === "g" || unita === "ml") {
      // arrotondamenti per pesi e volumi
      if (valore >= 100) valore = Math.round(valore / 5) * 5;   // multipli di 5
      else if (valore >= 10) valore = Math.round(valore);        // interi
      else valore = Math.round(valore * 10) / 10;                // un decimale
    } else {
      // elementi contati (uova, ecc.): arrotonda a 0,5
      valore = Math.round(valore * 2) / 2;
    }

    el.textContent = formattaNumero(valore) + (unita ? " " + unita : "");
  });
}

/* ascolta i click sui bottoni */
bottoni.forEach(btn => {
  btn.addEventListener("click", () => {
    const azione = btn.dataset.azione;
    if (azione === "piu" && persone < MAX_PERSONE) persone++;
    if (azione === "meno" && persone > MIN_PERSONE) persone--;
    aggiorna();
  });
});

/* primo render */
aggiorna();