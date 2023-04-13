import './style.css';
import '../../style/button.css'

import {getHostInfo, types} from "../../lib/messaging";
import * as storage from "../../lib/storage";
import {validateAttestationReport, validateWithCertChain} from "../../lib/crypto";
import * as util from "../../lib/util";
import {fetchAttestationReport, getVCEK} from "../../lib/net";
import {arrayBufferToHex} from "../../lib/util";

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
    await storage.removeTrusted(hostInfo.host);
    await storage.setUntrusted(hostInfo.host)
    browser.runtime.sendMessage({
        type : types.redirect,
        url : hostInfo.url
    })
})

// TODO auslagern
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

    if (await attestHost(hostInfo)) {
        newMeasurementText.innerText = arrayBufferToHex(measurement);
        oldMeasurementText.innerText = arrayBufferToHex((await storage.getHost(hostInfo.host)).measurement);
        [noTrustButton, trustButton].forEach((button) =>
            button.classList.remove("invisible"));
    } else {
        titleText.innerText = "Attestation FAILED";
        descriptionText.innerText = "ERROR";
    }
});
