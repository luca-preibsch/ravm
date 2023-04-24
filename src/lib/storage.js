async function getContentsOf(request){
    const item = await browser.storage.local.get(request);
    if (Object.keys(item).length === 0)
        return {};
    else
        return item[request];
}

async function setProperties(host, obj) {
    const old = await getContentsOf(host);
    return browser.storage.local.set({
        [host] : {...old, ...obj} // the latter overwrites the former
    });
}

export function newTrusted(host, trustedSince, lastTrusted, type, ar_arrayBuffer, ssl_sha512) {
    return setTrusted(host, {
        trustedSince : trustedSince,
        lastTrusted : lastTrusted,
        type : type,
        ar_arrayBuffer : ar_arrayBuffer,
        ssl_sha512 : ssl_sha512,
        trusted : true,
    })
}

export async function setTrusted(host, infoObj) {
    return setProperties(host, infoObj);
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

export function removeHost(host) {
    return browser.storage.local.remove(host)
}

export async function setUntrusted(host, untrusted) {
    return setProperties(host, {blocked: untrusted});
}

export async function isUntrusted(host) {
    const hosts = await browser.storage.local.get(host)
    return Object.keys(hosts).length !== 0 && hosts[host].blocked
}

export async function isKnownHost(host) {
    return await isTrusted(host) || await isUntrusted(host) || await isIgnored(host);
}

export async function setReportURL(host, url) {
    return setProperties(host, {reportURL: url});
}

export async function isReportURL(url) {
    let hosts = await browser.storage.local.get(null);
    return Object.values(hosts).map(h => h.reportURL).includes(url);
}

export async function setIgnore(host, ignore) {
    return setProperties(host, {ignore: ignore});
}

export async function isIgnored(host) {
    const hosts = await browser.storage.local.get(host);
    return Object.keys(hosts).length !== 0 && hosts[host].ignore;
}

export async function setUnsupported(host, unsupported) {
    return setProperties(host, {unsupported: unsupported});
}

export async function isUnsupported(host) {
    const hosts = await browser.storage.local.get(host);
    return Object.keys(hosts).length !== 0 && hosts[host].unsupported;
}

export async function setSSLKey(host, ssl_sha512) {
    return setProperties(host, {ssl_sha512: ssl_sha512});
}

export async function getSSLKey(host) {
    const hosts = await browser.storage.local.get(host);
    return Object.keys(hosts).length !== 0 && hosts[host].ssl_sha512;
}
