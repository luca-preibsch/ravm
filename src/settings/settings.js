import './style.css'
import '../style/table.css'
import '../style/button.css'

import * as storage from '../lib/storage'
import {AttesationReport} from "../lib/attestation";

const measurementTable = document.getElementById("measurement-table");
const repoTable = document.getElementById("repo-table");
const authorTable = document.getElementById("author-key-table");
const submitButton = document.getElementById("submitButton");
const modal = document.querySelector(".modal");
const infoTitleText = document.getElementById("infoTitle");
const infoDescriptionText = document.getElementById("infoDescription");
const infoMethodText = document.getElementById("infoTrustMethod");

function onRemove() {
    const toRemove = [...measurementTable.querySelectorAll(".removeCheckbox")].filter(el => el.checked);
    toRemove.forEach(el => storage.removeHost(el.value));

    [...repoTable.querySelectorAll(".removeCheckbox")].filter(el => el.checked)
        .forEach(el => storage.removeMeasurementRepo(el.value));
}

submitButton.addEventListener("click", onRemove);

modal.addEventListener("click", (e) => {
    if (!modal.querySelector("#modalContent").contains(e.target))
        modal.close();
});

function initCollapsibles() {
    document.querySelectorAll(".collapsible").forEach(collapsible => {
        collapsible.addEventListener("click", () => {
            collapsible.classList.toggle("active");
            const content = collapsible.nextElementSibling;
            if (content.style.display === "block")
                content.style.display = "none";
            else
                content.style.display = "block";
        });
    });
}

function loadAllItems() {
    measurementTable.innerHTML = "";
    storage.getTrusted().then(items => {
            const hosts = Object.keys(items)
            for (const host of hosts) {
                const row = measurementTable.insertRow();
                const hostData = items[host];
                row.insertCell().appendChild(createTitleCell(host));
                row.insertCell().innerHTML = hostData.trustedSince.toLocaleString();
                row.insertCell().innerHTML = hostData.lastTrusted.toLocaleString();
                row.insertCell().appendChild(createButton(host, hostData));
            }
        }, console.error);

    repoTable.innerHTML = "";
    storage.getMeasurementRepo().then(repos => {
        repos.forEach(repo => {
            const row = repoTable.insertRow();
            row.insertCell().appendChild(createTitleCell(repo));
        });
    }, console.error);
}

browser.storage.onChanged.addListener(loadAllItems);

window.addEventListener("load", () => {
    loadAllItems();
    initCollapsibles();
});

async function saveItem(domain, trustedSince, lastTrusted, type, ar_arrayBuffer) {
    await storage.newTrusted(domain, trustedSince, lastTrusted, type, ar_arrayBuffer)
    console.log("save")
}

function showModal(host, hostData) {
    const ar = new AttesationReport(hostData.ar_arrayBuffer);
    infoTitleText.innerText = host;
    infoMethodText.innerHTML = (hostData.trusted_measurement_repo) ?
        "This host is trusted through the trusted measurement repository at: " +
        `<a href='${hostData.trusted_measurement_repo}' target='_blank'>${hostData.trusted_measurement_repo}</a>` :
        "This host is trusted through it's measurement";
    infoDescriptionText.innerText = ar.parse_report;
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

function createButton(host, hostData) {
    const button = document.createElement("button");
    button.innerText = "more info";
    button.classList.add("moreInfoButton");
    button.onclick = function () {showModal(host, hostData)};
    return button;
}
