import './style.css';
import '../../style/button.css';

import {getHostInfo, types} from "../../lib/messaging";
import * as storage from "../../lib/storage";
import {arrayBufferToHex} from "../../lib/util";
import {checkHost, getReport} from "./dialog";
import {AttesationReport} from "../../lib/attestation";

const titleText = document.getElementById("title");
const domainText = document.getElementById("domain");
const descriptionText = document.getElementById("description");
const oldMeasurementText = document.getElementById("old-measurement");
const newMeasurementText = document.getElementById("new-measurement");

const noTrustButton = document.getElementById("do-not-trust-button");
const trustButton = document.getElementById("trust-button");

let hostInfo;
let ar;

trustButton.addEventListener("click", async () => {
    await storage.newTrusted(
        hostInfo.host, new Date(), new Date(), hostInfo.attestationInfo.technology, ar.arrayBuffer, hostInfo.ssl_sha512)
    browser.runtime.sendMessage({
        type : types.redirect,
        url : hostInfo.url
    })
})

noTrustButton.addEventListener("click", async () => {
    await storage.removeHost(hostInfo.host);
    await storage.setUntrusted(hostInfo.host, true);
    browser.runtime.sendMessage({
        type : types.redirect,
        url : hostInfo.url
    });
})

noTrustButton.addEventListener("click", async () => {
    await storage.setUntrusted(hostInfo.host, true);
    browser.runtime.sendMessage({
        type : types.redirect,
        url : hostInfo.url
    });
});

window.addEventListener("load", async () => {
    hostInfo = await getHostInfo();
    domainText.innerText = hostInfo.host;

    ar = await getReport(hostInfo);

    if (ar && await checkHost(hostInfo, ar)) {
        descriptionText.innerText =
            "This host has previously been trusted, but the measurement has since changed. " +
            "Do you want to trust the new measurement? " +
            "This could be a malicious attack. ";
        newMeasurementText.innerText = arrayBufferToHex(ar.measurement);
        oldMeasurementText.innerText = arrayBufferToHex(new AttesationReport((await storage.getHost(hostInfo.host)).ar_arrayBuffer).measurement);
        [noTrustButton, trustButton].forEach((button) =>
            button.classList.remove("invisible"));
    } else {
        titleText.innerText = "Warning: Attestation Failed";
        descriptionText.innerText = "This host offers remote attestation, but the hosts implementation is broken! " +
            "You may ignore this host, but this could very well be a malicious attack.";
        ignoreButton.classList.remove("invisible");
    }
});
