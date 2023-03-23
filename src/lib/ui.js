
export function showTrustDialogue() {
    let createData = {
        type: "detached_panel",
        url: "./trust-dialogue.html",
        width: 250,
        height: 100
    }
    browser.windows.create(createData)
}

export function injectDialog() {
    // TODO: be sure to use the correct tab; if the user switches tabs during the attestation, the injection might happen
    // inside the wring tab
    browser.tabs.executeScript({
        file: "./trust-dialog.js"
    })
}
