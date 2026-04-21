(function() {
    // --- Helper for stable object comparison for deduplication ---
    function stableStringify(obj) {
        return JSON.stringify(obj, Object.keys(obj).sort());
    }

    // --- Collect prescription data from AG Grid ---
    function collectPrescriptionData() {
        if (!window.vaistukai) window.vaistukai = [];

        for (let i = 0; i < 10; i++) {
            const row = document.querySelector(`[row-id="${i}"]`);
            if (!row) continue;

            const diagnosisCell = row.querySelector('[col-id="prescriptionData.prescriptionDiagnosis.code.code"]');
            const typeCell = row.querySelector('[col-id="prescriptionData.prescriptionType.code"]');
            const dispenseCell = row.querySelector('[col-id="lastDispenseDueDate"]');
            const prescriptionDataCell = row.querySelector('[col-id="prescriptionData"]');
            const activeIngCell = row.querySelector('[col-id="prescriptionData.medicationData.activeIngredients"]');

            const diagnosis = diagnosisCell ? diagnosisCell.textContent.trim() : null;
            const type = typeCell ? typeCell.textContent.trim() : null;
            const lastDispense = dispenseCell ? dispenseCell.textContent.trim() : null;
            const prescriptionData = prescriptionDataCell ? prescriptionDataCell.textContent.trim() : null;
            let activeIngredients = null;

            if (activeIngCell) {
                const agTextCell = activeIngCell.querySelector('ag-text-cell');
                if (agTextCell) {
                    activeIngredients = Array.from(agTextCell.children)
                        .filter(child => child.tagName.toLowerCase() === 'div')
                        .map(div => div.textContent.trim());
                }
            }

            const currentRow = {
                diagnosis,
                type,
                lastDispense,
                prescriptionData,
                activeIngredients
            };

            // Avoid duplicates
            const exists = window.vaistukai.some(existing =>
                stableStringify(existing) === stableStringify(currentRow)
            );
            if (!exists) window.vaistukai.push(currentRow);
        }

        return window.vaistukai;
    }

    // --- Wait for AG overlay loader cycle (appear, then disappear) ---
    function waitForAgOverlayCycle(callback, timeoutAppear = 1000, timeoutHide = 15000, pollInterval = 1000) {
        const tStart = Date.now();
        function waitAppear() {
            const overlay = document.querySelector('.ag-overlay');
            if (!overlay) {
                console.log('[waitForAgOverlayCycle] .ag-overlay NOT FOUND - proceeding immediately');
                waitHide();
                return;
            }
            const hidden = overlay.classList.contains('ag-hidden');
            if (!hidden) {
                console.log(`[waitForAgOverlayCycle] Overlay appeared after ${Date.now() - tStart} ms`);
                waitHide();
            } else if (Date.now() - tStart < timeoutAppear) {
                setTimeout(waitAppear, pollInterval);
            } else {
                console.warn('[waitForAgOverlayCycle] Overlay did not appear, proceeding to wait for hide.');
                waitHide();
            }
        }
        function waitHide() {
            const tHideStart = Date.now();
            function pollHide() {
                const overlay = document.querySelector('.ag-overlay');
                if (!overlay) {
                    console.log('[waitForAgOverlayCycle] .ag-overlay NOT FOUND during hide stage - proceeding.');
                    callback();
                    return;
                }
                const hidden = overlay.classList.contains('ag-hidden');
                if (hidden) {
                    console.log(`[waitForAgOverlayCycle] Overlay hidden after ${Date.now() - tStart} ms`);
                    callback();
                } else if (Date.now() - tHideStart < timeoutHide) {
                    setTimeout(pollHide, pollInterval);
                } else {
                    console.warn(`[waitForAgOverlayCycle] Timeout: Overlay still visible after ${Date.now() - tStart} ms`);
                    callback();
                }
            }
            pollHide();
        }
        waitAppear();
    }

    // --- Control page cycling, overlay wait, and collection ---
    function goThroughNPgesWithOverlayWaitAndCollect(collectFn, numPages, extraDelayMs, onComplete) {
        if (!window.vaistukai) window.vaistukai = [];

        const pageInput = document.querySelector('input[aria-label="Įveskite puslapį"]');
        if (!pageInput) {
            console.warn('Page input not found');
            return;
        }
        const maxPageFromInput = pageInput.max ? parseInt(pageInput.max, 10) : 1;
        if (isNaN(maxPageFromInput) || maxPageFromInput < 1) {
            console.warn('Max page is invalid or less than 1');
            return;
        }
        const typePageButton = document.getElementById('typePage');
        if (!typePageButton) {
            console.warn('TypePage button not found');
            return;
        }

        const maxPage = Math.min(numPages, maxPageFromInput);
        let currentPage = 1;

        function setPageAndCollect() {
            console.log(`--- Navigating to page ${currentPage} ---`);
            pageInput.value = currentPage;
            pageInput.dispatchEvent(new Event('input', { bubbles: true }));
            pageInput.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('...Clicking "Go" button');
            typePageButton.click();

            // Wait for table to load
            console.log('...Waiting for AG overlay to appear/disappear...');
            waitForAgOverlayCycle(() => {
                setTimeout(() => {
                    const data = collectFn();
                    console.log(`[collectPrescriptionData] Collected for page ${currentPage}:`, data);
                    if (currentPage < maxPage) {
                        currentPage++;
                        setPageAndCollect();
                    } else {
                        // Optionally, return to page 1 when done
                        console.log(`Finished cycling pages 1–${maxPage}; returning to page 1`);
                        pageInput.value = 1;
                        pageInput.dispatchEvent(new Event('input', { bubbles: true }));
                        pageInput.dispatchEvent(new Event('change', { bubbles: true }));
                        typePageButton.click();
                        waitForAgOverlayCycle(() => {
                            setTimeout(() => {
                                collectFn();
                                console.log('Returned to page 1 and collected data.');
                                console.log('=== All unique prescriptions ===');
                                console.log(window.vaistukai);
                                if (typeof onComplete === "function") onComplete(window.vaistukai);
                            }, extraDelayMs);
                        }, 1000, 15000, 1000);
                    }
                }, extraDelayMs);
            }, 1000, 15000, 1000);
        }
        setPageAndCollect();
    }

    // --- NICE TABLE VIEW ---
    window.openVaistukaiSingleTable = function(items) {
        items = [...items].sort((a, b) => {
            const dA = a.lastDispense ? new Date(a.lastDispense) : new Date(0);
            const dB = b.lastDispense ? new Date(b.lastDispense) : new Date(0);
            return dB - dA;
        });

        let alreadyProcessed = new Set();
        let activeRows = [];
        let inactiveRows = [];

        function daysBetween(date1, date2) {
            if (!date1 || !date2) return null;
            let d1 = new Date(date1), d2 = new Date(date2);
            let days = Math.ceil((d1 - d2) / 86400000);
            if (days < 0) days -= 1;
            if (days > 0) days += 1;
            return days;
        }

        let now = new Date();
        let todayStr = now.getFullYear() + "-" +
            String(now.getMonth() + 1).padStart(2, "0") + "-" +
            String(now.getDate()).padStart(2, "0");

        function getDiagnosis(val) {
            if(Array.isArray(val)) return val.join(" ");
            if(typeof val === "string") return val;
            return "";
        }

        items.forEach(item => {
            let name = (item.activeIngredients || []).join(" ");
            if (alreadyProcessed.has(name)) return;
            if (item.prescriptionData && item.prescriptionData.startsWith("Galiojanuo:")) {
                alreadyProcessed.add(name);
                activeRows.push({
                    name,
                    diagnosis: getDiagnosis(item.diagnosis),
                    lastDispense: item.lastDispense || "",
                    days: "",
                    status: '<span style="color:magenta;font-weight:700;">Aktyvus receptas</span>',
                    trClass: "active"
                });
            }
        });

        items.forEach(item => {
            let name = (item.activeIngredients || []).join(" ");
            if (alreadyProcessed.has(name)) return;
            alreadyProcessed.add(name);

            let days = null;
            if (item.lastDispense) {
                days = daysBetween(item.lastDispense, todayStr);
            }
            let status = "", trClass = "";
            if (typeof days === "number") {
                if (days > 7 && days <= 14) {
                    status = '<span style="color:#c4a100;font-weight:700;">Galima išrašyti</span>';
                    trClass = "mid";
                } else if (days <= 7) {
                    status = '<span style="color:green;font-weight:700;">Galima išrašyti</span>';
                    trClass = "ok";
                } else {
                    status = '<span style="color:red;font-weight:700;">Negalima pratęsti</span>';
                    trClass = "expired";
                }
            } else {
                status = "";
            }
            inactiveRows.push({
                name,
                diagnosis: getDiagnosis(item.diagnosis),
                lastDispense: item.lastDispense || "",
                days: typeof days === "number" ? days : "",
                status,
                trClass
            });
        });

        let tableHtml = `
        <html>
        <head>
            <title>Vaistukai Table</title>
            <style>
                body { font-family: sans-serif; background: #fafafa;}
                table {
                    table-layout: auto;
                    border-collapse: collapse;
                    margin: 2em auto;
                    width: auto;
                    max-width: 100%;
                    background: #fff;
                    }
                th, td {
                    border: 1px solid #bbb;
                    padding: 8px 10px;
                    text-align: left;
                    white-space: nowrap;
                    }
                th { background: #eee; }
                tr.active { background: #ffe4fa; }
                tr.ok { background: #e9ffe4; }
                tr.mid { background: #fffde4; }
                tr.expired { background: #ffe4e4; }
            </style>
        </head>
        <body>
            <h2 style="text-align:center;">Receptai</h2>
            <table>
                <tr>
                    <th>Pavadinimas</th>
                    <th>Diagnozė</th>
                    <th>Galioja iki</th>
                    <th>Baigiasi už</th>
                    <th>Statusas</th>
                </tr>
        `;

        function addRow(row) {
            tableHtml += `<tr class="${row.trClass}">
                <td>${row.name}</td>
                <td>${row.diagnosis}</td>
                <td>${row.lastDispense}</td>
                <td>${row.days}</td>
                <td>${row.status}</td>
            </tr>`;
        }
        activeRows.forEach(addRow);
        inactiveRows.forEach(addRow);

        tableHtml += `</table></body></html>`;

        let win = window.open("", "_blank");
        win.document.write(tableHtml);
        win.document.close();
    };

    // Ask for number of pages:
    var defaultPages = 5;
    var str = prompt("How many pages (default 5)?", defaultPages);
    var numPages = parseInt(str, 10);
    if (isNaN(numPages) || numPages < 1) numPages = defaultPages;

    // --- KICK EVERYTHING OFF ---
    goThroughNPgesWithOverlayWaitAndCollect(
        collectPrescriptionData,
        numPages,
        500,
        function showTable(all) {
            setTimeout(function(){
                window.openVaistukaiSingleTable(all);
            }, 500);
        }
    );
})();
