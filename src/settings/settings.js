import './style.css'
import '../style/table.css'

import * as storage from '../lib/storage'

const table = document.getElementById("tableBody")
const form = document.getElementById("form")

// TODO: button for showing the measurement

let counter = 0;
document.getElementById("testButton").onclick = function () { saveItem(counter++ + "example.com", new Date(), new Date(), "AMD-SEV", "xxx") }

function onRemove() {
    const toRemove = [...form.querySelectorAll(".removeCheckbox")].filter(el => el.checked);
    toRemove.forEach(el => storage.removeTrusted(el.value));
}

form.addEventListener("submit", onRemove);

function loadAllItems() {
    table.innerHTML = ""
    storage.getTrusted().then((items) => {
            let hosts = Object.keys(items)
            for (let host of hosts) {
                let row = table.insertRow()
                let data = items[host]
                row.insertCell().appendChild(createTitleCell(host));
                row.insertCell().innerHTML = data.trustedSince.toLocaleString();
                row.insertCell().innerHTML = data.lastTrusted.toLocaleString();
                row.insertCell().innerHTML = data.type;
            }
        },
        (reason) => {
            console.error(reason);
        })
}

window.addEventListener("load", loadAllItems);
browser.storage.onChanged.addListener(loadAllItems)

function saveItem(domain, trustedSince, lastTrusted, type, measurement) {
    storage.newTrusted(domain, trustedSince, lastTrusted, type, measurement)
    console.log("save")
    loadAllItems()
}

function createTitleCell(title) {
    const div = document.createElement("div");
    const checkbox = document.createElement("input");
    checkbox.setAttribute("type", "checkbox");
    checkbox.setAttribute("id", title);
    // checkbox.setAttribute(name, title);
    checkbox.setAttribute("value", title);
    checkbox.classList.add("removeCheckbox");
    const label = document.createElement("lable");
    label.setAttribute("for", title);
    label.innerText = title;
    div.appendChild(checkbox);
    div.appendChild(label);
    return div;
}
