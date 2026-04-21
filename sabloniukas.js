function runIfAnamneze() {
    const pageTitle = document.getElementById("title")?.querySelector("h1")?.textContent.trim();
    if (pageTitle === "Anamnezė") {
        const formTables = document.querySelectorAll('table.form');
        const lastFormTable = formTables[formTables.length - 1];

        // Use the exact order you specified
        const fieldsToFill = {
            'SANTRAUKA': 'Value for SANTRAUKA',
            'APZ_REZ': 'Value for APZ_REZ',
            'LIGOS_EIGA': 'Value for LIGOS_EIGA',
            'TYR': 'Value for TYR',
            'REKOM': 'Value for REKOM',
            'SANTR': 'Value for SANTR'
        };

        lastFormTable.querySelectorAll('textarea').forEach(textarea => {
            const nameAttr = textarea.name || '';
            const lastSegment = nameAttr.split('.').pop();
            if (fieldsToFill.hasOwnProperty(lastSegment)) {
                textarea.value = fieldsToFill[lastSegment];
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });

        console.log('Filled fields:', fieldsToFill);
    }
}
