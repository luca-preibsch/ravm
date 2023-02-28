
export function showTrustDialogue() {
    let createData = {
        type: "detached_panel",
        url: "./trust-dialogue.html",
        width: 250,
        height: 100
    }
    browser.windows.create(createData)
}
