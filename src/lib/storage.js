const UNTRUSTED = "untrusted"

// TODO switch Trusted to use a category like untrusted?
export function setTrusted(host, trustedSince, lastTrusted, type, measurement) {
    return browser.storage.local.set({
        [host] : {
            trustedSince : trustedSince,
            lastTrusted : lastTrusted,
            type : type,
            measurement : measurement,
        }
    })
}

export function setTrustedObj(host, infoObj) {
    return browser.storage.local.set({
        [host] : infoObj
    })
}

export async function isTrusted(host) {
    const trusted = await browser.storage.local.get(host)
    return Object.keys(trusted).length !== 0
}

export async function getTrusted(host) {
    if (host) {
        const result = await browser.storage.local.get(host)
        return result[host]
    } else {
        return browser.storage.local.get(null)
    }
}

export function removeTrusted(host) {
    return browser.storage.local.remove(host)
}

export async function setUntrusted(host) {
    const untrusted = await browser.storage.local.get(UNTRUSTED)
    if (Object.keys(untrusted).length === 0) {
        return browser.storage.local.set({
            [UNTRUSTED] : [host]
        })
    } else if (!untrusted[UNTRUSTED].includes(host)) {
        untrusted[UNTRUSTED].push(host)
        return browser.storage.local.set({
            [UNTRUSTED] : untrusted[UNTRUSTED]
        })
    }
}

export async function isUntrusted(host) {
    const untrusted = await browser.storage.local.get(UNTRUSTED)
    if (Object.keys(untrusted).length === 0)
        return false
    return untrusted[UNTRUSTED].includes(host);

}

export async function getUntrusted() {
    const untrusted = await browser.storage.local.get(UNTRUSTED)
    if (Object.keys(untrusted).length === 0)
        return null
    return untrusted[UNTRUSTED]
}

export async function removeUntrusted(host) {
    const untrusted = await browser.storage.local.get(UNTRUSTED)
    if (Object.keys(untrusted).length === 0)
        return false
    const newUntrusted = untrusted.filter(d => d !== host)
    return untrusted.length !== newUntrusted.length
}

export async function isKnownHost(host) {
    return await isTrusted(host) || await isUntrusted(host)
}
