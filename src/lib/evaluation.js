export function pmark(name, webRequestDetails) {
    performance.mark(name, {detail: {
            url: webRequestDetails.url,
            requestId: webRequestDetails.requestId
        }});
}
