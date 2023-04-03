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
        case DialogType.newHost:
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
        case DialogType.blockedHost:
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
    newHost: 0,
    measurementDiffers: 1,
    blockedHost: 2
}

function injectDialog(title, description, domain, type, tabId) {
    console.log("injecting into tab " + tabId)

    const args = {
        title: title,
        description: description,
        domain: domain,
        type: type,
    }

    // works on first load
    // browser.tabs.executeScript(tabId, {
    //     code: 'const param = ' + JSON.stringify(args),
    // }).then(() => {
    //     browser.tabs.executeScript(tabId, {
    //         file: "./trust-dialog.js",
    //     }).catch((e) => {
    //         console.log("Error while injecting JavaScript: " + e)
    //     })
    // }, (e) => {
    //     console.log("Error while injecting param: " + e)
    // })

    // works on first load
    browser.scripting.executeScript({
        target: { tabId: tabId },
        files: [ "./trust-dialog.js" ],
    }).then(() => {
        browser.tabs.sendMessage(tabId, args)
    }, console.log).catch(console.log)

    // Manifest v3 tests:

    // browser.scripting.executeScript({
    //     target: { tabId: tabId },
    //     args: [{title, description, domain, type}],
    //     func: vars => {
    //         Object.assign(self, vars)
    //         return undefined
    //     },
    // }).then(() => {
    //     browser.scripting.executeScript({
    //         target: { tabId: tabId },
    //         files: [ "./trust-dialog.js" ]
    //     }).catch((e) => {
    //         console.log("Error while injecting JavaScript: " + e)
    //     })
    // }, (e) => {
    //     console.log("Error while injecting param: " + e)
    // })
    //
    // browser.scripting.executeScript({
    //     target: { tabId: tabId },
    //     files: ["./trust-dialog.js"],
    // }).then(() => {
    //     console.log("we are here!")
    //     browser.scripting.executeScript({
    //         target: { tabId: tabId },
    //         args: [title, description, domain, type],
    //         func: (...args) => self.dialog(...args),
    //     }).catch((e) => {
    //         console.log("Error while executing dialog: " + e)
    //     })
    //     console.log("now here")
    // }, (e) => {
    //     console.log("Error while injecting JavaScript: " + e)
    // })

    // browser.scripting.executeScript({
    //     target: { tabId: tabId },
    //     args: [title, description, domain, type],
    //     func: (title, description, domain, type) => {
    //         console.log("Hallo!")
    //         console.log(html)
    //         // import './style.css'
    //         // import html from "../content/trust-dialog/trust-dialog.html"
    //         // import "../../style/button.css"
    //
    //         const body = document.getElementsByTagName('body')[0]
    //         body.innerHTML = body.innerHTML + html
    //
    //         const titleText = document.getElementById("title")
    //         const domainText = document.getElementById("domain")
    //         const descriptionText = document.getElementById("description")
    //         const ignoreButton = document.getElementById("ignore-button")
    //         const noTrustButton = document.getElementById("do-not-trust-button")
    //         const trustButton = document.getElementById("trust-button")
    //         const modal = document.querySelector("#modal")
    //
    //         titleText.innerHTML = title
    //         domainText.innerHTML = domain
    //         descriptionText.innerHTML = description
    //
    //         if (!modal.open)
    //             modal.showModal()
    //
    //         ignoreButton.addEventListener("click", () => {
    //             modal.close()
    //         })
    //
    //         trustButton.addEventListener("click",  () => {
    //             browser.runtime.sendMessage({
    //                 url: document.location.href
    //             })
    //             modal.close()
    //         })
    //
    //         noTrustButton.addEventListener("click", () => {
    //             // TODO: safe pages that are not trusted and do not trust in the future
    //             body.innerHTML = "Site is deemed unsafe!"
    //         })
    //     }
    // })

}
