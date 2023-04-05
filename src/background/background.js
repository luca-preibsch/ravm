import * as pkijs from "pkijs";
import * as asn1js from "asn1js";
import _ from "lodash"

import * as attestation from "../lib/attestation";
import * as util from "../lib/util";
import {fetchArrayBuffer, fetchAttestationInfo, getVCEK} from "../lib/net"
import * as storage from "../lib/storage"
import * as messaging from "../lib/messaging"
import {DialogType} from "../lib/ui";

// Domain to observe
const ALL_URLS = "https://*/*"
const VM_DOMAIN = "transparent-vm.net";
const MEASURED_LOCATION = "*://" + VM_DOMAIN + "/*";
const SERVER_URL = "https://" + VM_DOMAIN + ":8080/"
const ATTESTATION_INFO_PATH = "/remote-attestation.json"
const DIALOG_PAGE = browser.runtime.getURL("remote-attestation.html")

// For now hardcoded hash of the measurement this information needs
// to be retrieved from the IC
const VM_MEASUREMENT = "";

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
        console.log(e)
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
    const url = new URL(details.url)
    const host = new URL(url.origin)

    if (url.pathname === ATTESTATION_INFO_PATH ||
        await storage.isReportURL(url.href) ||
        url.href.includes("kdsintf.amd.com/vcek")) {

        console.log(`skipped meta request: ${url.href}`)
        return {}
    }

    // skip hosts that do not support remote attestation
    const attestationInfo = await getAttestationInfo(host)
    if (!attestationInfo) {
        console.log("skipped host without attestation")
        return {}
    }

    await storage.setReportURL(host.href, new URL(attestationInfo.path, host.href).href)

    const ssl_sha512 = await querySSLFingerprint(details.requestId)

    // check if the host is already known by the extension
    // if not:
    // - add current domain to the session storage
    // - redirect to the DIALOG_PAGE where attestation for the domain in session storage takes place
    if (!await storage.isKnownHost(host.href)) {
        sessionStorage.setItem(details.tabId, JSON.stringify({
            host : host.href,
            url : url.href,
            attestationInfo : attestationInfo,
            ssl_sha512 : ssl_sha512,
            dialog_type : DialogType.newHost
        }))
        return { redirectUrl: DIALOG_PAGE }
    }

    // host is known
    if (await storage.isUntrusted(host.href)) {
        // host is blocked
        sessionStorage.setItem(details.tabId, JSON.stringify({
            host : host.href,
            url : url.href,
            attestationInfo : attestationInfo,
            ssl_sha512 : ssl_sha512,
            dialog_type : DialogType.blockedHost
        }))
        return { redirectUrl: DIALOG_PAGE }
    }

    // can host be trusted?


    console.log("known host")
    return {}
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
            const hostInfo = JSON.parse(sessionStorage.getItem(sender.tab.id))
            // TODO: if removed, dialog script cant get the item on reload
            // sessionStorage.removeItem(sender.tab.id)
            // sendResponse does not work
            return Promise.resolve(hostInfo)
        case messaging.types.redirect:
            // TODO works for demo site, but does this work for typical pages with scripts and resources?
            browser.tabs.update(sender.tab.id, {
                url : message.url
            })
    }
}

browser.runtime.onMessage.addListener(listenerOnMessageReceived)
