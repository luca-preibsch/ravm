
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

export function getAllAttestationDomains() {
    return browser.storage.local.get(null)
}

export function getAttestationDomain(domain) {
    return browser.storage.local.get(domain)
}

export function removeAttestationDomain(domain) {
    return browser.storage.local.remove(domain)
}
