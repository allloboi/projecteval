'use strict';

const CLAU = 'qualificacions-projectes-v1';

const CRITERIS_INICIALS = [
  { nom: 'Anàlisi i disseny', pes: 20, descripcio: 'Requisits, planificació i disseny de la solució.' },
  { nom: 'Resultat tècnic', pes: 30, descripcio: 'Funcionament i qualitat del producte final.' },
  { nom: 'Documentació', pes: 20, descripcio: 'Memòria clara, completa i ben estructurada.' },
  { nom: 'Presentació oral', pes: 20, descripcio: 'Exposició, domini del tema i resposta a preguntes.' },
  { nom: 'Autonomia i actitud', pes: 10, descripcio: 'Iniciativa, treball continuat i seguiment del tutor.' }
];

const CICLE_INICIAL = '1 DAM SEMI';
/* [abreviatura antiga (defineix l'id), nom nou: 3 lletres del nom i de cada cognom] */
const NOMS_ALUMNES = [
  ['RAC', 'Ram Apa Cho'], ['AA', 'Abo Azz'], ['ABC', 'ABC'], ['SBI', 'Seb Bra Itu'],
  ['MCA', 'Mar Cal Alv'], ['RCT', 'Ric Cer Tau'], ['VCF', 'Val Cra Fro'], ['PDP', 'Pas Dom Par'],
  ['SFV', 'Sim Flo Val'], ['CF', 'Cha Fou'], ['XGD', 'Xav Gar Dom'], ['PGJ', 'PGJ'],
  ['KGS', 'Kev Gim Ste'], ['BHG', 'Bor Her Gis'], ['AIL', 'And Iva Lan'], ['SJB', 'Ser Jor Bal'],
  ['MLC', 'Mar Lóp Can'], ['NMZ', 'Nat Mar Zel'], ['AMS', 'Ant Men Sal'], ['NMR', 'Nat Mur Rui'],
  ['MON', 'Mar Olt Nav'], ['YPC', 'Yam Pon Can'], ['JRA', 'Jor Rib Ara'], ['CRC', 'Car Rui Cle'],
  ['ISS', 'Ivá Sáe San'], ['JTF', 'Jua Tud Fer'], ['MVC', 'Mar Vid Cue'], ['JVD', 'Jos Vid Dur']
];
const ALUMNES_INICIALS = NOMS_ALUMNES.map(([ini, nom]) =>
  ({ id: 'ini-' + ini.toLowerCase(), nom, cicle: CICLE_INICIAL, projecte: '' }));

const GRUPS_NOUS = [
  { cicle: '1 DAW BD', prefix: 'daw', noms: ['AlvBriGim', 'CriCalCue', 'IvaChaMue', 'KarElaSef', 'PauGarPér',
    'DieIvaPet', 'DanKhaBal', 'PepLloGra', 'MoiMuñRod', 'MarOrtPer', 'SaüPayRub', 'SofPetPet', 'GuiSanBat'] },
  { cicle: 'CE NÚVOL', prefix: 'nuvol', noms: ['AsiDomBañ', 'JoaFerNav', 'JosGalSan', 'JosJuaTor', 'ÁngLloLóp',
    'LauMicPér', 'JesNavDat', 'AlePerCal', 'AleRodCal'] }
];
const ALUMNES_GRUPS = GRUPS_NOUS.flatMap(g => g.noms.map((nom, i) =>
  ({ id: `grup-${g.prefix}-${i + 1}`, nom, cicle: g.cicle, projecte: '' })));

/* [identificador, nom] de cada avaluació */
const AVALUACIONS = [['1', '1a avaluació'], ['2', '2a avaluació'], ['final', '3a avaluació']];

let dades = carregar();
let avaluacio = '1';
let totesAvaluacions = false;
let vista = 'inici';
let alumneActiu = null;
let grupActiu = null;
let alumneEditant = null;
let criteriEditant = null;
let filtre = '';

/* ---------- Dades ---------- */

function carregar() {
  try {
    const guardat = JSON.parse(localStorage.getItem(CLAU));
    if (guardat && Array.isArray(guardat.alumnes) && Array.isArray(guardat.criteris)) {
      if (!guardat.alumnesInicials) {
        // Primera vegada: afegeix la llista inicial d'alumnes (només una vegada)
        ALUMNES_INICIALS.forEach(a => {
          if (!guardat.alumnes.some(x => x.id === a.id)) guardat.alumnes.push({ ...a });
        });
        guardat.alumnesInicials = true;
        localStorage.setItem(CLAU, JSON.stringify(guardat));
      }
      if (!guardat.nomsActualitzats) {
        // Canvia les abreviatures antigues pels noms nous (només una vegada)
        NOMS_ALUMNES.forEach(([ini, nom]) => {
          const a = guardat.alumnes.find(x => x.id === 'ini-' + ini.toLowerCase());
          if (a && a.nom === ini) a.nom = nom;
        });
        guardat.nomsActualitzats = true;
        localStorage.setItem(CLAU, JSON.stringify(guardat));
      }
      if (!guardat.grupsAfegits) {
        // Afegeix els grups nous (només una vegada)
        ALUMNES_GRUPS.forEach(a => {
          if (!guardat.alumnes.some(x => x.id === a.id)) guardat.alumnes.push({ ...a });
        });
        guardat.grupsAfegits = true;
        localStorage.setItem(CLAU, JSON.stringify(guardat));
      }
      if (migraAvaluacions(guardat)) localStorage.setItem(CLAU, JSON.stringify(guardat));
      return guardat;
    }
  } catch (e) { /* dades corruptes: es comença de nou */ }
  const nou = {
    alumnesInicials: true,
    nomsActualitzats: true,
    grupsAfegits: true,
    alumnes: [...ALUMNES_INICIALS, ...ALUMNES_GRUPS].map(a => ({ ...a })),
    criteris: CRITERIS_INICIALS.map(c => ({ id: nouId(), ...c })),
    notes: {},
    comentaris: {}
  };
  migraAvaluacions(nou);
  return nou;
}

function nomGrup(alumne) {
  return alumne.cicle || 'Sense grup';
}

/* Passa de criteris comuns i notes úniques a criteris per grup i notes per avaluació (només una vegada).
   Les notes que ja hi havia queden a la 1a avaluació. */
function migraAvaluacions(d) {
  if (d.criterisPerGrup) return false;
  const grups = [...new Set(d.alumnes.map(nomGrup))];
  const mapa = {};
  const criteris = [];
  grups.forEach(g => {
    mapa[g] = {};
    d.criteris.forEach(c => {
      const id = nouId();
      mapa[g][c.id] = id;
      criteris.push({ ...c, id, grup: g });
    });
  });
  const notes = {};
  const comentaris = {};
  d.alumnes.forEach(a => {
    const g = nomGrup(a);
    const vells = (d.notes || {})[a.id];
    if (vells) {
      const n = {};
      Object.entries(vells).forEach(([idc, v]) => { if (mapa[g][idc]) n[mapa[g][idc]] = v; });
      notes[a.id] = { '1': n };
    }
    const com = (d.comentaris || {})[a.id];
    if (com) comentaris[a.id] = { '1': com };
  });
  d.criteris = criteris;
  d.notes = notes;
  d.comentaris = comentaris;
  d.criterisPerGrup = true;
  return true;
}

function criterisDe(grup) {
  return dades.criteris.filter(c => c.grup === grup);
}

function notesDe(idAlumne, aval) {
  return (dades.notes[idAlumne] || {})[aval] || {};
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

function sumaPesos(grup) {
  return criterisDe(grup).reduce((s, c) => s + Number(c.pes || 0), 0);
}

/* Nota d'una avaluació sobre 10, o null si l'alumne encara no té cap nota. */
function notaFinal(idAlumne, aval) {
  const alumne = dades.alumnes.find(x => x.id === idAlumne);
  if (!alumne) return null;
  const notes = notesDe(idAlumne, aval);
  let suma = 0, pesos = 0, n = 0;
  criterisDe(nomGrup(alumne)).forEach(c => {
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

/* Nota final del curs: mitjana de les avaluacions que ja tenen nota, o null si no n'hi ha cap. */
function notaCurs(idAlumne) {
  const notes = AVALUACIONS.map(([id]) => notaFinal(idAlumne, id)).filter(n => n !== null);
  return notes.length ? notes.reduce((s, n) => s + n, 0) / notes.length : null;
}

function selectorAvaluacio(ambTotes) {
  const triada = ambTotes && totesAvaluacions ? 'totes' : avaluacio;
  const opcions = AVALUACIONS.map(([id, nom]) =>
    `<option value="${id}" ${id === triada ? 'selected' : ''}>${nom}</option>`).join('') +
    (ambTotes ? `<option value="totes" ${triada === 'totes' ? 'selected' : ''}>Totes les avaluacions i nota final</option>` : '');
  return `<div class="camp"><label for="sel-avaluacio">Avaluació</label>
          <select id="sel-avaluacio">${opcions}</select></div>`;
}

function selectorGrup(grups) {
  const opcions = grups.map(g =>
    `<option value="${esc(g.nom)}" ${g.nom === grupActiu ? 'selected' : ''}>${esc(g.nom)} (${g.alumnes.length})</option>`).join('');
  return `<div class="camp"><label for="sel-grup">Grup</label>
          <select id="sel-grup">${opcions}</select></div>`;
}

/* ---------- Navegació ---------- */

document.addEventListener('click', e => {
  const b = e.target.closest('[data-vista]');
  if (b) {
    e.preventDefault();
    anar(b.dataset.vista);
    window.scrollTo(0, 0);
  }
});

const botoMenu = document.getElementById('boto-menu');
botoMenu.addEventListener('click', () => {
  const obert = document.getElementById('menu').classList.toggle('obert');
  botoMenu.setAttribute('aria-expanded', obert);
  botoMenu.setAttribute('aria-label', obert ? 'Tanca el menú' : 'Obre el menú');
  botoMenu.querySelector('use').setAttribute('href', obert ? '#i-x' : '#i-menu');
});

function anar(nova) {
  vista = nova;
  document.querySelectorAll('#menu button:not(.cta)').forEach(b =>
    b.classList.toggle('actiu', b.dataset.vista === vista));
  // Tanca el menú d'hamburguesa en mòbil
  if (document.getElementById('menu').classList.contains('obert')) botoMenu.click();
  pintar();
}

/* La portada, les xifres i els mòduls només es veuen a l'inici. */
function pintarInici() {
  const inici = vista === 'inici';
  ['heroi', 'estadistiques', 'inici-extra'].forEach(id => {
    document.getElementById(id).hidden = !inici;
  });
  if (!inici) return;
  const grups = llistaGrups().length;
  const qualificats = AVALUACIONS.reduce((s, [id]) =>
    s + dades.alumnes.filter(a => notaFinal(a.id, id) !== null).length, 0);
  const xifres = [
    [dades.alumnes.length, 'Alumnes'], [grups, 'Grups'],
    [dades.criteris.length, 'Criteris'], [qualificats, 'Qualificacions posades']
  ];
  document.getElementById('estadistiques').innerHTML = xifres.map(([n, t]) =>
    `<div class="estad"><strong>${n}</strong><span>${t}</span></div>`).join('');
}

function pintar() {
  pintarInici();
  const cont = document.getElementById('contingut');
  if (vista === 'inici') cont.innerHTML = '';
  else if (vista === 'alumnes') cont.innerHTML = vistaAlumnes();
  else if (vista === 'grups') cont.innerHTML = vistaGrups();
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

/* ---------- Vista: Grups ---------- */

function llistaGrups() {
  const grups = [];
  dades.alumnes.forEach(a => {
    const nom = a.cicle || 'Sense grup';
    let g = grups.find(x => x.nom === nom);
    if (!g) grups.push(g = { nom, alumnes: [] });
    g.alumnes.push(a);
  });
  return grups;
}

function vistaGrups() {
  const grups = llistaGrups();
  if (!grups.length) {
    return '<section class="targeta"><p class="buit">Encara no hi ha cap grup.</p></section>';
  }
  if (!grups.some(g => g.nom === grupActiu)) grupActiu = grups[0].nom;
  const seleccio = `
    <section class="targeta">
      <div class="fila">
        ${selectorGrup(grups)}
      </div>
      <form id="form-grup" class="fila">
        <div class="camp"><label for="nom-grup">Nom del grup</label>
          <input id="nom-grup" required value="${esc(grupActiu)}"></div>
        <button class="btn" type="submit">Canvia el nom</button>
      </form>
    </section>`;
  return seleccio + grups.filter(g => g.nom === grupActiu).map(g => `
    <section class="targeta">
      <h2>${esc(g.nom)} (${g.alumnes.length})</h2>
      <div class="taula-contenidor"><table>
        <thead><tr><th>Alumne</th><th>Projecte</th>${AVALUACIONS.map(([, nom]) =>
          `<th class="num">${nom}</th>`).join('')}<th></th></tr></thead>
        <tbody>${g.alumnes.map(a => {
          return `<tr>
            <td>${esc(a.nom)}</td>
            <td>${esc(a.projecte)}</td>
            ${AVALUACIONS.map(([id]) => {
              const nf = notaFinal(a.id, id);
              return `<td class="num nota ${classeNota(nf)}">${formatNota(nf)}</td>`;
            }).join('')}
            <td class="accions"><button class="btn sec petit" data-accio="qualificar" data-id="${a.id}">Qualificar</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </section>`).join('');
}

/* ---------- Vista: Criteris ---------- */

function vistaCriteris() {
  const grups = llistaGrups();
  if (!grups.length) {
    return '<section class="targeta"><p class="buit">Primer has d\'afegir algun alumne.</p></section>';
  }
  if (!grups.some(g => g.nom === grupActiu)) grupActiu = grups[0].nom;
  const criterisGrup = criterisDe(grupActiu);
  const c = criterisGrup.find(x => x.id === criteriEditant) || {};
  const total = sumaPesos(grupActiu);
  const altres = grups.filter(g => g.nom !== grupActiu && criterisDe(g.nom).length);
  const copia = !criterisGrup.length && altres.length ? `
      <div class="fila">
        <div class="camp"><label for="copia-grup">Copia els criteris d'un altre grup</label>
          <select id="copia-grup">${altres.map(g => `<option value="${esc(g.nom)}">${esc(g.nom)}</option>`).join('')}</select></div>
        <button class="btn sec" data-accio="copia-criteris">Copia</button>
      </div>` : '';
  const files = criterisGrup.map(x => `
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
      <div class="fila">
        ${selectorGrup(grups)}
      </div>
    </section>
    <section class="targeta">
      <h2>${c.id ? 'Edita el criteri' : 'Afegeix un criteri'} · ${esc(grupActiu)}</h2>
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
      <h2>Criteris de qualificació · ${esc(grupActiu)}</h2>
      <p class="${total === 100 ? 'ok-pes' : 'aviso-pes'}">
        Suma dels pesos: ${total}% ${total === 100 ? '✔' : '(hauria de ser 100%)'}</p>
      ${copia}
      ${criterisGrup.length ? `
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
  const notes = notesDe(alumneActiu, avaluacio);
  grupActiu = nomGrup(alumne);

  const opcions = dades.alumnes.filter(a => nomGrup(a) === grupActiu).map(a =>
    `<option value="${a.id}" ${a.id === alumneActiu ? 'selected' : ''}>${esc(a.nom)}</option>`).join('');

  const criteris = criterisDe(nomGrup(alumne)).map(c => {
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

  const nf = notaFinal(alumneActiu, avaluacio);
  const nomAval = AVALUACIONS.find(([id]) => id === avaluacio)[1];
  return `
    <section class="targeta">
      <div class="fila">
        ${selectorGrup(llistaGrups())}
        <div class="camp"><label for="sel-alumne">Alumne</label>
          <select id="sel-alumne">${opcions}</select></div>
        ${selectorAvaluacio()}
        <div class="camp"><label>Projecte</label>
          <input value="${esc(alumne.projecte)}" disabled></div>
      </div>
    </section>
    <section class="targeta">
      <h2>Notes de la ${nomAval} (de 0 a 10)</h2>
      ${criteris || '<p class="buit">Aquest grup encara no té criteris. Defineix-los a l\'apartat «Criteris».</p>'}
      <div class="camp"><label for="comentari">Comentaris per a l'alumne</label>
        <textarea id="comentari">${esc((dades.comentaris[alumneActiu] || {})[avaluacio])}</textarea></div>
    </section>
    <div class="total">
      <span>Nota ${nomAval}</span>
      <span class="gran nota ${classeNota(nf)}" id="nota-final">${formatNota(nf)}</span>
    </div>`;
}

/* ---------- Vista: Resum ---------- */

function vistaResum() {
  const grups = llistaGrups();
  if (grups.length && !grups.some(g => g.nom === grupActiu)) grupActiu = grups[0].nom;
  const f = filtre.trim().toLowerCase();
  const llista = dades.alumnes.filter(a => nomGrup(a) === grupActiu &&
    (!f || (a.nom + ' ' + a.cicle + ' ' + a.projecte).toLowerCase().includes(f)));
  if (totesAvaluacions) return vistaResumTotes(grups, llista);
  const criterisGrup = criterisDe(grupActiu);
  const caps = criterisGrup.map(c => `<th class="num">${esc(c.nom)}</th>`).join('');
  const nomAval = AVALUACIONS.find(([id]) => id === avaluacio)[1];

  const files = llista.map(a => {
    const notes = notesDe(a.id, avaluacio);
    const cel = criterisGrup.map(c =>
      `<td class="num">${notes[c.id] === undefined || notes[c.id] === '' ? '—' : formatNota(Number(notes[c.id]))}</td>`).join('');
    const nf = notaFinal(a.id, avaluacio);
    return `<tr><td>${esc(a.nom)}<br><small>${esc(a.projecte)}</small></td>${cel}
      <td class="num nota ${classeNota(nf)}">${formatNota(nf)}</td></tr>`;
  }).join('');

  const amb = llista.map(a => notaFinal(a.id, avaluacio)).filter(n => n !== null);
  const mitjana = amb.length ? amb.reduce((s, n) => s + n, 0) / amb.length : null;
  const aprovats = amb.filter(n => n >= 5).length;

  return `
    <section class="targeta">
      <div class="fila no-imprimir">
        ${selectorGrup(grups)}
        ${selectorAvaluacio(true)}
        <div class="camp"><label for="filtre">Cerca</label>
          <input id="filtre" type="search" placeholder="Nom o projecte" value="${esc(filtre)}"></div>
        <button class="btn" data-accio="exporta-csv">Exporta a Excel (CSV)</button>
        <button class="btn sec" data-accio="imprimeix">Imprimeix</button>
      </div>
    </section>
    <section class="targeta">
      <h2>Resum de qualificacions · ${esc(grupActiu)} · ${nomAval}</h2>
      <p>Mitjana: <strong>${formatNota(mitjana)}</strong> · Aprovats: <strong>${aprovats}</strong> de ${amb.length} qualificats</p>
      ${llista.length ? `
        <div class="taula-contenidor"><table>
          <thead><tr><th>Alumne</th>${caps}<th class="num">Nota</th></tr></thead>
          <tbody>${files}</tbody>
        </table></div>` : '<p class="buit">No hi ha cap alumne per mostrar.</p>'}
    </section>
    ${copiaSeguretat()}`;
}

/* Resum amb les notes de totes les avaluacions i la nota final del curs. */
function vistaResumTotes(grups, llista) {
  const caps = AVALUACIONS.map(([, nom]) => `<th class="num">${nom}</th>`).join('');
  const files = llista.map(a => {
    const cel = AVALUACIONS.map(([id]) => {
      const nf = notaFinal(a.id, id);
      return `<td class="num nota ${classeNota(nf)}">${formatNota(nf)}</td>`;
    }).join('');
    const nc = notaCurs(a.id);
    return `<tr><td>${esc(a.nom)}<br><small>${esc(a.projecte)}</small></td>${cel}
      <td class="num nota ${classeNota(nc)}"><strong>${formatNota(nc)}</strong></td></tr>`;
  }).join('');

  const amb = llista.map(a => notaCurs(a.id)).filter(n => n !== null);
  const mitjana = amb.length ? amb.reduce((s, n) => s + n, 0) / amb.length : null;
  const aprovats = amb.filter(n => n >= 5).length;

  return `
    <section class="targeta">
      <div class="fila no-imprimir">
        ${selectorGrup(grups)}
        ${selectorAvaluacio(true)}
        <div class="camp"><label for="filtre">Cerca</label>
          <input id="filtre" type="search" placeholder="Nom o projecte" value="${esc(filtre)}"></div>
        <button class="btn" data-accio="exporta-csv">Exporta a Excel (CSV)</button>
        <button class="btn sec" data-accio="imprimeix">Imprimeix</button>
      </div>
    </section>
    <section class="targeta">
      <h2>Totes les avaluacions · ${esc(grupActiu)}</h2>
      <p>La nota final és la mitjana de les avaluacions que ja tenen nota.</p>
      <p>Mitjana final: <strong>${formatNota(mitjana)}</strong> · Aprovats: <strong>${aprovats}</strong> de ${amb.length} qualificats</p>
      ${llista.length ? `
        <div class="taula-contenidor"><table>
          <thead><tr><th>Alumne</th>${caps}<th class="num">Nota final</th></tr></thead>
          <tbody>${files}</tbody>
        </table></div>` : '<p class="buit">No hi ha cap alumne per mostrar.</p>'}
    </section>
    ${copiaSeguretat()}`;
}

function copiaSeguretat() {
  return `
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
  } else if (e.target.id === 'form-grup') {
    const nou = val('nom-grup');
    if (nou !== grupActiu) {
      if (llistaGrups().some(g => g.nom === nou)) {
        avis('Ja existeix un grup amb aquest nom');
        return;
      }
      dades.alumnes.forEach(a => {
        if (nomGrup(a) === grupActiu) a.cicle = nou;
      });
      dades.criteris.forEach(c => {
        if (c.grup === grupActiu) c.grup = nou;
      });
      grupActiu = nou;
      avis('Nom del grup actualitzat');
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
      dades.criteris.push({ id: nouId(), grup: grupActiu, ...c });
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
        Object.values(dades.notes).forEach(av => Object.values(av).forEach(n => delete n[id]));
        guardar(); pintar(); avis('Criteri esborrat');
      }
      break;
    }
    case 'copia-criteris': {
      const origen = document.getElementById('copia-grup').value;
      criterisDe(origen).forEach(c => dades.criteris.push({ ...c, id: nouId(), grup: grupActiu }));
      guardar(); pintar(); avis('Criteris copiats');
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
    if (!dades.comentaris[alumneActiu]) dades.comentaris[alumneActiu] = {};
    dades.comentaris[alumneActiu][avaluacio] = t.value;
    guardar();
  } else if (t.dataset.nota || t.dataset.notaRang) {
    const idCriteri = t.dataset.nota || t.dataset.notaRang;
    let v = t.value === '' ? '' : Math.max(0, Math.min(10, Number(t.value)));
    if (!dades.notes[alumneActiu]) dades.notes[alumneActiu] = {};
    if (!dades.notes[alumneActiu][avaluacio]) dades.notes[alumneActiu][avaluacio] = {};
    if (v === '') delete dades.notes[alumneActiu][avaluacio][idCriteri];
    else dades.notes[alumneActiu][avaluacio][idCriteri] = v;
    // Mantén sincronitzats el control lliscant i el camp numèric
    const rang = contingut.querySelector(`[data-nota-rang="${idCriteri}"]`);
    const num = contingut.querySelector(`[data-nota="${idCriteri}"]`);
    if (t === rang) num.value = v;
    else rang.value = v === '' ? 0 : v;
    const nf = notaFinal(alumneActiu, avaluacio);
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
  } else if (e.target.id === 'sel-grup') {
    grupActiu = e.target.value;
    criteriEditant = null;
    const actual = dades.alumnes.find(a => a.id === alumneActiu);
    if (!actual || nomGrup(actual) !== grupActiu) {
      const primer = dades.alumnes.find(a => nomGrup(a) === grupActiu);
      if (primer) alumneActiu = primer.id;
    }
    pintar();
  } else if (e.target.id === 'sel-avaluacio') {
    totesAvaluacions = e.target.value === 'totes';
    if (!totesAvaluacions) avaluacio = e.target.value;
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
  // Només el grup triat al resum, amb les tres avaluacions
  const criterisGrup = criterisDe(grupActiu);
  const cap = ['Alumne', 'Cicle', 'Projecte'];
  AVALUACIONS.forEach(([, nom]) => {
    cap.push(...criterisGrup.map(c => `${nom} · ${c.nom} (${c.pes}%)`), `${nom} · Nota`, `${nom} · Comentaris`);
  });
  cap.push('Nota final');
  const files = dades.alumnes.filter(a => nomGrup(a) === grupActiu).map(a => {
    const fila = [a.nom, a.cicle, a.projecte];
    AVALUACIONS.forEach(([id]) => {
      const notes = notesDe(a.id, id);
      const nf = notaFinal(a.id, id);
      fila.push(
        ...criterisGrup.map(c => notes[c.id] === undefined ? '' : String(notes[c.id]).replace('.', ',')),
        nf === null ? '' : nf.toFixed(2).replace('.', ','),
        (dades.comentaris[a.id] || {})[id] || ''
      );
    });
    const nc = notaCurs(a.id);
    fila.push(nc === null ? '' : nc.toFixed(2).replace('.', ','));
    return fila;
  });
  // BOM i punt i coma perquè Excel ho obri bé en català
  const text = '﻿' + [cap, ...files].map(f => f.map(cel).join(';')).join('\r\n');
  descarrega(`qualificacions-${grupActiu}.csv`, text, 'text/csv;charset=utf-8');
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
      dades = { notes: {}, comentaris: {}, ...nou, alumnesInicials: true };
      migraAvaluacions(dades);
      guardar(); pintar(); avis('Còpia restaurada');
    } catch (err) {
      avis('El fitxer no és una còpia vàlida');
    }
  };
  lector.readAsText(fitxer);
}

pintar();
