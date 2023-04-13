import {fetchAttestationReport, getVCEK} from "../../lib/net";
import {validateAttestationReport, validateWithCertChain} from "../../lib/crypto";
import * as util from "../../lib/util";

export async function getReport(hostInfo) {
    try {
        return await fetchAttestationReport(hostInfo.host, hostInfo.attestationInfo.path);
    } catch (e) {
        // no attestation report found -> notify user, attestation not possible
        console.log(e);
        return null;
    }
}

export async function checkHost(hostInfo, ar) {
    const ssl_sha512 = hostInfo.ssl_sha512;

    let vcek;
    try {
        vcek = await getVCEK(ar.chip_id, ar.committedTCB);
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
        console.log("TLS connection invalid");
        return false;
    }

    // 2. Validate that the VCEK is correctly signed by AMD root cert
    if (!await validateWithCertChain(vcek)) {
        // vcek could not be verified -> notify user, attestation not possible
        console.log("vcek invalid");
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
