const UNTRUSTED = "untrusted"

async function getContentsOf(request){
    const item = await browser.storage.local.get(request)
    if (Object.keys(item).length === 0)
        return {}
    else
        return item[request]
}

// TODO switch Trusted to use a category like untrusted?
export function setTrusted(host, trustedSince, lastTrusted, type, measurement) {
    return setTrustedObj(host, {
        trustedSince : trustedSince,
        lastTrusted : lastTrusted,
        type : type,
        measurement : measurement,
        trusted : true,
    })
}

export async function setTrustedObj(host, infoObj) {
    const old = await getContentsOf(host)
    return browser.storage.local.set({
        [host] : {...old, ...infoObj} // the latter overwrites the former
    })
}

// TODO broken when using setReportURL
export async function isTrusted(host) {
    const hosts = await browser.storage.local.get(host)
    return Object.keys(hosts).length !== 0 && hosts[host].trusted
}

// returns all stored information about one host or about all hosts if host is left blank
export function getHost(host) {
    if (host) {
        return getContentsOf(host)
    } else {
        return browser.storage.local.get()
    }
}

// TODO test
export function removeTrusted(host) {
    return browser.storage.local.remove(host)
}

export async function setUntrusted(host) {
    const old = await getContentsOf(host)
    return browser.storage.local.set({
        [host] : {...old,
            blocked : true,
        } // the latter overwrites the former
    })
}

export async function isUntrusted(host) {
    const hosts = await browser.storage.local.get(host)
    return Object.keys(hosts).length !== 0 && hosts[host].blocked
}

export async function removeUntrusted(host) {
    // TODO
    throw Error("Not implemented")
}

export async function isKnownHost(host) {
    return await isTrusted(host) || await isUntrusted(host)
}

export async function setReportURL(host, url) {
    const old = await getContentsOf(host)
    return browser.storage.local.set({
        [host] : {...old,
            reportURL : url,
        } // the latter overwrites the former
    })
}

export async function isReportURL(url) {
    let hosts = await browser.storage.local.get(null);
    return Object.values(hosts).map(h => h.reportURL).includes(url);
}
