
export function setAttestationDomain(domain, trustedSince, lastTrusted, type, measurement) {
    return browser.storage.local.set({
        [domain] : {
            trustedSince : trustedSince,
            lastTrusted : lastTrusted,
            type : type,
            measurement : measurement,
        }
    })
}

export async function getAllAttestationDomains() {
    return browser.storage.local.get(null)
}

export async function getAttestationDomain(domain) {
    const result = await browser.storage.local.get(domain)
    return result[domain]
}

export function removeAttestationDomain(domain) {
    return browser.storage.local.remove(domain)
}
