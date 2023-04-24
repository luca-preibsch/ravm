import './style.css'
import '../style/table.css'

import * as storage from '../lib/storage'
import {AttesationReport} from "../lib/attestation";

const table = document.getElementById("tableBody");
const submitButton = document.getElementById("submitButton");
const modal = document.querySelector(".modal");

function onRemove() {
    const toRemove = [...table.querySelectorAll(".removeCheckbox")].filter(el => el.checked);
    toRemove.forEach(el => storage.removeHost(el.value));
}

submitButton.addEventListener("click", onRemove);

modal.addEventListener("click", (e) => {
    if (e.target.id !== "modalContent")
        modal.close();
});

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
                row.insertCell().appendChild(createButton(data));
            }
        },
        (reason) => {
            console.error(reason);
        })
}

window.addEventListener("load", loadAllItems);
browser.storage.onChanged.addListener(loadAllItems);

async function saveItem(domain, trustedSince, lastTrusted, type, ar_arrayBuffer) {
    await storage.newTrusted(domain, trustedSince, lastTrusted, type, ar_arrayBuffer)
    console.log("save")
}

function showModal(hostInfo) {
    const ar = new AttesationReport(hostInfo.ar_arrayBuffer);
    modal.querySelector("#modalContent").innerText = ar.parse_report;
    modal.showModal();
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

function createButton(hostInfo) {
    const button = document.createElement("button");
    button.classList.add("link");
    button.innerText = "more info";
    button.onclick = function () {showModal(hostInfo)};
    return button;
}
