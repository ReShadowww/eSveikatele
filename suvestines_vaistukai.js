function showMedicationHistoryTable() {
  // PARSE & PROCESS
  const ol = document.querySelector('[title="Medikamentų vartojimo istorija"] ol');
  if (!ol) {
    alert("No medication history found!");
    return;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build array of { name, end_date, days_until_end }
  let items = ol.textContent
    .replace(/  +/g, " ")
    .split("\n \n \n \n")
    .map(section =>
      section.trim().split('\n').map(e => e.trim()).filter(Boolean)
    )
    .map(entries => {
      // Duration: only the number before the last word (e.g. "10 days")
      const durationStr = entries.length > 2 ? entries[entries.length - 2] || "" : "";
      const dWords = durationStr.split(" ").filter(Boolean);
      let durationDays = 0;
      if (dWords.length > 1)
        durationDays = parseInt(dWords[dWords.length - 2], 10) || 0;
      else
        durationDays = parseInt(durationStr, 10) || 0;

      // Start date
      const startRaw = entries.length > 1 ? entries[entries.length - 1] : "";
      let end_date = "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(startRaw) && durationDays > 0) {
        let dt = new Date(startRaw);
        dt.setDate(dt.getDate() + durationDays);
        end_date = dt.toISOString().slice(0, 10);
      }
      // Days until end_date (inclusive)
      let days_until_end = null;
      if (end_date) {
        const endDt = new Date(end_date);
        endDt.setHours(0, 0, 0, 0);
        days_until_end = Math.round((endDt - today) / (1000 * 60 * 60 * 24)) + 1;
      }
      return {
        name: [entries[0], entries[1]].filter(Boolean).join(" "),
        end_date,
        days_until_end,
      };
    })
    .filter(obj => obj.name && obj.end_date);

  // Pick only the newest (by end_date) for each unique name
  let newestMedicineMap = new Map();
  items.forEach(item => {
    if (
      !newestMedicineMap.has(item.name) ||
      newestMedicineMap.get(item.name).end_date < item.end_date
    ) {
      newestMedicineMap.set(item.name, item);
    }
  });
  let uniqueNewestItems = Array.from(newestMedicineMap.values())
    .sort((a, b) => {
      if (a.end_date > b.end_date) return -1;
      if (a.end_date < b.end_date) return 1;
      return a.name.localeCompare(b.name);
    });

  // ROW STYLING & STATUS
  function getClass(days) {
    if (days > 14) return "ok"; // green for "Galioja"
    if (days > 7 && days <= 14) return "mid"; // yellow for "Galima išrašyti"
    if (days <= 7 && days >= 0) return "ok"; // green for "Galima išrašyti"
    if (days < 0) return "expired";
    return "";
  }
  function getStatus(days) {
    if (typeof days !== "number") return "";
    if (days > 14) return '<span style="color:#0a63b9;font-weight:700;">Galioja</span>';
    if (days > 7 && days <= 14) return '<span style="color:#d7a200;font-weight:700;">Galima išrašyti</span>';
    if (days <= 7 && days >= 0) return '<span style="color:#219653;font-weight:700;">Galima išrašyti</span>';
    if (days === 0) return '<span style="color:#d7a200;font-weight:700;">Baigiasi šiandien</span>';
    return '<span style="color:#eb5757;font-weight:700;">Nebegalioja</span>';
  }

  // MODERN TABLE HTML & CSS
  let tableHtml = `
    <html>
    <head>
        <title>Medikamentų vartojimo istorija</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
            body {
                font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;
                background: #f4f6f8;
                margin: 0;
            }
            h2 {
                text-align: center;
                font-weight: 500;
                margin-top: 2rem;
                color: #333;
            }
            table {
                border-collapse: separate;
                border-spacing: 0;
                margin: 2em auto;
                width: 95%;
                max-width: 800px;
                box-shadow: 0 4px 28px 0 rgba(0,0,0,0.14);
                background: #fff;
                border-radius: 16px;
                overflow: hidden;
                font-size: 1rem;
            }
            th, td {
                padding: 1rem 1.2rem;
                text-align: left;
                white-space: nowrap;
            }
            th {
                background: #f1f3f6;
                color: #222b45;
                border-bottom: 2px solid #e7eaf3;
                font-weight: 600;
                font-size: 1.08rem;
                text-transform: uppercase;
                letter-spacing: 0.04em;
            }
            td {
                border-bottom: 1px solid #f1f3f6;
                color: #323c47;
            }
            tr:last-child td {
                border-bottom: none;
            }
            tr.ok    { background: #e9ffe4 !important; }
            tr.mid   { background: #fffbe5 !important; }
            tr.expired { background: #fff3f3 !important; }
            tr:hover { background: #e3eafc !important; }
            table, th, td {
                border: none;
            }
            @media (max-width: 600px) {
                table {
                    font-size: 0.93rem;
                }
                th, td {
                    padding: 0.7rem 0.7rem;
                }
                h2 {
                    margin-top: 1rem;
                    font-size: 1.2rem;
                }
            }
        </style>
    </head>
    <body>
        <h2>Medikamentų vartojimo istorija</h2>
        <table>
            <tr>
                <th>Pavadinimas</th>
                <th>Galioja iki</th>
                <th>Likusių dienų (imtinai)</th>
                <th>Statusas</th>
            </tr>
  `;
  uniqueNewestItems.forEach(row => {
    tableHtml += `<tr class="${getClass(row.days_until_end)}">
      <td>${row.name}</td>
      <td>${row.end_date}</td>
      <td style="font-weight:500;">${row.days_until_end}</td>
      <td>${getStatus(row.days_until_end)}</td>
    </tr>`;
  });
  tableHtml += `</table></body></html>`;

  // OPEN WINDOW
  const win = window.open("", "_blank");
  win.document.write(tableHtml);
  win.document.close();
}

showMedicationHistoryTable()
