
// TODO: error handling
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
    return await fetchFile(url)
        .then(
            response => response.json(),
            reason => {
                console.log("error: fetching file " + reason)
                return false
            })
        .then(attestationInfo => {
            return attestationInfo
        })
}
