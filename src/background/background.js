import * as pkijs from "pkijs";
import * as asn1js from "asn1js";

import * as util from "../lib/util";
import {fetchAttestationInfo, fetchAttestationReport, getMeasurementFromRepo} from "../lib/net";
import * as storage from "../lib/storage";
import * as messaging from "../lib/messaging";
import {DialogType} from "../lib/ui";
import {validateMeasurement} from "../lib/crypto";
import {AttesationReport} from "../lib/attestation";
import {arrayBufferToHex} from "../lib/util";

// Domain to observe
const ALL_URLS = "https://*/*";
const ATTESTATION_INFO_PATH = "/remote-attestation.json";
const NEW_ATTESTATION_PAGE = browser.runtime.getURL("new-remote-attestation.html");
const BLOCKED_ATTESTATION_PAGE = browser.runtime.getURL("blocked-remote-attestation.html");
const MISSING_ATTESTATION_PAGE = browser.runtime.getURL("missing-remote-attestation.html");
const DIFFERS_ATTESTATION_PAGE = browser.runtime.getURL("differs-remote-attestation.html");

async function sha512(str) {
    return crypto.subtle.digest("SHA-512", new TextEncoder("utf-8").encode(str)).then(buf => {
        return Array.prototype.map.call(new Uint8Array(buf), x => (('00' + x.toString(16)).slice(-2))).join('');
    });
}

async function exportAndFormatCryptoKey(key) {
    const exported = await window.crypto.subtle.exportKey(
        "spki",
        key
    );
    const exportedAsString = util.ab2str(exported);
    const exportedAsBase64 = window.btoa(exportedAsString);

    return `-----BEGIN PUBLIC KEY-----
${exportedAsBase64.substring(0, 64)}
${exportedAsBase64.substring(64, 64 * 2)}
${exportedAsBase64.substring(64 * 2, 64 * 3)}
${exportedAsBase64.substring(64 * 3, 64 * 4)}
${exportedAsBase64.substring(64 * 4, 64 * 5)}
${exportedAsBase64.substring(64 * 5, 64 * 6)}
${exportedAsBase64.substring(64 * 6, 64 * 6 + 8)}
-----END PUBLIC KEY-----\n`;
}

// Function requests the SecurityInfo of the established https connection
// and extracts the public key.
// return: sha521 of the public key
// TODO: refactor / rewrite to return a Promise?
async function querySSLFingerprint(requestId) {

    const securityInfo = await browser.webRequest.getSecurityInfo(requestId, {
        "rawDER": true,
    });

    try {
        if (securityInfo.state === "secure" || securityInfo.state === "unsafe") {

            const serverCert = securityInfo.certificates[0];

            // raw ASN1 encoded certificate data
            const rawDER = new Uint8Array(serverCert.rawDER).buffer

            // We collect the rawDER encoded certificate
            const asn1 = asn1js.fromBER(rawDER);
            if (asn1.offset === -1) {
                // TODO: variable caught locally
                throw new Error("Incorrect encoded ASN.1 data");
            }
            const cert_simpl = new pkijs.Certificate({schema: asn1.result});
            var pubKey = await cert_simpl.getPublicKey();

            const exported = await exportAndFormatCryptoKey(pubKey);
            // console.log(exported);
            return await sha512(exported);
        } else {
            console.error("querySSLFingerprint: Cannot validate connection in state " + securityInfo.state);
        }
    } catch (error) {
        console.error("querySSLFingerprint: " + error);
    }
}

// checks if the host behind the url supports remote attestation
async function getAttestationInfo(url) {
    try {
        return await fetchAttestationInfo(new URL(ATTESTATION_INFO_PATH, url.href).href)
    } catch (e) {
        // console.log(e)
        return null
    }
}

/*
In the context of this event, we can get information about the TLS connection.
Thus, in here do:
 1. verify TLS connection with the SSL pub key in the attestation report
 */
async function listenerOnHeadersReceived(details) {
    // origin contains scheme (protocol), domain and port
    const url = new URL(details.url);
    const host = new URL(url.origin);

    const ssl_sha512 = await querySSLFingerprint(details.requestId);

    // skip URLS that are needed for the extension to work
    // 1. skip if this host did not support attestation before -> performance benefit for non-ra hosts
    // 2. skip ATTESTATION_INFO_PATH else it would create an infinite loop
    // 3. skip if this is a reportURL else it would create an infinite loop
    // 4. skip if this is the AMD key server else it would get requested too often and reject future calls
    if (await storage.isUnsupported(host.href)) {
        if (ssl_sha512 === await storage.getSSLKey(host.href)) {
            console.log(`skipped unsupported host: ${url.href}`);
            return {};
        } else {
            // the ssl key has changed, thus check the host for remote attestation support again
            console.log(`ssl key for unsupported host ${url.href} has changed`);
            console.log(ssl_sha512);
            console.log(await storage.getSSLKey(host.href));
            await storage.setUnsupported(host.href, false);
        }
    }
    if (url.pathname === ATTESTATION_INFO_PATH ||
        await storage.isReportURL(url.href) ||
        url.href.includes("kdsintf.amd.com/vcek")) {

        console.log(`skipped meta request: ${url.href}`);
        return {};
    }

    const isKnown = await storage.isKnownHost(host.href);
    const attestationInfo = await getAttestationInfo(host)
    const hostInfo = {
        host : host.href,
        url : url.href,
        attestationInfo : attestationInfo,
        ssl_sha512 : ssl_sha512,
    };

    // skip hosts that do not support remote attestation
    if (!attestationInfo) {
        if (isKnown) {
            // known host stopped using remote attestation -> inform user
            sessionStorage.setItem(details.tabId, JSON.stringify({
                ...hostInfo,
                dialog_type : DialogType.attestationMissing,
            }))
            return { redirectUrl: MISSING_ATTESTATION_PAGE }
        } else {
            // let the plugin ignore this host, since it does not support remote attestation
            // this brings performance benefits
            await storage.setUnsupported(host.href, true);
            await storage.setSSLKey(host.href, ssl_sha512);
        }
        console.log(`skipped host without attestation: ${host.href}`);
        return {}
    }

    // This is the place where the hosts attestation report is.
    // Safe it, so requests to this URL are not attested by the extension.
    await storage.setReportURL(host.href, new URL(attestationInfo.path, host.href).href)

    // check if the host is already known by the extension
    // if not:
    // - add current domain to the session storage
    // - redirect to the DIALOG_PAGE where attestation for the domain in session storage takes place
    if (!isKnown) {
        sessionStorage.setItem(details.tabId, JSON.stringify({
            ...hostInfo,
            dialog_type : DialogType.newHost
        }))
        return { redirectUrl: NEW_ATTESTATION_PAGE }
    }

    // host is known
    if (await storage.isIgnored(host.href)) {
        // TODO don't show anymore when something changes
        // attestation ignored -> show page action
        await browser.pageAction.setIcon({
            tabId: details.tabId,
            path: "./hazard-sign.svg",
        });
        browser.pageAction.show(details.tabId)
        return {};
    }

    if (await storage.isUntrusted(host.href)) {
        // host is blocked
        sessionStorage.setItem(details.tabId, JSON.stringify({
            ...hostInfo,
            dialog_type : DialogType.blockedHost
        }))
        return { redirectUrl: BLOCKED_ATTESTATION_PAGE }
    }

    // can host be trusted?
    // 1. for connections in the same session: test TLS pub key
    // 2. else test if stored measurement equals the current => store new measurement + TLS key
    // 3. check measurement repo for fitting measurement
    // 4. else inform user via dialog
    const storedHostInfo = await storage.getHost(host.href);
    if (ssl_sha512 === storedHostInfo.ssl_sha512) {
        // TLS pub key did not change, thus the host can be trusted
        // update lastTrusted
        console.log("known TLS key");
        await storage.setTrusted(host.href, { lastTrusted : new Date() });
    } else if (await validateMeasurement(hostInfo, arrayBufferToHex(new AttesationReport(storedHostInfo.ar_arrayBuffer).measurement))) {
        // the measurement is correct and the host can be trusted
        // -> store new TLS key, update lastTrusted
        console.log("known measurement");
        await storage.setTrusted(host.href, {
            lastTrusted: new Date(),
            ssl_sha512: ssl_sha512
        });
    } else if (await storage.getTrustedMeasurementRepo(host.href) &&
        await validateMeasurement(hostInfo, await getMeasurementFromRepo(
            await storage.getTrustedMeasurementRepo(host.href), hostInfo.attestationInfo.version))) {
        console.log("fitting measurement found in repo");
        // known measurement repo contains fitting measurement -> store new measurement
        let ar;
        try {
            ar = await fetchAttestationReport(hostInfo.host, hostInfo.attestationInfo.path);
        } catch (e) {
            // no attestation report found, but was found before during validation
            // thus something went terribly wrong -> remove trust completely
            console.log(e);
            await storage.removeHost(host.href);
        }
        await storage.setTrusted(host.href, {
            lastTrusted: new Date(),
            ssl_sha512: ssl_sha512,
            ar_arrayBuffer: ar.arrayBuffer
        });
    } else {
        console.log("attestation using stored measurement failed");
        sessionStorage.setItem(details.tabId, JSON.stringify({
            ...hostInfo,
            dialog_type : DialogType.measurementDiffers,
        }));
        return { redirectUrl: DIFFERS_ATTESTATION_PAGE };
    }

    // TEST
    // sessionStorage.setItem(details.tabId, JSON.stringify({
    //     ...hostInfo,
    //     dialog_type : DialogType.measurementDiffers,
    // }));
    // return { redirectUrl: DIFFERS_ATTESTATION_PAGE };

    // TODO don't show anymore when something changes
    // attestation successful -> show checkmark page action
    await browser.pageAction.setIcon({
        tabId: details.tabId,
        path: "./check-mark.svg",
    });
    browser.pageAction.show(details.tabId);
    return {};
}

// We need to register this listener, since we require the SecurityInfo object
// to validate the public key of the SSL connection
browser.webRequest.onHeadersReceived.addListener(
    listenerOnHeadersReceived,
    {
        urls: [ALL_URLS]
    },
    ["blocking"]
)

async function listenerOnMessageReceived(message, sender) {
    if (sender.id !== browser.runtime.id) {
        // only accept messages by this extension
        console.log("Message by unknown sender received: " + message)
        return
    }

    switch (message.type) {
        case messaging.types.getHostInfo:
            const hostInfo = JSON.parse(sessionStorage.getItem(sender.tab.id));
            // sendResponse() does not work
            return Promise.resolve(hostInfo)
        case messaging.types.redirect:
            browser.tabs.update(sender.tab.id, {
                url : message.url
            })
    }
}

browser.runtime.onMessage.addListener(listenerOnMessageReceived);
