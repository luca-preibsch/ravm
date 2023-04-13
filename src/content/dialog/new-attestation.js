import './style.css';
import '../../style/button.css';

import {types} from '../../lib/messaging';
import * as storage from '../../lib/storage';
import {arrayBufferToHex} from "../../lib/util";
import {getHostInfo} from "../../lib/messaging";
import {checkHost, getReport} from "./dialog";

const titleText = document.getElementById("title");
const domainText = document.getElementById("domain");
const descriptionText = document.getElementById("description");
const measurementText = document.getElementById("measurement");

const ignoreButton = document.getElementById("ignore-button");
const noTrustButton = document.getElementById("do-not-trust-button");
const trustButton = document.getElementById("trust-button");

let measurement;
let hostInfo;

ignoreButton.addEventListener("click", () => {
    // TODO what to do on ignore?
    browser.runtime.sendMessage({
        type : types.redirect,
        url : hostInfo.url
    })
})

trustButton.addEventListener("click", async () => {
    await storage.newTrusted(
        hostInfo.host, new Date(), new Date(), hostInfo.attestationInfo.technology, measurement, hostInfo.ssl_sha512)
    browser.runtime.sendMessage({
        type : types.redirect,
        url : hostInfo.url
    })
})

noTrustButton.addEventListener("click", async () => {
    await storage.setUntrusted(hostInfo.host)
    browser.runtime.sendMessage({
        type : types.redirect,
        url : hostInfo.url
    })
})

window.addEventListener("load", async () => {
    hostInfo = await getHostInfo();

    // init UI
    domainText.innerText = hostInfo.host;

    const ar = await getReport(hostInfo);

    if (ar && await checkHost(hostInfo, ar)) {
        measurement = ar.measurement;

        // 4. Trust the measurement? wait for user input
        descriptionText.innerText = "This host offers remote attestation, do you want to trust it?";
        measurementText.innerText = arrayBufferToHex(measurement);
        [ignoreButton, noTrustButton, trustButton, measurementText.parentNode].forEach((button) =>
            button.classList.remove("invisible"));
    } else {
        titleText.innerText = "Attestation FAILED";
        descriptionText.innerText = "ERROR";
    }
});
