/**
 * @param {string} name
 * @param {Object} webRequestDetails
 */
export function pmark(name, webRequestDetails) {
    return performance.mark(name + webRequestDetails.requestId, {
        detail: {
            name: name,
            url: webRequestDetails.url,
            requestId: webRequestDetails.requestId
        }
    });
}

/**
 * @param {string} name
 * @param {string} startMark
 * @param {Object} webRequestDetails
 * @param {string} [endMark]
 */
export function pmeasure(name, startMark, webRequestDetails, endMark) {
    let options = {
        start: startMark + webRequestDetails.requestId,
        detail: {
            name: name,
            url: webRequestDetails.url,
            requestId: webRequestDetails.requestId
        }
    };
    if (endMark)
        options =
            {
                ...options,
                end: endMark + webRequestDetails.requestId,
            };
    return performance.measure(name + webRequestDetails.requestId, options);
}
