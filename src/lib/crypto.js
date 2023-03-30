import * as asn1js from "asn1js";
import * as pkijs from "pkijs";
import ask from "../certificates/ask.der";
import ark from "../certificates/ark.der";
import {fetchArrayBuffer} from "./net";
import * as util from "./util";

// Validate the VCEK certificate using the AMD provided keys
// and revocation list.
// returns boolean
export async function validateWithCertChain(vcek) {
    // AMD key server
    const AMD_ARK_ASK_REVOCATION = "https://kdsintf.amd.com/vcek/v1/Milan/crl"

    // Fetch assets of the web extension such as ask and ark
    async function loadData(resourcePath) {
        var url = browser.runtime.getURL(resourcePath);
        return (await fetch(url)).arrayBuffer();
    }

    function decodeCert(der) {
        const asn1 = asn1js.fromBER(der)
        return new pkijs.Certificate({schema: asn1.result})
    }

    const ask_cert = decodeCert(await loadData(ask));
    const ark_cert = decodeCert(await loadData(ark));

    const text = await fetchArrayBuffer(AMD_ARK_ASK_REVOCATION);

    const crls = [];
    const crl = pkijs.CertificateRevocationList.fromBER(text);
    crls.push(crl);

    // Create certificate's array (end-user certificate + intermediate certificates)
    const certificates = [];
    certificates.push(ask_cert);
    certificates.push(vcek);

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

export async function validateAttestationReport(ar, vcek) {
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

    // Hack: We cannot directly ask the cert object for the public key as
    // it triggers a 'not supported' exception. Thus convert to JSON and back.
    const jsonPubKey = vcek.subjectPublicKeyInfo.subjectPublicKey.toJSON()
    const pubKey = await importPubKey(util.hex_decode(jsonPubKey.valueBlock.valueHex))
    return await verifyMessage(pubKey, ar.signature, ar.getSignedData)
}
