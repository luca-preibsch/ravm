import './style.css'
import '../../style/button.css'

import { types } from '../../lib/messaging'

window.addEventListener("load", async () => {
    const domainText = document.getElementById("domain")

    browser.runtime.sendMessage({
        type : types.getHost
    }).then((response) => {
        console.log("response received")
        domainText.innerHTML = response.host
    }, console.log)
})
