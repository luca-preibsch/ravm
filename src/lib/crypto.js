import * as asn1js from "asn1js";
import * as pkijs from "pkijs";
import ask from "../certificates/ask.der";
import ark from "../certificates/ark.der";
import {fetchArrayBuffer} from "./net";

// Validate the VCEK certificate using the AMD provided keys
// and revocation list.
// returns boolean
export async function validateWithCertChain(certificate) {
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