async function getContentsOf(request){
    const item = await browser.storage.local.get(request)
    if (Object.keys(item).length === 0)
        return {}
    else
        return item[request]
}

export function newTrusted(host, trustedSince, lastTrusted, type, measurement, ssl_sha512) {
    return setTrusted(host, {
        trustedSince : trustedSince,
        lastTrusted : lastTrusted,
        type : type,
        measurement : measurement,
        ssl_sha512 : ssl_sha512,
        trusted : true,
    })
}

export async function setTrusted(host, infoObj) {
    const old = await getContentsOf(host)
    return browser.storage.local.set({
        [host] : {...old, ...infoObj} // the latter overwrites the former
    })
}

export async function isTrusted(host) {
    const hosts = await browser.storage.local.get(host)
    return Object.keys(hosts).length !== 0 && hosts[host].trusted
}

export async function getTrusted() {
    const hosts = await getHost();
    return Object.fromEntries(Object.entries(hosts).filter(([, val]) => val.trusted));
}

// returns all stored information about one host or about all hosts if host is left blank
export function getHost(host) {
    if (host) {
        return getContentsOf(host)
    } else {
        return browser.storage.local.get()
    }
}

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
    return browser.storage.local.remove(host);
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
