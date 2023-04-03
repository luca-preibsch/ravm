
// TODO: error handling
import * as asn1js from "asn1js";
import * as pkijs from "pkijs";
import * as util from "./util";
import * as attestation from "./attestation";

async function fetchFile(url) {
    return await fetch(url, {
        method: "GET",
        cache: "no-cache",
        referrerPolicy: "no-referrer"
    })
}

export async function fetchArrayBuffer(url) {
    return await (await fetchFile(url)).arrayBuffer()
}

export async function fetchAttestationInfo(url) {
    return await (await fetchFile(url)).json()
}

export async function fetchAttestationReport(url, path) {
    const raw = await fetchArrayBuffer(new URL(path, url).href)
    return new attestation.AttesationReport(raw)
}

// TODO cache VCEK in session storage, like this its broken
export async function getVCEK(chipId, committedTCB) {
    // AMD key server
    const KDSINF = "https://kdsintf.amd.com/vcek/v1/Milan/";

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

    const kdsUrl = getKdsURL(chipId, committedTCB)

    // Query the AMD key server for VCEK certificate using chip_id and TCB from report
    // let fetch-api cache the response
    const rawData = await (await fetch(kdsUrl, { cache : "force-cache" })).arrayBuffer()

    const asn1 = asn1js.fromBER(rawData);
    if (asn1.offset === -1) {
        throw new Error("Incorrect encoded ASN.1 data");
    }

    return new pkijs.Certificate({schema: asn1.result})
}
