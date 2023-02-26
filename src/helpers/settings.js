const SETTINGS_CATEGORY = "attestation-domains"

export function setAttestationDomain(domain, trustedSince, lastTrusted, type, measurement) {
    return browser.storage.local.set({
        [SETTINGS_CATEGORY] : {
            [domain] : {
                trustedSince : trustedSince,
                lastTrusted : lastTrusted,
                type : type,
                measurement : measurement,
            }
        }
    })
}

// TODO modify options and background

export async function getAllAttestationDomains() {
    const result = await browser.storage.local.get(SETTINGS_CATEGORY)
    return result[SETTINGS_CATEGORY]
}

export async function getAttestationDomain(domain) {
    const result = await browser.storage.local.get({ [SETTINGS_CATEGORY] : [domain] })
    return result[SETTINGS_CATEGORY][domain]
}

export function removeAttestationDomain(domain) {
    return browser.storage.local.remove({ [SETTINGS_CATEGORY] : [domain] })
}
