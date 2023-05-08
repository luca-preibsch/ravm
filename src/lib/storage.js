import {AttesationReport} from "./attestation";
import {isEmpty} from "lodash";

/**
 * structure of the storage:
 * key------------------|-value-------------------------------|-comment-----------------------------
 * <url>                | data about the host behind the url  | the url has to be a qualified url like https://example.com
 * author_keys          | an array of author keys             | -
 * measurement_repos    | an array of url pointing to         | -
 *                      | measurement repos                   |
 */

const AUTHOR_KEYS = "author_keys";
const MEASUREMENT_REPOS = "measurement_repos";

async function getContentsOfObj(request){
    const item = await browser.storage.local.get(request);
    if (isEmpty(item))
        return {};
    else
        return item[request];
}

async function getContentsOfArr(request){
    const item = await browser.storage.local.get(request);
    if (isEmpty(item))
        return [];
    else
        return item[request];
}

async function setProperties(key, value) {
    const old = await getContentsOfObj(key);
    return browser.storage.local.set({
        [key] : {...old, ...value} // the latter overwrites the former
    });
}

async function addToArray(key, value) {
    const old = await getContentsOfArr(key);
    if (!old.includes(value)) {
        return browser.storage.local.set({
            [key] : [...old, value] // the latter overwrites the former
        });
    }
}

async function getProperty(key, prop) {
    const hosts = await browser.storage.local.get(key);
    return Object.keys(hosts).length !== 0 && hosts[key][prop];
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
    return getProperty(host, "trusted");
}

export async function getTrusted() {
    const hosts = await getHost();
    return Object.fromEntries(Object.entries(hosts).filter(([, val]) => val.trusted));
}

// returns all stored information about one host or about all hosts if host is left blank
export function getHost(host) {
    if (host) {
        return getContentsOfObj(host)
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
    return getProperty(host, "blocked");
}

export async function isKnownHost(host) {
    return await isTrusted(host) || await isUntrusted(host) || await isIgnored(host);
}

export async function setReportURL(host, url) {
    return setProperties(host, {reportURL: url});
}

// TODO rewrite with better performance?
export async function isReportURL(url) {
    let hosts = await browser.storage.local.get(null);
    return Object.values(hosts).map(h => h.reportURL).includes(url);
}

export async function setIgnore(host, ignore) {
    return setProperties(host, {ignore: ignore});
}

export async function isIgnored(host) {
    return getProperty(host, "ignore");
}

export async function setUnsupported(host, unsupported) {
    return setProperties(host, {unsupported: unsupported});
}

export async function isUnsupported(host) {
    return getProperty(host, "unsupported");
}

export async function setSSLKey(host, ssl_sha512) {
    return setProperties(host, {ssl_sha512: ssl_sha512});
}

export async function getSSLKey(host) {
    return getProperty(host, "ssl_sha512");
}

export async function setTrustedMeasurementRepo(host, url) {
    return setProperties(host, {trusted_measurement_repo: url});
}

export async function getTrustedMeasurementRepo(host) {
    return getProperty(host, "trusted_measurement_repo");
}

export async function getAttestationReport(host) {
    const ar_arrayBuffer = getProperty(host, "ar_arrayBuffer");
    return new AttesationReport(ar_arrayBuffer);
}

export async function containsAuthorKey(authorKey) {
    const old = await getContentsOfArr(AUTHOR_KEYS);
    return old.includes(authorKey);
}

export async function addAuthorKey(authorKey) {
    return addToArray(AUTHOR_KEYS, authorKey);
}

export async function removeAuthorKey(authorKey) {
    const old = await getContentsOfArr(AUTHOR_KEYS);
    const index = old.indexOf(authorKey);
    if (index > -1)
        old.splice(index, 1);
    return browser.storage.local.set({[AUTHOR_KEYS] : old});
}
