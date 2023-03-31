import * as pkijs from "pkijs";
import * as asn1js from "asn1js";
import _ from "lodash"

import * as attestation from "../lib/attestation";
import * as util from "../lib/util";
import {fetchArrayBuffer, fetchAttestationInfo, getVCEK} from "../lib/net"
import * as storage from "../lib/storage"
import * as ui from "../lib/ui"
import * as messaging from "../lib/messaging"

// Domain to observe
const ALL_URLS = "https://*/*"
const VM_DOMAIN = "transparent-vm.net";
const MEASURED_LOCATION = "*://" + VM_DOMAIN + "/*";
const SERVER_URL = "https://" + VM_DOMAIN + ":8080/"
const ATTESTATION_INFO_PATH = "./remote-attestation.json"
const DIALOG_PAGE = browser.runtime.getURL("remote-attestation.html")

// For now hardcoded hash of the measurement this information needs
// to be retrieved from the IC
const VM_MEASUREMENT = "";

// Queue of domains that use RemoteAttestation, but need input by the user to either trust or don't trust
const AttestationQueue = {}

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

// if the extension already saved a measurement for the given domain, this checks if the measurements equal,
// otherwise the web extension asks the user whether to trust the website with the corresponding measurement
async function checkMeasurement(measurement, attestationInfo, tabId) {
    let url = new URL(SERVER_URL)
    storage.getTrusted(url.hostname).then(result => {
        if (result == null) {
            // this is a domain with no recordings -> ask the user what to do
            console.log("unknown domain, saving measurement!")
            AttestationQueue[url.hostname] = {
                trustedSince: new Date(),
                lastTrusted: new Date(),
                type: attestationInfo.technology,
                measurement: measurement
            }
            ui.showDialog(ui.DialogType.newDomain, url.hostname, tabId)
        } else {
            // this domain has recordings
            console.log("known measurement!")
            storage.getTrusted(url.hostname).then(stored => {
                if (!_.isEqual(measurement, stored.measurement)) {
                    // the current measurement does not equal the one stored -> ask the user what to do
                    // TODO: implement
                    ui.showDialog(ui.DialogType.measurementDiffers, url.hostname, tabId)
                }
            })
        }
    })
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
    const host = new URL(new URL(details.url).origin)

    // TODO
    // details.fromCache || details.statusCode === 304
    // if (details.statusCode !== 200) {
    //     console.log("skipping")
    //     return {}
    // }
    //
    // if (details.tabId === -1) {
    //     console.log("header inside non-tab received")
    //     return {}
    // }

    // skip hosts that do not support remote attestation
    const attestationInfo = await getAttestationInfo(host)
    if (!attestationInfo)
        return {}

    // check if the host is already known by the extension
    // if not:
    // - add current domain to the session storage
    // - redirect to the DIALOG_PAGE where attestation for the domain in session storage takes place
    if (!await storage.isKnownHost(host.href)) {
        sessionStorage.setItem(details.tabId, JSON.stringify({
            host : host.href,
            url : details.url,
            attestationInfo : attestationInfo
        }))
        return { redirectUrl: DIALOG_PAGE }
    }

    console.log("known host")
    return {}

    // port step by step (done)

    // has to be executed before further web requests like fetchAttestationInfo
    // TODO: error handling
    const ssl_sha512 = await querySSLFingerprint(details.requestId)

    // done
    // TODO: error handling
    // const attestationInfo = fetchAttestationInfo(SERVER_URL + ATTESTATION_INFO_PATH)

    // done
    // Request attestation report from VM
    // TODO: error handling
    const attestationReport = new attestation.AttesationReport(
        await fetchArrayBuffer(SERVER_URL + attestationInfo.path)
    )

    // done
    const vcek = await getVCEK(attestationReport.chip_id, attestationReport.committedTCB)

    // done
    // Validate that the VCEK ic correctly signed by AMD root cert
    // TODO: nop
    validateWithCertChain(vcek);

    // done
    // Hack: We cannot directly ask the cert object for the public key as
    // it triggers a 'not supported' exception. Thus convert to JSON and back.
    const jsonPubKey = vcek.subjectPublicKeyInfo.subjectPublicKey.toJSON()
    // TODO: error handling
    const pubKey = await importPubKey(util.hex_decode(jsonPubKey.valueBlock.valueHex))
    // ? verifyMessage prüft, ob attestationReport richtig gesigned wurde
    if (await verifyMessage(pubKey, attestationReport.signature, attestationReport.getSignedData)) {

        console.log("1. Attestation report has been validated by the AMD keyserver.");

        // TODO: port
        // 2. Communication terminates inside the secured VM
        // ! trick ssl connection is correct for now
        if (true || util.arrayBufferToHex(attestationReport.report_data) === ssl_sha512) {
            console.log("2. Communication terminates inside the secured VM: \n" + ssl_sha512);
        } else {
            console.log(" No, expected state:" + util.arrayBufferToHex(attestationReport.report_data) + " but received: " + ssl_sha512);
        }

        // 3. VM has been initialized in the expected state
        console.log("3. Expected state: " + util.arrayBufferToHex(attestationReport.measurement))

        await checkMeasurement(attestationReport.measurement, attestationInfo, details.tabId)
    }
    // console.log("wir returnen")
    // console.log(browser.runtime.getURL("remote-attestation.html"))
    // return {
    //     redirectUrl: browser.runtime.getURL("remote-attestation.html")
    // }
}

// We need to register this listener, since we require the SecurityInfo object
// to validate the public key of the SSL connection
browser.webRequest.onHeadersReceived.addListener(
    listenerOnHeadersReceived,
    {
        urls: [ALL_URLS],
        // only listen to the top level document getting loaded for now
        // TODO needs more work! All connections should get verified
        types: ["main_frame"]
    },
    ["blocking"]
)

/*
in the context of this event, requests can be canceled or redirected.
Thus, in here do:
 1. validate attestation report against AMD server
 2. check if the measurement has been trusted or ask the user for trust
 */
// async function listenerOnBeforeRequest(details) {
//     return {
//         redirectUrl: browser.runtime.getURL("remote-attestation.html"),
//     };
// }
//
// browser.webRequest.onBeforeRequest.addListener(
//     listenerOnBeforeRequest,
//     {
//         urls: [ALL_URLS],
//         // only listen to the top level document getting loaded for now
//         // TODO needs more work! All connections should get verified
//         // types: ["main_frame"]
//     },
//     ["blocking"]
// )

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

    // const url = new URL(message.url)
    // const domain = url.hostname
    // if (AttestationQueue.hasOwnProperty(domain)) {
    //     if (message.trust) {
    //         console.log("trusting")
    //         await storage.setTrustedObj(domain, AttestationQueue[domain])
    //         delete AttestationQueue[domain]
    //     } else {
    //         console.log("hinzufügen gestartet")
    //         // TODO pro Zeile console.log für debugging
    //         await storage.setUntrusted(domain)
    //         // await storage.setUntrusted(domain)
    //         // await storage.setUntrusted("test1")
    //         // await storage.setUntrusted("test2")
    //         // await storage.setUntrusted("test3")
    //         // console.log("is " + await storage.isUntrusted("test1"))
    //         // await storage.removeUntrusted("test1")
    //         console.log("hinzufügen beendet")
    //         delete AttestationQueue[domain]
    //     }
    // }
}

browser.runtime.onMessage.addListener(listenerOnMessageReceived)
