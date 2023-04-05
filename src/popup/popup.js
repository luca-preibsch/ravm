import './style.css';
import '../style/button.css';

import * as storage from '../lib/storage';
import {types} from "../lib/messaging";

const icon = document.getElementById("attestation-icon");
const headerText = document.getElementById("attestation-header");
const urlText = document.getElementById("attestation-url");
const infoText = document.getElementById("attestation-info");
const removeButton = document.getElementById("button-remove-trust");

let tab, host;

removeButton.addEventListener("click", async () => {
    await storage.removeTrusted(host.href);
    browser.tabs.reload(tab.id);
});

async function getTab() {
    try {
        const tabs = await browser.tabs.query({currentWindow: true, active: true});
        return tabs[0]; // Safe to assume there will only be one result
    } catch (e) {
        console.error(e);
        return null;
    }
}

window.addEventListener("load", async () => {
    tab = await getTab();
    const url = new URL(tab.url)
    host = new URL(url.origin);
    const hostInfo = await storage.getHost(host.href);

    urlText.innerText = host.href
    infoText.innerText = `Trusted since ${hostInfo.trustedSince.toLocaleString()}`

    if (hostInfo.trusted) {
        headerText.innerText = "Attestation Successful";
    } else {
        headerText.innerText = "Attestation Failed";
    }
})
