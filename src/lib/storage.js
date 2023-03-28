const UNTRUSTED = "untrusted"

// TODO switch Trusted to use a category like untrusted?
export function setTrusted(domain, trustedSince, lastTrusted, type, measurement) {
    return browser.storage.local.set({
        [domain] : {
            trustedSince : trustedSince,
            lastTrusted : lastTrusted,
            type : type,
            measurement : measurement,
        }
    })
}

export function setTrustedObj(domain, infoObj) {
    return browser.storage.local.set({
        [domain] : infoObj
    })
}

export async function getTrusted(domain) {
    if (domain) {
        const result = await browser.storage.local.get(domain)
        return result[domain]
    } else {
        return browser.storage.local.get(null)
    }
}

export function removeTrusted(domain) {
    return browser.storage.local.remove(domain)
}

export async function setUntrusted(domain) {
    let untrusted = await browser.storage.local.get(UNTRUSTED)

    if (Object.keys(untrusted).length === 0) {
        untrusted = [domain]
    } else {
        if (!untrusted[UNTRUSTED].includes(domain))
            untrusted[UNTRUSTED].push(domain)
    }

    return browser.storage.local.set({
        [UNTRUSTED] : untrusted
    })
}

export async function isUntrusted(domain) {
    const untrusted = await browser.storage.local.get(UNTRUSTED)
    if (Object.keys(untrusted).length === 0)
        return false
    return !untrusted[UNTRUSTED].includes(domain);

}

export async function getUntrusted() {
    const untrusted = await browser.storage.local.get(UNTRUSTED)
    if (Object.keys(untrusted).length === 0)
        return null
    return untrusted[UNTRUSTED]
}

export async function removeUntrusted(domain) {
    const untrusted = await browser.storage.local.get(UNTRUSTED)
    if (Object.keys(untrusted).length === 0)
        return false
    const newUntrusted = untrusted.filter(d => d !== domain)
    return untrusted.length !== newUntrusted.length
}
