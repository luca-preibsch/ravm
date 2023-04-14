import './style.css';
import '../../style/button.css';

import {getHostInfo, types} from "../../lib/messaging";
import * as storage from "../../lib/storage";
import {arrayBufferToHex} from "../../lib/util";
import {checkHost, getReport} from "./dialog";

const titleText = document.getElementById("title");
const domainText = document.getElementById("domain");
const descriptionText = document.getElementById("description");
const oldMeasurementText = document.getElementById("old-measurement");
const newMeasurementText = document.getElementById("new-measurement");

const noTrustButton = document.getElementById("do-not-trust-button");
const trustButton = document.getElementById("trust-button");

let hostInfo;
let measurement;

trustButton.addEventListener("click", async () => {
    await storage.newTrusted(
        hostInfo.host, new Date(), new Date(), hostInfo.attestationInfo.technology, measurement, hostInfo.ssl_sha512)
    browser.runtime.sendMessage({
        type : types.redirect,
        url : hostInfo.url
    })
})

noTrustButton.addEventListener("click", async () => {
    await storage.removeHost(hostInfo.host);
    await storage.setUntrusted(hostInfo.host)
    browser.runtime.sendMessage({
        type : types.redirect,
        url : hostInfo.url
    })
})

noTrustButton.addEventListener("click", async () => {
    await storage.setUntrusted(hostInfo.host);
    browser.runtime.sendMessage({
        type : types.redirect,
        url : hostInfo.url
    });
});

window.addEventListener("load", async () => {
    hostInfo = await getHostInfo();
    domainText.innerText = hostInfo.host;

    const ar = await getReport(hostInfo);

    if (ar && await checkHost(hostInfo, ar)) {
        measurement = ar.measurement;

        descriptionText.innerText =
            "This host has previously been trusted, but the measurement has since changed." +
            "Do you want to trust the new measurement?" +
            "This could be a malicious attack.";
        newMeasurementText.innerText = arrayBufferToHex(measurement);
        oldMeasurementText.innerText = arrayBufferToHex((await storage.getHost(hostInfo.host)).measurement);
        [noTrustButton, trustButton].forEach((button) =>
            button.classList.remove("invisible"));
    } else {
        titleText.innerText = "Attestation FAILED";
        descriptionText.innerText = "ERROR";
    }
});
