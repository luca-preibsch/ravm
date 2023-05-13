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

async function onRemove() {
    let promises = [];
    promises.push(...[...measurementTable.querySelectorAll(".removeCheckbox")]
        .filter(el => el.checked)
        .map(async el => await storage.removeHost(el.value)));

    promises.push(...[...repoTable.querySelectorAll(".removeCheckbox")]
        .filter(el => el.checked)
        .map(async el => await storage.removeMeasurementRepo(el.value)));

    promises.push(...[...authorTable.querySelectorAll(".removeCheckbox")]
        .filter(el => el.checked)
        .map(async el => await storage.removeAuthorKey(el.value)));
    await Promise.all(promises);
    await loadAllItems();
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

/**
 * @param {HTMLElement} table
 */
function clearTable(table) {
    while (table.hasChildNodes())
        table.removeChild(table.firstChild);
}

async function loadAllItems() {
    try {
        clearTable(measurementTable);
        Object.entries(await storage.getTrusted()).forEach(([host, hostData]) => {
            const row = measurementTable.insertRow();
            row.insertCell().appendChild(createTitleCell(host, true));
            row.insertCell().innerHTML = hostData.trustedSince.toLocaleString();
            row.insertCell().innerHTML = hostData.lastTrusted.toLocaleString();
            row.insertCell().appendChild(createButton(host, hostData));
        });

        clearTable(repoTable);
        Object.entries(await storage.getMeasurementRepo()).forEach(([, repo]) => {
            const row = repoTable.insertRow();
            row.insertCell().appendChild(createTitleCell(repo, true));
        });

        clearTable(authorTable);
        Object.entries(await storage.getAuthorKey()).forEach(([, authorKey]) => {
            const row = authorTable.insertRow();
            row.insertCell().appendChild(createTitleCell(authorKey, false));
        });
    } catch (e) {
        console.error(e);
    }
}

// this creates a racing condition, thus reload items after onRemove
// browser.storage.onChanged.addListener(loadAllItems);
window.addEventListener("focus", loadAllItems);

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
    if (hostData.author_key)
        infoMethodText.innerHTML = "This host is trusted through an author key:<br>" +
            `<i>${hostData.author_key}</i>`;
    else if (hostData.trusted_measurement_repo)
        infoMethodText.innerHTML = "This host is trusted through the trusted measurement repository at:<br>" +
            `<a href='${hostData.trusted_measurement_repo}' target='_blank'>${hostData.trusted_measurement_repo}</a>`;
    else
        infoMethodText.innerText = "This host is trusted through it's measurement";
    infoDescriptionText.innerText = ar.parse_report;
    modal.showModal();
}

function createTitleCell(title, isLink) {
    const div = document.createElement("div");
    const checkbox = document.createElement("input");
    checkbox.setAttribute("type", "checkbox");
    checkbox.setAttribute("id", title);
    // checkbox.setAttribute(name, title);
    checkbox.setAttribute("value", title);
    checkbox.classList.add("removeCheckbox");
    const label = document.createElement("label");
    label.setAttribute("for", title);
    if (isLink) {
        const link = document.createElement("a");
        link.setAttribute("href", title);
        link.setAttribute("target", "_blank");
        link.innerText = title;
        label.appendChild(link);
    } else {
        label.innerText = title;
    }
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
