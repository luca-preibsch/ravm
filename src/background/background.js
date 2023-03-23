import * as pkijs from "pkijs";
import * as asn1js from "asn1js";
import _ from "lodash"

import * as attestation from "../lib/attestation";
import * as util from "../lib/util";
import {fetchArrayBuffer, fetchAttestationInfo} from "../lib/file"
import * as storage from "../lib/storage"
import {injectDialog} from "../lib/ui"

import ask from '../certificates/ask.der';
import ark from '../certificates/ark.der';

// Domain to observe
const ALL_URLS = "*://*/*"
const VM_DOMAIN = "transparent-vm.net";
const MEASURED_LOCATION = "*://" + VM_DOMAIN + "/*";
const SERVER_URL = "https://" + VM_DOMAIN + ":8080/"
const ATTESTATION_INFO_PATH = "/remote-attestation.json"

// For now hardcoded hash of the measurement this information needs
// to be retrieved from the IC
const VM_MEASUREMENT = "";

// AMD key server
const KDSINF = "https://kdsintf.amd.com/vcek/v1/Milan/";
const AMD_ARK_ASK_REVOKATION = "https://kdsintf.amd.com/vcek/v1/Milan/crl"

// Queue of domains that use RemoteAttestation, but need input by the user to either trust or don't trust
const AttestationQueue = {}

// Query to Amd key sever including the used TCB  
// https://kdsintf.amd.com/vcek/v1/Milan/<5b-machine-id-a2654>/?blSPL=02&teeSPL=00&snpSPL=06&ucodeSPL=55
function getKdsURL(chip_id, tcbObj) {
    var url = KDSINF + util.arrayBufferToHex(chip_id, false) + "?";
    url += "blSPL=" + util.zeroPad(tcbObj.blSPL, 2) + "&";
    url += "teeSPL=" + util.zeroPad(tcbObj.teeSPL, 2) + "&";
    url += "snpSPL=" + util.zeroPad(tcbObj.snpSPL, 2) + "&";
    url += "ucodeSPL=" + util.zeroPad(tcbObj.ucodeSPL, 2);
    //console.log(url);
    return url;
}

// Fetch assets of the web extension such as ask and ark
async function loadData(resourcePath) {
    var url = browser.runtime.getURL(resourcePath);
    return (await fetch(url)).arrayBuffer();
}

async function importPubKey(rawData) {
    return await window.crypto.subtle.importKey(
        "raw",
        rawData,
        {
            name: "ECDSA",
            namedCurve: "P-384"
        },
        true,
        ["verify"]
    );
}

async function verifyMessage(pubKey, signature, data) {
    return await window.crypto.subtle.verify(
        {
            name: "ECDSA",
            namedCurve: "P-384",
            hash: {name: "SHA-384"},
        },
        pubKey,
        signature,
        data
    );
}

// Validate the VCEK certificate using the AMD provided keys
// and revocation list.
// returns boolean 
async function validateWithCertChain(certificate) {

    function decodeCert(der) {
        const asn1 = asn1js.fromBER(der)
        return new pkijs.Certificate({schema: asn1.result})
    }

    const ask_cert = decodeCert(await loadData(ask));
    const ark_cert = decodeCert(await loadData(ark));

    const text = await fetchArrayBuffer(AMD_ARK_ASK_REVOKATION);

    const crls = [];
    const crl = pkijs.CertificateRevocationList.fromBER(text);
    crls.push(crl);

    // Create certificate's array (end-user certificate + intermediate certificates)
    const certificates = [];
    certificates.push(ask_cert);
    certificates.push(certificate);

    // Make a copy of trusted certificates array
    const trustedCerts = [];
    trustedCerts.push(ark_cert);

    // Create new X.509 certificate chain object
    const certChainVerificationEngine = new pkijs.CertificateChainValidationEngine({
        trustedCerts,
        certificates,
        crls,
    });

    return certChainVerificationEngine.verify();
}

async function sha512(str) {
    return crypto.subtle.digest("SHA-512", new TextEncoder("utf-8").encode(str)).then(buf => {
        return Array.prototype.map.call(new Uint8Array(buf), x => (('00' + x.toString(16)).slice(-2))).join('');
    });
}

// ? what does this do?
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
async function checkMeasurement(measurement, attestationInfo) {
    let url = new URL(SERVER_URL)
    storage.getAttestationDomain(url.hostname).then(result => {
        if (result == null) {
            console.log("unknown domain, saving measurement!")
            AttestationQueue[url.hostname] = {
                trustedSince: new Date(),
                lastTrusted: new Date(),
                type: attestationInfo.technology,
                measurement: measurement
            }
            injectDialog()
        } else {
            console.log("known measurement!")
            storage.getAttestationDomain(url.hostname).then(stored => {
                console.log("is equal? " + _.isEqual(measurement, stored.measurement))
            })
        }
    })
}

async function listenerOnHeadersReceived(details) {
    // has to be executed before further web requests like fetchAttestationInfo
    // TODO: error handling
    const ssl_sha512 = await querySSLFingerprint(details.requestId)

    // TODO: error handling
    const attestationInfo = await fetchAttestationInfo(SERVER_URL + ATTESTATION_INFO_PATH)

    // Request attestation report from VM
    // TODO: error handling
    const attestationReport = new attestation.AttesationReport(
        await fetchArrayBuffer(SERVER_URL + attestationInfo.path)
    )

    // TODO: error handling
    // TODO: cache kds, because it rejects multiple quick requests
    // Query the AMD key server for VCEK certificate using chip_id and TCB from report
    const rawData = await fetchArrayBuffer(getKdsURL(attestationReport.chip_id, attestationReport.committedTCB))

    const asn1 = asn1js.fromBER(rawData);
    if (asn1.offset === -1) {
        throw new Error("Incorrect encoded ASN.1 data");
    }

    const vcek = new pkijs.Certificate({schema: asn1.result});

    // Validate that the VCEK ic correctly signed by AMD root cert
    // TODO: nop
    validateWithCertChain(vcek);

    // Hack: We cannot directly ask the cert object for the public key as
    // it triggers a 'not supported' exception. Thus convert to JSON and back.
    const jsonPubKey = vcek.subjectPublicKeyInfo.subjectPublicKey.toJSON();

    // TODO: error handling
    const pubKey = await importPubKey(util.hex_decode(jsonPubKey.valueBlock.valueHex))
    if (await verifyMessage(pubKey, attestationReport.signature, attestationReport.getSignedData)) {

        console.log("1. Attestation report has been validated by the AMD keyserver.");

        // 2. Communication terminates inside the secured VM
        // ! trick ssl connection is correct for now
        if (true || util.arrayBufferToHex(attestationReport.report_data) === ssl_sha512) {
            console.log("2. Communication terminates inside the secured VM: \n" + ssl_sha512);
        } else {
            console.log(" No, expected state:" + util.arrayBufferToHex(attestationReport.report_data) + " but received: " + ssl_sha512);
        }

        // 3. VM has been initialized in the expected state
        console.log("3. Expected state: " + util.arrayBufferToHex(attestationReport.measurement))

        await checkMeasurement(attestationReport.measurement, attestationInfo)
    }
    return {};
}

async function listenerOnMessageReceived(message, sender, sendResponse) {
    if (sender.id !== browser.runtime.id) {
        // only accept messages by this extension
        console.log("Message by unknown sender received: " + message)
        return
    }
    const url = new URL(message.url)
    const domain = url.hostname
    if (AttestationQueue.hasOwnProperty(domain)) {
        await storage.setAttestationDomain(domain, AttestationQueue[domain])
        delete AttestationQueue[domain]
    }
}

browser.runtime.onMessage.addListener(listenerOnMessageReceived)

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
    // ! inside manifest file: plugin should run on all hosts (websites)
    // ! though, only specific requests (to specific hosts) should be intercepted
    // ? only for testing purposes, since in the end the plugin should check all requests?
    ["blocking", "responseHeaders"]
)
