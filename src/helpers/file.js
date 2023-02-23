// import { validate } from "schema-utils"
// import schema from  "./remote-attestation.schema.json"

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
            // if (!validate(schema, attestationInfo)) {
            //     console.log("error: could not validate attestationInfo against schema")
            //     return false
            // }
            return attestationInfo
        })
}
