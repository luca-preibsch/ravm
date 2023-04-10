import './style.css';
import '../../style/button.css';

import { types } from '../../lib/messaging';
import { fetchAttestationReport, getVCEK } from "../../lib/net";
import { validateWithCertChain, validateAttestationReport } from "../../lib/crypto";
import * as storage from '../../lib/storage'
import * as util from '../../lib/util'
import { DialogType } from "../../lib/ui";
import { arrayBufferToHex } from "../../lib/util";

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

async function getHostInfo() {
    return await browser.runtime.sendMessage({
        type : types.getHostInfo
    })
}

async function attestHost(hostInfo) {
    const ssl_sha512 = hostInfo.ssl_sha512

    // Request attestation report from VM
    let ar
    try {
        ar = await fetchAttestationReport(hostInfo.host, hostInfo.attestationInfo.path)
    } catch (e) {
        // no attestation report found -> notify user, attestation not possible
        console.log(e)
        // TODO
        return false;
    }

    measurement = ar.measurement

    // TODO caching
    let vcek
    try {
        vcek = await getVCEK(ar.chip_id, ar.committedTCB)
    } catch (e) {
        // vcek could not be attained -> notify user, attestation not possible
        console.log(e)
        // TODO
        return false;
    }

    // 1. verify TLS connection
    // ! TODO trick ssl connection is correct for now
    if (false && util.arrayBufferToHex(ar.report_data) !== ssl_sha512) {
        // TLS connection pubkey is not equal to pubkey in attestation report
        // -> notify user, attestation not possible
        console.log("TLS connection invalid")
        return false;
    }


    // 2. Validate that the VCEK is correctly signed by AMD root cert
    if (!await validateWithCertChain(vcek)) {
        // vcek could not be verified -> notify user, attestation not possible
        console.log("vcek invalid")
        return false;
    }

    // 3. Validate that the attestation report is correctly signed using the VCEK
    if (!await validateAttestationReport(ar, vcek)) {
        // attestation report could not be verified using vcek
        // -> notify user, attestation not possible
        console.log("attestation report invalid")
        return false;
    }

    return true;
}

window.addEventListener("load", async () => {
    hostInfo = await getHostInfo();

    // init UI
    titleText.innerText = "Remote Attestation";
    domainText.innerText = hostInfo.host;
    descriptionText.innerText = "PENDING";

    if (await attestHost(hostInfo)) {
        // 4. Trust the measurement? wait for user input
        titleText.innerText = "Remote Attestation";
        domainText.innerText = hostInfo.host;
        descriptionText.innerText = "This site offers remote attestation, do you want to trust it?";
        measurementText.innerText = `0x${arrayBufferToHex(measurement)}`;
        [ignoreButton, noTrustButton, trustButton, measurementText.parentNode].forEach((button) =>
            button.classList.remove("invisible"));
    } else {
        titleText.innerText = "Attestation FAILED";
        descriptionText.innerText = "ERROR";
    }
});
