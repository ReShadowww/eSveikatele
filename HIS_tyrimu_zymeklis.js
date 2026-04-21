(function() {
    // Try to ensure we're on the correct page
    try {
        // Get the page/window title (<div id="title"><div><h1>...</h1></div></div>)
        var titleElement = document.getElementById("title")
            .getElementsByTagName("div")[0]
            .getElementsByTagName("h1")[0];

        // The required window title
        var requiredTitle = "Paciento laboratorinių tyrimų rezultatai";

        // If the title doesn't match, throw an error
        if (titleElement.textContent !== requiredTitle)
            throw Error("Turi būti atidarytas 'Paciento laboratorinių tyrimų rezultatų' langas");
    } catch(e) {
        // If any error, alert the user and stop execution
        alert("Turi būti atidarytas 'Paciento laboratorinių tyrimų rezultatų' langas");
        throw Error("Atidarytas netinkamas langas");
    }

    // Get all <td> elements on the page
    var allTdElements = document.querySelectorAll("td");

    // Find all <td> elements with a title indicating result is below the normal range
    var lowElements = Array.from(allTdElements).filter(function(td) {
        return td.getAttribute("title") &&
            td.getAttribute("title").includes("Rezultatas yra mažesnis nei apatinė normos riba");
    });

    // Find all <td> elements with a title indicating result is above the normal range
    var highElements = Array.from(allTdElements).filter(function(td) {
        return td.getAttribute("title") &&
            td.getAttribute("title").includes("Rezultatas yra didesnis nei viršutinė normos riba");
    });

    // Color the first child of each low/high element red (if it exists)
    lowElements.forEach(function(td) {
        if (td.firstElementChild) {
            td.firstElementChild.style.color = "red";
        }
    });
    highElements.forEach(function(td) {
        if (td.firstElementChild) {
            td.firstElementChild.style.color = "red";
        }
    });
})();
