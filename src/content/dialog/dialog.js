import './style.css';
import '../../style/button.css';

import { types } from '../../lib/messaging';
import { fetchAttestationReport, getVCEK } from "../../lib/net";
import { validateWithCertChain, validateAttestationReport } from "../../lib/crypto";
import * as storage from '../../lib/storage'
import * as util from '../../lib/util'

const titleText = document.getElementById("title")
const domainText = document.getElementById("domain")
const descriptionText = document.getElementById("description")
const ignoreButton = document.getElementById("ignore-button")
const noTrustButton = document.getElementById("do-not-trust-button")
const trustButton = document.getElementById("trust-button")

let host, attestationInfo, url
let measurement

async function getHostInfo() {
    return await browser.runtime.sendMessage({
        type : types.getHostInfo
    })
}

ignoreButton.addEventListener("click", () => {
    // TODO what to do on ignore?
    browser.runtime.sendMessage({
        type : types.redirect,
        url : url
    })
})

trustButton.addEventListener("click", () => {
    storage.setTrusted(host, new Date(), new Date(), attestationInfo.technology, measurement)
    browser.runtime.sendMessage({
        type : types.redirect,
        url : url
    })
})

noTrustButton.addEventListener("click", () => {
    storage.setUntrusted(host)
})

window.addEventListener("load", async () => {
    const hostInfo = await getHostInfo()
    host = hostInfo.host
    attestationInfo = hostInfo.attestationInfo
    url = hostInfo.url
    const ssl_sha512 = hostInfo.ssl_sha512

    // init UI
    titleText.innerText = "Remote Attestation"
    domainText.innerText = host
    descriptionText.innerText = "PENDING"

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

    // TODO caching
    let vcek
    try {
        // TODO cache here in window storage?
        vcek = await getVCEK(ar.chip_id, ar.committedTCB)
    } catch (e) {
        // vcek could not be attained -> notify user, attestation not possible
        console.log(e)
        // TODO
    }

    // 1. verify TLS connection
    // ! trick ssl connection is correct for now
    if (false && util.arrayBufferToHex(ar.report_data) !== ssl_sha512) {
        // TLS connection pubkey is not equal to pubkey in attestation report
        // -> notify user, attestation not possible
        console.log("TLS connection invalid")
    }

    // 2. Validate that the VCEK is correctly signed by AMD root cert
    if (!await validateWithCertChain(vcek)) {
        // vcek could not be verified -> notify user, attestation not possible
        console.log("vcek invalid")
    }

    // 3. Validate that the attestation report is correctly signed using the VCEK
    if (!await validateAttestationReport(ar, vcek)) {
        // attestation report could not be verified using vcek
        // -> notify user, attestation not possible
        console.log("attestation report invalid")
    }

    // 4. Trust the measurement? wait for user input
    titleText.innerText = "Remote Attestation"
    domainText.innerText = host
    descriptionText.innerText = "This site offers remote attestation, do you want to trust it?"

})
