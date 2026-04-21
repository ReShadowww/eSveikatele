(function() {
  function isPacientoSuvestine() {
      const el = document.querySelector("ng-transclude");
      if (!el) return false;
      return el.textContent.trim() === "Paciento suvestinė";
  }

  function getDiagnosisData() {
      const diagnosisMap = new Map();
      const forms = document.querySelectorAll("app-diagnoses-form");
      forms.forEach(form => {
          const lis = form.querySelector("ol")?.querySelectorAll("li");
          if (lis) {
              lis.forEach(li => {
                  const divs = li.querySelector("header")?.querySelectorAll("div");
                  if (divs && divs.length >= 2) {
                      const date = divs[0].innerText.trim();
                      const diagnosis = divs[1].innerText.trim();
                      if (!diagnosisMap.has(diagnosis)) {
                          diagnosisMap.set(diagnosis, new Set());
                      }
                      diagnosisMap.get(diagnosis).add(date);
                  }
              });
          }
      });
      let result = [];
      for (const [diagnosis, datesSet] of diagnosisMap.entries()) {
          const sortedDates = Array.from(datesSet).sort((a, b) => b.localeCompare(a));
          result.push({
              diagnosis,
              dates: sortedDates
          });
      }
      result.sort((a, b) => {
          if (b.dates.length !== a.dates.length) {
              return b.dates.length - a.dates.length;
          }
          if (b.dates[0] !== a.dates[0]) {
              return b.dates[0].localeCompare(a.dates[0]);
          }
          return a.diagnosis.localeCompare(b.diagnosis)
      });
      return result;
  }

  function openDiagnosesInNewWindow(data) {
      let html = `
      <html>
        <head>
          <title>Diagnozių sąrašas</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 1em;
              background: #fafbfc;
            }
            .card {
              background: #fff;
              border-radius: 6px;
              box-shadow: 0 1px 4px rgba(0,0,0,0.06);
              margin-bottom: 1em;
              padding: .8em 1.4em .8em 1em;
            }
            .diagnosis {
              font-size: 1.06em;
              color: #234;
              font-weight: bold;
              margin-bottom: .3em;
            }
            ul.dates {
              margin: 0.3em 0 0.3em 1em;
              padding: 0;
              list-style: disc;
              font-size: 0.96em;
            }
            .date-badge {
              display: inline-block;
              background: #e3e7fc;
              color: #234;
              border-radius: 1em;
              padding: 0.11em .74em;
              margin: .07em .16em .07em 0;
              font-size: 0.96em;
            }
            details[open] summary:after {
              content: "▲";
              float: right;
              font-size: .88em;
              margin-left: .5em;
            }
            details summary:after {
              content: "▼";
              float: right;
              font-size: .88em;
              margin-left: .5em;
            }
            summary {
              outline: none;
              cursor: pointer;
              font-size: .97em;
            }
            .dates-info {
              margin-bottom: .2em;
            }
            .dates-meta {
              color: #888;
              font-size: .93em;
              margin-bottom: 0.18em;
              margin-left: .26em;
              vertical-align: middle;
            }
            @media (max-width: 600px) {
              .card { padding: .5em .6em; }
              .diagnosis { font-size: 1em; }
              .date-badge { font-size: .95em; }
            }
          </style>
        </head>
        <body>
          <h1 style="font-size:1.2em;margin:.3em 0 .8em .1em;">Diagnozių sąrašas</h1>
          <div>
      `;
      data.forEach(entry => {
          html += `<div class="card">`;
          html += `<div class="diagnosis">${entry.diagnosis}</div><div class="dates-info">`;
          if (entry.dates.length === 1) {
              html += `<span class="date-badge">${entry.dates[0]}</span>`;
          } else if (entry.dates.length === 2) {
              html += entry.dates.map(d => `<span class="date-badge">${d}</span>`).join("\n");
          } else if (entry.dates.length >= 3) {
              html += `
            <span class="date-badge">${entry.dates[0]}</span>
            <span class="dates-meta">(Paskutinį kartą įvesta)</span>
            <span class="date-badge" style="margin-left:.8em;">${entry.dates[entry.dates.length-1]}</span>
            <span class="dates-meta">(Pirmą kartą įvesta)</span>
          `;
              html += `
            <details>
              <summary>Iš viso: ${entry.dates.length}</summary>
              <ul class="dates">
                ${entry.dates.map(d => `<li>${d}</li>`).join("\n")}
              </ul>
            </details>
          `;
          }
          html += `</div></div>`;
      });
      html += `
          </div>
        </body>
      </html>
      `;
      const win = window.open("", "_blank");
      win.document.open();
      win.document.write(html);
      win.document.close();
  }

  // MAIN LOGIC
  if (!isPacientoSuvestine()) {
      alert("Paciento suvestinė nerasta.");
      return;
  }
  const data = getDiagnosisData();
  window.diagnozes = data;
  openDiagnosesInNewWindow(data);
})();
