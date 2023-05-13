import {fetchAttestationReport} from "../../lib/net";
import {arrayBufferToHex} from "../../lib/util";
import * as storage from "../../lib/storage";
import {types} from "../../lib/messaging";

export async function getReport(hostInfo) {
    try {
        return await fetchAttestationReport(hostInfo.host, hostInfo.attestationInfo.path);
    } catch (e) {
        // no attestation report found -> notify user, attestation not possible
        console.log(e);
        return null;
    }
}

export async function listenerTrustMeasurement(hostInfo, ar) {
    await storage.newTrusted(
        hostInfo.host, new Date(), new Date(), hostInfo.attestationInfo.technology, ar.arrayBuffer, hostInfo.ssl_sha512);
    return browser.runtime.sendMessage({
        type : types.redirect,
        url : hostInfo.url
    });
}

export async function listenerTrustRepo(hostInfo, ar) {
    await storage.newTrusted(
        hostInfo.host, new Date(), new Date(), hostInfo.attestationInfo.technology, ar.arrayBuffer, hostInfo.ssl_sha512);
    await storage.setMeasurementRepo(hostInfo.host, hostInfo.attestationInfo.measurement_repo);
    return browser.runtime.sendMessage({
        type : types.redirect,
        url : hostInfo.url
    });
}

export async function listenerTrustAuthor(hostInfo, ar) {
    await storage.newTrusted(
        hostInfo.host, new Date(), new Date(), hostInfo.attestationInfo.technology, ar.arrayBuffer, hostInfo.ssl_sha512);
    await storage.setAuthorKey(hostInfo.host, arrayBufferToHex(ar.author_key_digest));
    return browser.runtime.sendMessage({
        type : types.redirect,
        url : hostInfo.url
    });
}
