import './style.css';
import '../../style/button.css';

import { types } from '../../lib/messaging';
import { fetchAttestationReport, getVCEK } from "../../lib/net";
import { validateWithCertChain, validateAttestationReport } from "../../lib/crypto";
import * as storage from '../../lib/storage'

const titleText = document.getElementById("title")
const domainText = document.getElementById("domain")
const descriptionText = document.getElementById("description")
const ignoreButton = document.getElementById("ignore-button")
const noTrustButton = document.getElementById("do-not-trust-button")
const trustButton = document.getElementById("trust-button")

let host, attestationInfo, measurement, url

async function getHostInfo() {
    return await browser.runtime.sendMessage({
        type : types.getHostInfo
    })
}

ignoreButton.addEventListener("click", () => {
    browser.runtime.sendMessage({
        type : types.redirect,
        url : url
    })
})

trustButton.addEventListener("click", () => {
    storage.setTrusted(host, new Date(), new Date(), attestationInfo.technology, measurement)
    console.log("stored " + host)
    browser.runtime.sendMessage({
        type : types.redirect,
        url : url
    })
})

noTrustButton.addEventListener("click", () => {
    storage.setUntrusted(host)
    console.log("stored " + host)
})

window.addEventListener("load", async () => {
    // TODO url, ar zwischenspeichern und gegen reloads schützen? Oder einfach in background anforderbar lassen
    const hostInfo = await getHostInfo()
    host = hostInfo.host
    attestationInfo = hostInfo.attestationInfo
    url = hostInfo.url

    // Request attestation report from VM
    let ar
    try {
        ar = await fetchAttestationReport(host, attestationInfo.path)
    } catch (e) {
        // no attestation report found -> notify user, attestation not possible
        console.log(e)
        // TODO
    }

    measurement = ar.measurement

    let vcek
    try {
        // TODO cache here in window storage?
        vcek = await getVCEK(ar.chip_id, ar.committedTCB)
    } catch (e) {
        // vcek could not be attained -> notify user, attestation not possible
        console.log(e)
        // TODO
    }

    // Validate that the VCEK ic correctly signed by AMD root cert
    if (!await validateWithCertChain(vcek)) {
        // vcek could not be verified -> notify user, attestation not possible
    }

    if (!await validateAttestationReport(ar, vcek)) {
        // attestation report could not be verified using vcek
        // -> notify user, attestation not possible
    }

    // check measurement -> ask user
    titleText.innerText = "Remote Attestation"
    domainText.innerText = host
    descriptionText.innerText = "This site offers remote attestation, do you want to trust it?"
})
