'use strict';

const CLAU = 'qualificacions-projectes-v1';

const CRITERIS_INICIALS = [
  { nom: 'Anàlisi i disseny', pes: 20, descripcio: 'Requisits, planificació i disseny de la solució.' },
  { nom: 'Resultat tècnic', pes: 30, descripcio: 'Funcionament i qualitat del producte final.' },
  { nom: 'Documentació', pes: 20, descripcio: 'Memòria clara, completa i ben estructurada.' },
  { nom: 'Presentació oral', pes: 20, descripcio: 'Exposició, domini del tema i resposta a preguntes.' },
  { nom: 'Autonomia i actitud', pes: 10, descripcio: 'Iniciativa, treball continuat i seguiment del tutor.' }
];

let dades = carregar();
let vista = 'alumnes';
let alumneActiu = null;
let alumneEditant = null;
let criteriEditant = null;
let filtre = '';

/* ---------- Dades ---------- */

function carregar() {
  try {
    const guardat = JSON.parse(localStorage.getItem(CLAU));
    if (guardat && Array.isArray(guardat.alumnes) && Array.isArray(guardat.criteris)) return guardat;
  } catch (e) { /* dades corruptes: es comença de nou */ }
  return {
    alumnes: [],
    criteris: CRITERIS_INICIALS.map(c => ({ id: nouId(), ...c })),
    notes: {},
    comentaris: {}
  };
}

function guardar() {
  localStorage.setItem(CLAU, JSON.stringify(dades));
}

function nouId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function esc(text) {
  return String(text ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function sumaPesos() {
  return dades.criteris.reduce((s, c) => s + Number(c.pes || 0), 0);
}

/* Nota final sobre 10, o null si l'alumne encara no té cap nota. */
function notaFinal(idAlumne) {
  const notes = dades.notes[idAlumne] || {};
  let suma = 0, pesos = 0, n = 0;
  dades.criteris.forEach(c => {
    const v = notes[c.id];
    if (v !== undefined && v !== '' && v !== null) {
      suma += Number(v) * c.pes;
      n++;
    }
    pesos += c.pes;
  });
  if (!n || !pesos) return null;
  return suma / pesos;
}

function formatNota(n) {
  return n === null ? '—' : n.toFixed(2).replace('.', ',');
}

function classeNota(n) {
  if (n === null) return '';
  return n >= 5 ? 'aprovat' : 'suspes';
}

function avis(missatge) {
  const el = document.getElementById('avis');
  el.textContent = missatge;
  el.classList.add('visible');
  clearTimeout(avis.t);
  avis.t = setTimeout(() => el.classList.remove('visible'), 2500);
}

/* ---------- Navegació ---------- */

document.getElementById('menu').addEventListener('click', e => {
  const b = e.target.closest('button[data-vista]');
  if (b) anar(b.dataset.vista);
});

function anar(nova) {
  vista = nova;
  document.querySelectorAll('#menu button').forEach(b =>
    b.classList.toggle('actiu', b.dataset.vista === vista));
  pintar();
}

function pintar() {
  const cont = document.getElementById('contingut');
  if (vista === 'alumnes') cont.innerHTML = vistaAlumnes();
  else if (vista === 'criteris') cont.innerHTML = vistaCriteris();
  else if (vista === 'qualificar') cont.innerHTML = vistaQualificar();
  else cont.innerHTML = vistaResum();
}

/* ---------- Vista: Alumnes ---------- */

function vistaAlumnes() {
  const a = dades.alumnes.find(x => x.id === alumneEditant) || {};
  const files = dades.alumnes.map(x => `
    <tr>
      <td>${esc(x.nom)}</td>
      <td>${esc(x.cicle)}</td>
      <td>${esc(x.projecte)}</td>
      <td class="accions">
        <button class="btn sec petit" data-accio="qualificar" data-id="${x.id}">Qualificar</button>
        <button class="btn sec petit" data-accio="edita-alumne" data-id="${x.id}">Edita</button>
        <button class="btn perill petit" data-accio="esborra-alumne" data-id="${x.id}">Esborra</button>
      </td>
    </tr>`).join('');

  return `
    <section class="targeta">
      <h2>${a.id ? 'Edita l\'alumne' : 'Afegeix un alumne'}</h2>
      <form id="form-alumne" class="fila">
        <div class="camp"><label for="nom">Nom i cognoms</label>
          <input id="nom" required value="${esc(a.nom)}"></div>
        <div class="camp"><label for="cicle">Cicle / curs</label>
          <input id="cicle" placeholder="Ex. DAM 2n" value="${esc(a.cicle)}"></div>
        <div class="camp"><label for="projecte">Títol del projecte</label>
          <input id="projecte" value="${esc(a.projecte)}"></div>
        <button class="btn" type="submit">${a.id ? 'Desa els canvis' : 'Afegeix'}</button>
        ${a.id ? '<button class="btn sec" type="button" data-accio="cancela-alumne">Cancel·la</button>' : ''}
      </form>
    </section>
    <section class="targeta">
      <h2>Alumnes (${dades.alumnes.length})</h2>
      ${dades.alumnes.length ? `
        <div class="taula-contenidor"><table>
          <thead><tr><th>Nom</th><th>Cicle</th><th>Projecte</th><th></th></tr></thead>
          <tbody>${files}</tbody>
        </table></div>` : '<p class="buit">Encara no hi ha cap alumne. Afegeix-ne un amb el formulari.</p>'}
    </section>`;
}

/* ---------- Vista: Criteris ---------- */

function vistaCriteris() {
  const c = dades.criteris.find(x => x.id === criteriEditant) || {};
  const total = sumaPesos();
  const files = dades.criteris.map(x => `
    <tr>
      <td><strong>${esc(x.nom)}</strong><br><small>${esc(x.descripcio)}</small></td>
      <td class="num">${x.pes}%</td>
      <td class="accions">
        <button class="btn sec petit" data-accio="edita-criteri" data-id="${x.id}">Edita</button>
        <button class="btn perill petit" data-accio="esborra-criteri" data-id="${x.id}">Esborra</button>
      </td>
    </tr>`).join('');

  return `
    <section class="targeta">
      <h2>${c.id ? 'Edita el criteri' : 'Afegeix un criteri'}</h2>
      <form id="form-criteri" class="fila">
        <div class="camp"><label for="c-nom">Nom del criteri</label>
          <input id="c-nom" required value="${esc(c.nom)}"></div>
        <div class="camp"><label for="c-pes">Pes (%)</label>
          <input id="c-pes" type="number" min="0" max="100" step="1" required value="${c.pes ?? ''}"></div>
        <div class="camp" style="flex-basis:300px"><label for="c-desc">Descripció</label>
          <input id="c-desc" value="${esc(c.descripcio)}"></div>
        <button class="btn" type="submit">${c.id ? 'Desa els canvis' : 'Afegeix'}</button>
        ${c.id ? '<button class="btn sec" type="button" data-accio="cancela-criteri">Cancel·la</button>' : ''}
      </form>
    </section>
    <section class="targeta">
      <h2>Criteris de qualificació</h2>
      <p class="${total === 100 ? 'ok-pes' : 'aviso-pes'}">
        Suma dels pesos: ${total}% ${total === 100 ? '✔' : '(hauria de ser 100%)'}</p>
      ${dades.criteris.length ? `
        <div class="taula-contenidor"><table>
          <thead><tr><th>Criteri</th><th class="num">Pes</th><th></th></tr></thead>
          <tbody>${files}</tbody>
        </table></div>` : '<p class="buit">No hi ha cap criteri.</p>'}
    </section>`;
}

/* ---------- Vista: Qualificar ---------- */

function vistaQualificar() {
  if (!dades.alumnes.length) {
    return '<section class="targeta"><p class="buit">Primer has d\'afegir algun alumne.</p></section>';
  }
  if (!dades.alumnes.some(a => a.id === alumneActiu)) alumneActiu = dades.alumnes[0].id;
  const alumne = dades.alumnes.find(a => a.id === alumneActiu);
  const notes = dades.notes[alumneActiu] || {};

  const opcions = dades.alumnes.map(a =>
    `<option value="${a.id}" ${a.id === alumneActiu ? 'selected' : ''}>${esc(a.nom)}</option>`).join('');

  const criteris = dades.criteris.map(c => {
    const v = notes[c.id] ?? '';
    return `
      <div class="criteri">
        <div class="criteri-cap">
          <div><strong>${esc(c.nom)}</strong><small>${esc(c.descripcio)}</small></div>
          <span>${c.pes}%</span>
        </div>
        <div class="criteri-nota">
          <input type="range" min="0" max="10" step="0.25" value="${v === '' ? 0 : v}"
            data-nota-rang="${c.id}" aria-label="Nota de ${esc(c.nom)}">
          <input type="number" min="0" max="10" step="0.25" value="${v}" placeholder="—"
            data-nota="${c.id}" aria-label="Nota numèrica de ${esc(c.nom)}">
        </div>
      </div>`;
  }).join('');

  const nf = notaFinal(alumneActiu);
  return `
    <section class="targeta">
      <div class="fila">
        <div class="camp"><label for="sel-alumne">Alumne</label>
          <select id="sel-alumne">${opcions}</select></div>
        <div class="camp"><label>Projecte</label>
          <input value="${esc(alumne.projecte)}" disabled></div>
      </div>
    </section>
    <section class="targeta">
      <h2>Notes (de 0 a 10)</h2>
      ${criteris || '<p class="buit">No hi ha criteris definits.</p>'}
      <div class="camp"><label for="comentari">Comentaris per a l'alumne</label>
        <textarea id="comentari">${esc(dades.comentaris[alumneActiu])}</textarea></div>
    </section>
    <div class="total">
      <span>Nota final</span>
      <span class="gran nota ${classeNota(nf)}" id="nota-final">${formatNota(nf)}</span>
    </div>`;
}

/* ---------- Vista: Resum ---------- */

function vistaResum() {
  const f = filtre.trim().toLowerCase();
  const llista = dades.alumnes.filter(a =>
    !f || (a.nom + ' ' + a.cicle + ' ' + a.projecte).toLowerCase().includes(f));
  const caps = dades.criteris.map(c => `<th class="num">${esc(c.nom)}</th>`).join('');

  const files = llista.map(a => {
    const notes = dades.notes[a.id] || {};
    const cel = dades.criteris.map(c =>
      `<td class="num">${notes[c.id] === undefined || notes[c.id] === '' ? '—' : formatNota(Number(notes[c.id]))}</td>`).join('');
    const nf = notaFinal(a.id);
    return `<tr><td>${esc(a.nom)}<br><small>${esc(a.projecte)}</small></td>${cel}
      <td class="num nota ${classeNota(nf)}">${formatNota(nf)}</td></tr>`;
  }).join('');

  const amb = llista.map(a => notaFinal(a.id)).filter(n => n !== null);
  const mitjana = amb.length ? amb.reduce((s, n) => s + n, 0) / amb.length : null;
  const aprovats = amb.filter(n => n >= 5).length;

  return `
    <section class="targeta">
      <div class="fila no-imprimir">
        <div class="camp"><label for="filtre">Cerca</label>
          <input id="filtre" type="search" placeholder="Nom, cicle o projecte" value="${esc(filtre)}"></div>
        <button class="btn" data-accio="exporta-csv">Exporta a Excel (CSV)</button>
        <button class="btn sec" data-accio="imprimeix">Imprimeix</button>
      </div>
    </section>
    <section class="targeta">
      <h2>Resum de qualificacions</h2>
      <p>Mitjana: <strong>${formatNota(mitjana)}</strong> · Aprovats: <strong>${aprovats}</strong> de ${amb.length} qualificats</p>
      ${llista.length ? `
        <div class="taula-contenidor"><table>
          <thead><tr><th>Alumne</th>${caps}<th class="num">Final</th></tr></thead>
          <tbody>${files}</tbody>
        </table></div>` : '<p class="buit">No hi ha cap alumne per mostrar.</p>'}
    </section>
    <section class="targeta no-imprimir">
      <h2>Còpia de seguretat</h2>
      <p>Les dades es guarden en aquest navegador. Fes una còpia de tant en tant.</p>
      <div class="fila">
        <button class="btn sec" data-accio="exporta-json">Descarrega la còpia</button>
        <button class="btn sec" data-accio="importa-json">Restaura una còpia</button>
        <input type="file" id="fitxer-json" accept=".json" hidden>
      </div>
    </section>`;
}

/* ---------- Esdeveniments ---------- */

const contingut = document.getElementById('contingut');

contingut.addEventListener('submit', e => {
  e.preventDefault();
  if (e.target.id === 'form-alumne') {
    const a = {
      nom: val('nom'), cicle: val('cicle'), projecte: val('projecte')
    };
    if (alumneEditant) {
      Object.assign(dades.alumnes.find(x => x.id === alumneEditant), a);
      alumneEditant = null;
      avis('Alumne actualitzat');
    } else {
      dades.alumnes.push({ id: nouId(), ...a });
      avis('Alumne afegit');
    }
  } else if (e.target.id === 'form-criteri') {
    const c = {
      nom: val('c-nom'),
      pes: Math.max(0, Math.min(100, Number(val('c-pes')) || 0)),
      descripcio: val('c-desc')
    };
    if (criteriEditant) {
      Object.assign(dades.criteris.find(x => x.id === criteriEditant), c);
      criteriEditant = null;
      avis('Criteri actualitzat');
    } else {
      dades.criteris.push({ id: nouId(), ...c });
      avis('Criteri afegit');
    }
  }
  guardar();
  pintar();
});

function val(id) { return document.getElementById(id).value.trim(); }

contingut.addEventListener('click', e => {
  const b = e.target.closest('[data-accio]');
  if (!b) return;
  const id = b.dataset.id;
  switch (b.dataset.accio) {
    case 'qualificar': alumneActiu = id; anar('qualificar'); break;
    case 'edita-alumne': alumneEditant = id; pintar(); window.scrollTo(0, 0); break;
    case 'cancela-alumne': alumneEditant = null; pintar(); break;
    case 'esborra-alumne': {
      const a = dades.alumnes.find(x => x.id === id);
      if (confirm(`Vols esborrar ${a.nom} i les seves notes?`)) {
        dades.alumnes = dades.alumnes.filter(x => x.id !== id);
        delete dades.notes[id];
        delete dades.comentaris[id];
        guardar(); pintar(); avis('Alumne esborrat');
      }
      break;
    }
    case 'edita-criteri': criteriEditant = id; pintar(); window.scrollTo(0, 0); break;
    case 'cancela-criteri': criteriEditant = null; pintar(); break;
    case 'esborra-criteri': {
      const c = dades.criteris.find(x => x.id === id);
      if (confirm(`Vols esborrar el criteri «${c.nom}»? Se'n perdran les notes.`)) {
        dades.criteris = dades.criteris.filter(x => x.id !== id);
        Object.values(dades.notes).forEach(n => delete n[id]);
        guardar(); pintar(); avis('Criteri esborrat');
      }
      break;
    }
    case 'exporta-csv': exportaCSV(); break;
    case 'imprimeix': window.print(); break;
    case 'exporta-json': exportaJSON(); break;
    case 'importa-json': document.getElementById('fitxer-json').click(); break;
  }
});

contingut.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'filtre') {
    filtre = t.value;
    pintar();
    const el = document.getElementById('filtre');
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  } else if (t.id === 'comentari') {
    dades.comentaris[alumneActiu] = t.value;
    guardar();
  } else if (t.dataset.nota || t.dataset.notaRang) {
    const idCriteri = t.dataset.nota || t.dataset.notaRang;
    let v = t.value === '' ? '' : Math.max(0, Math.min(10, Number(t.value)));
    if (!dades.notes[alumneActiu]) dades.notes[alumneActiu] = {};
    if (v === '') delete dades.notes[alumneActiu][idCriteri];
    else dades.notes[alumneActiu][idCriteri] = v;
    // Mantén sincronitzats el control lliscant i el camp numèric
    const rang = contingut.querySelector(`[data-nota-rang="${idCriteri}"]`);
    const num = contingut.querySelector(`[data-nota="${idCriteri}"]`);
    if (t === rang) num.value = v;
    else rang.value = v === '' ? 0 : v;
    const nf = notaFinal(alumneActiu);
    const el = document.getElementById('nota-final');
    el.textContent = formatNota(nf);
    el.className = 'gran nota ' + classeNota(nf);
    guardar();
  }
});

contingut.addEventListener('change', e => {
  if (e.target.id === 'sel-alumne') {
    alumneActiu = e.target.value;
    pintar();
  } else if (e.target.id === 'fitxer-json') {
    importaJSON(e.target.files[0]);
  }
});

/* ---------- Exportar / importar ---------- */

function descarrega(nom, text, tipus) {
  const url = URL.createObjectURL(new Blob([text], { type: tipus }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  a.click();
  URL.revokeObjectURL(url);
}

function exportaCSV() {
  const cel = t => '"' + String(t ?? '').replace(/"/g, '""') + '"';
  const cap = ['Alumne', 'Cicle', 'Projecte', ...dades.criteris.map(c => `${c.nom} (${c.pes}%)`), 'Nota final', 'Comentaris'];
  const files = dades.alumnes.map(a => {
    const notes = dades.notes[a.id] || {};
    const nf = notaFinal(a.id);
    return [
      a.nom, a.cicle, a.projecte,
      ...dades.criteris.map(c => notes[c.id] === undefined ? '' : String(notes[c.id]).replace('.', ',')),
      nf === null ? '' : nf.toFixed(2).replace('.', ','),
      dades.comentaris[a.id] || ''
    ];
  });
  // BOM i punt i coma perquè Excel ho obri bé en català
  const text = '﻿' + [cap, ...files].map(f => f.map(cel).join(';')).join('\r\n');
  descarrega('qualificacions.csv', text, 'text/csv;charset=utf-8');
}

function exportaJSON() {
  descarrega('copia-qualificacions.json', JSON.stringify(dades, null, 2), 'application/json');
}

function importaJSON(fitxer) {
  if (!fitxer) return;
  const lector = new FileReader();
  lector.onload = () => {
    try {
      const nou = JSON.parse(lector.result);
      if (!Array.isArray(nou.alumnes) || !Array.isArray(nou.criteris)) throw new Error();
      if (!confirm('Això substituirà totes les dades actuals. Vols continuar?')) return;
      dades = { notes: {}, comentaris: {}, ...nou };
      guardar(); pintar(); avis('Còpia restaurada');
    } catch (err) {
      avis('El fitxer no és una còpia vàlida');
    }
  };
  lector.readAsText(fitxer);
}

pintar();
