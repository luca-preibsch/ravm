
export function showTrustDialogue() {
    let createData = {
        type: "detached_panel",
        url: "./trust-dialogue.html",
        width: 250,
        height: 100
    }
    browser.windows.create(createData)
}

// TODO Texte überarbeiten
export function showDialog(type, domain, tabId) {
    switch (type) {
        case DialogType.newDomain:
            injectDialog(
                "Remote Attestation",
                "This site offers remote attestation, do you want to trust it?",
                domain,
                type,
                tabId
            )
            break
        case DialogType.measurementDiffers:
            injectDialog(
                "WARNING: Remote Attestation",
                "You recently trusted this website, but the remote attestation measurement changed!",
                domain,
                type,
                tabId
            )
            break
        case DialogType.siteBlocked:
            injectDialog(
                "BLOCKED: Remote Attestation",
                "You blocked this website!",
                domain,
                type,
                tabId
            )
            break
    }
}

export const DialogType = {
    newDomain: 0,
    measurementDiffers: 1,
    siteBlocked: 2
}

function injectDialog(title, description, domain, type, tabId) {
    const param = {
        title: title,
        description: description,
        domain: domain,
        type: type,
    }
    // TODO: be sure to use the correct tab; if the user switches tabs during the attestation, the injection might happen
    // inside the wrong tab
    browser.tabs.executeScript(tabId, {
        code: 'const param = ' + JSON.stringify(param)
    }, function () {
        browser.tabs.executeScript(tabId, {
            file: "./trust-dialog.js"
        })
    })
}
