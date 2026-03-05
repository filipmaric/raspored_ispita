const ispitniRok = [
  "2026-03-05",
  "2026-03-06",
  "2026-03-07",
  "2026-03-09",
  "2026-03-10",
  "2026-03-11",
  "2026-03-12",
  "2026-03-13",
  "2026-03-14",
  "2026-03-16",
  "2026-03-17"
];


function cyr2lat(str) {
   const mapa = {
    'А':'A','Б':'B','В':'V','Г':'G','Д':'D','Ђ':'Dj','Е':'E','Ж':'Z','З':'Z','И':'I',
    'Ј':'J','К':'K','Л':'L','Љ':'Lj','М':'M','Н':'N','Њ':'Nj','О':'O','П':'P',
    'Р':'R','С':'S','Т':'T','Ћ':'C','У':'U','Ф':'F','Х':'H','Ц':'C','Ч':'C',
    'Џ':'Dz','Ш':'S',

    'а':'a','б':'b','в':'v','г':'g','д':'d','ђ':'dj','е':'e','ж':'z','з':'z','и':'i',
    'ј':'j','к':'k','л':'l','љ':'lj','м':'m','н':'n','њ':'nj','о':'o','п':'p',
    'р':'r','с':'s','т':'t','ћ':'c','у':'u','ф':'f','х':'h','ц':'c','ч':'c',
    'џ':'dz','ш':'s'
  };

  let rezultat = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    rezultat += mapa[ch] !== undefined ? mapa[ch] : ch;
  }
  return rezultat;
}

function formatSrDate(input) {
  // "28.12.2025. 9.00" → delovi
  const [datePart, timePart] = input.split(" ");
  const [day, month, year] = datePart.split(".").filter(Boolean);
  const [hour, minute] = timePart.split(".");

  // kreiranje Date objekta
  const date = new Date(year, month - 1, day, hour, minute);

  // naziv dana (ćirilica)
  let weekday = new Intl.DateTimeFormat("sr-Cyrl-RS", {
    weekday: "long"
  }).format(date);

  // veliko početno slovo
  weekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

  return `${weekday}, ${day}. ${month}. ${year} у ${hour}.${minute}`;
}

// Parsiranje CSV fajla
function parseCSV(csvText) {
    return csvText.trim().split('\n').map(line => {
        const [sifra,predmet,broj_studenata,dan,sat,katedra,grupa,semestar,akreditacija,racunari,ispravan_semestar,smerovi,lokacija] = line.split(',');
        return {
            grupa: grupa.trim() + " (" + akreditacija.trim() + ")",
            predmet: predmet.trim() + (smerovi ? (" (" + smerovi.split("").map(x => "М"+x).join(", ") + ")") : ""),
            semestar: semestar.trim(),
	    prijavljenih: broj_studenata,
            termin: formatSrDate(dan.trim().replace(/ /g, "")+" "+sat.trim()+".00"),
            lokacija: lokacija.trim()
        };
    });
}

// Popunjavanje select elemenata
function popuniOpcije(selectElem, vrednosti) {
  vrednosti.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    selectElem.appendChild(opt);
  });
}

// Prikaz rezultata
function prikaziIspite(ispiti) {
  const tbody = document.querySelector('#tabela tbody');
  tbody.innerHTML = '';

  if (ispiti.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#777;">Nema ispita za izabrane kriterijume</td></tr>`;
    return;
  }

  ispiti.forEach(i => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class='${cyr2lat(i.semestar)}'>${i.grupa}</td>
      <td class='${cyr2lat(i.semestar)}'>${i.predmet}</td>
      <td class='${cyr2lat(i.semestar)}'>${i.prijavljenih}</td>
      <td class='${cyr2lat(i.semestar)}'>${i.semestar}</td>
      <td class='${cyr2lat(i.semestar)}'>${i.termin}</td>
      <td class='${cyr2lat(i.semestar)}'>${i.lokacija}</td>
    `;
    tbody.appendChild(tr);
  });
}

function datumTermina(termin) {
  // razdvoji dan u nedelji
  const [, ostatak] = termin.split(', ');

  // razdvoji datum i vreme
  const [datumDeo, vremeDeo] = ostatak.split(' у ');

  // datum: "20. 2. 2026"
  const [dan, mesec, godina] = datumDeo
    .split('.')
    .map(s => s.trim())
    .filter(Boolean);

  // vreme: "13.00"
  const [sat, minut] = vremeDeo.split('.');
    
  return new Date(
    parseInt(godina),
    parseInt(mesec - 1),
    parseInt(dan)
  );
}

function vremeTermina(termin) {
  // razdvoji dan u nedelji
  const [, ostatak] = termin.split(', ');

  // razdvoji datum i vreme
  const [datumDeo, vremeDeo] = ostatak.split(' у ');
  return vremeDeo;
}

function prikaziNedeljniRaspored(ispiti) {
  if (!ispiti || ispiti.length === 0) {
    document.getElementById("kalendar").innerHTML = "<p>Нема испита.</p>";
    return;
  }

  // grupišemo ispite po datumima 
  const poDatumu = {};
  for (const ispit of ispiti) {
      const datum = datumTermina(ispit.termin).toISOString().slice(0,10);
      if (!poDatumu[datum])
         poDatumu[datum] = [];
      poDatumu[datum].push(ispit);
  }

  // za svaki datum sortiramo ispite po terminu početka 
  for (const datum in poDatumu) {
    poDatumu[datum].sort((a, b) => {
         return parseFloat(vremeTermina(a.termin)) - parseFloat(vremeTermina(b.termin))
     });
  }    

  // određujemo nedelje u kojima se održavaju ispiti
  function pocetakNedelje(d) {
    const date = new Date(d);
    const dan = (date.getDay() + 6) % 7; // pon=0
    date.setDate(date.getDate() - dan);
    date.setHours(0,0,0,0);
    return date;
  }

  function krajNedelje(d) {
    const start = pocetakNedelje(d);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end;
  }

  function sveNedelje(start, end) {
    const nedelje = [];
    let d = new Date(start);
    while (d <= end) {
      nedelje.push(new Date(d));
      d.setDate(d.getDate() + 7);
    }
    return nedelje;
  }

  // ======= raspon =======
  const datumi = ispiti.map(i => datumTermina(i.termin));
  const minDatum = new Date(Math.min(...datumi));
  const maxDatum = new Date(Math.max(...datumi));

  const start = pocetakNedelje(minDatum);
  const end   = krajNedelje(maxDatum);


  // ======= prikaz =======
  const dani = ["Понедељак", "Уторак", "Среда", "Четвртак", "Петак", "Субота", "Недеља"];
  const nedelje = sveNedelje(start, end);

  let html = "<table border='1' cellspacing='0' cellpadding='6'>";
  html += "<tr>";
  for (const d of dani) html += `<th>${d}</th>`;
  html += "</tr>";

  // formatira se datum u obliku yyyy-mm-dd
  function formatDatum(d) {
      const y = d.getFullYear();
      const m = String(d.getMonth()+1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
  }    
    
 for (const n of nedelje) {
    html += "<tr>";

    for (let i = 0; i < 7; i++) {
      const datum = new Date(n);
      datum.setDate(n.getDate() + i);
      const jeURoku = ispitniRok.includes(formatDatum(datum));

      const key = datum.toISOString().slice(0,10);
      html += `<td valign="top" class="${jeURoku ? "u-roku" : ""}"><b>${datum.getDate()}. ${datum.getMonth() + 1}</b>`;

      if (poDatumu[key]) {
        for (const ispit of poDatumu[key]) {
          html += `<div><span class=${cyr2lat(ispit.semestar)}>📝 ${vremeTermina(ispit.termin)} – ${ispit.predmet}</span></div>`;
        }
      }

      html += "</td>";
    }
     
    html += "</tr>";
  }

  html += "</table>";
  document.getElementById("kalendar").innerHTML = html;
}


function porediTermine(a, b) {
    const datumA = datumTermina(a);
    const vremeA = parseFloat(vremeTermina(a));
    const datumB = datumTermina(b);
    const vremeB = parseFloat(vremeTermina(b));
    return datumA.getTime() - datumB.getTime() || vremeA - vremeB;
}

// Glavni deo
fetch('raspored-2026.02.csv?date=' + new Date().toISOString())
  .then(response => response.text())
  .then(text => {
    const sviIspiti = parseCSV(text);

    // Izvuci sve grupe i termine
    const grupe = [...new Set(sviIspiti.map(i => i.grupa))].sort((a, b) => {
        const [, ab, ay] = a.match(/^(\d+).*?\((\d{4})\)$/);
        const [, bb, by] = b.match(/^(\d+).*?\((\d{4})\)$/);
	return ab.localeCompare(bb, "sr-Cyrl") || by - ay;
    });
    const termini = [...new Set(sviIspiti.map(i => i.termin))].sort(porediTermine);
    const lokacije = [...new Set(sviIspiti.map(i => i.lokacija))].sort();

    const grupaSelect = document.querySelector('#grupa');
    const terminSelect = document.querySelector('#termin');
    const lokacijaSelect = document.querySelector('#lokacija');
    const predmetText = document.querySelector('#predmet');  

    popuniOpcije(grupaSelect, grupe);
    popuniOpcije(terminSelect, termini);
    popuniOpcije(lokacijaSelect, lokacije);

    let currentSort = { key: null, asc: true };
      
    // Funkcija filtriranja
    function filtriraj() {
      const g = grupaSelect.value.trim();
      const t = terminSelect.value.trim();
      const l = lokacijaSelect.value.trim();
      const p = predmetText.value.toLowerCase();

      const filtrirani = sviIspiti.filter(i => {
        const grupaOdgovara =
          g === '' ||
          g.startsWith(i.grupa) || // ispit grupe 4M važi i za 4MR, 4ML, itd.
          i.grupa.startsWith(g);   // (opciono, u slučaju unazad)
        const terminOdgovara = t === '' || i.termin === t;
        const lokacijaOdgovara = l === '' || i.lokacija === l;
        const predmetOdgovara = p === '' || i.predmet.toLowerCase().includes(p);          
        return grupaOdgovara && terminOdgovara && lokacijaOdgovara && predmetOdgovara;
      });

     if(currentSort.key) {
         if (currentSort.key == "termin") 
             filtrirani.sort((a, b) => porediTermine(a[currentSort.key], b[currentSort.key]));
	 else if (currentSort.key == "prijavljenih") {
	     filtrirani.sort((a, b) => (parseInt(b.prijavljenih) - parseInt(a.prijavljenih)) * (currentSort.asc ? 1 : -1));
         } else
           filtrirani.sort((a,b) =>
             a[currentSort.key].localeCompare(b[currentSort.key], 'sr', {sensitivity: 'base'}) * (currentSort.asc ? 1 : -1)
           );
	 
     } else {
       filtrirani.sort((a, b) => {
           // Prvo poređenje po grupi
           const grupaCompare = a.grupa.localeCompare(b.grupa, 'sr', {sensitivity: 'base'});
           if (grupaCompare !== 0) return grupaCompare;

           // Ako su grupe iste, poredi po semestru
           return a.semestar.localeCompare(b.semestar, 'sr', {sensitivity: 'base'});
       });
     }
	
      prikaziIspite(filtrirani);
      if (g != "")
          prikaziNedeljniRaspored(filtrirani);
      else
          prikaziNedeljniRaspored([]);
    }

    grupaSelect.addEventListener('change', filtriraj);
    terminSelect.addEventListener('change', filtriraj);
    lokacijaSelect.addEventListener('change', filtriraj);
    predmetText.addEventListener('input', filtriraj);

    // promeni sortiranje klikom na zaglavlje kolone
    const tabela = document.querySelector('#tabela');
    const tbody = tabela.querySelector('tbody');
    tabela.querySelectorAll('th').forEach((th, index) => {
    th.addEventListener('click', () => {
      const keyMap = ['grupa','predmet', 'prijavljenih', 'semestar', 'termin','lokacija'];
      const key = keyMap[index];

      if(currentSort.key === key) {
        // promeni smer
        currentSort.asc = !currentSort.asc;
      } else {
        currentSort.key = key;
        currentSort.asc = true;
      }
      filtriraj(); // primeni filtriranje + sortiranje
      });
    });

    // Prikaži sve pri učitavanju
    filtriraj();
  })
  .catch(err => {
    console.error('Greška pri učitavanju CSV fajla:', err);
  });

