import './style.css';
import '../../style/button.css';

import { types } from '../../lib/messaging';
import { fetchAttestationReport, getVCEK } from "../../lib/net";
import { validateWithCertChain } from "../../lib/crypto";

const titleText = document.getElementById("title")
const domainText = document.getElementById("domain")
const descriptionText = document.getElementById("description")
const ignoreButton = document.getElementById("ignore-button")
const noTrustButton = document.getElementById("do-not-trust-button")
const trustButton = document.getElementById("trust-button")

async function getHostInfo() {
    return await browser.runtime.sendMessage({
        type : types.getHostInfo
    })
}

window.addEventListener("load", async () => {
    const {url, attestationInfo} = await getHostInfo()

    let ar
    try {
        ar = await fetchAttestationReport(url, attestationInfo.path)
    } catch (e) {
        // no attestation report found -> notify user, attestation not possible
        console.log(e)
        // TODO
    }

    let vcek
    try {
        vcek = await getVCEK(ar.chip_id, ar.committedTCB)
    } catch (e) {
        // vcek could not be attained -> notify user, attestation not possible
        console.log(e)
        // TODO
    }

    if (!await validateWithCertChain(vcek)) {
        // vcek could not be verified -> notify user, attestation not possible
    }

})
