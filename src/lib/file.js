
// TODO: error handling
export async function fetchFile(url) {
    return await fetch(url, {
        method: "GET",
        cache: "no-cache",
        referrerPolicy: "no-referrer"
    })
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
