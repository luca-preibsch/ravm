import './style.css';
import '../../style/button.css'

import {getHostInfo, types} from "../../lib/messaging";
import * as storage from "../../lib/storage";


window.addEventListener("load", async () => {
    // constants:
    const domainText = document.getElementById("domain");
    const unblockButton = document.getElementById("unblock-button");

    // global variables:
    let hostInfo = await getHostInfo();

    // listeners:
    unblockButton.addEventListener("click", async () => {
        await storage.removeHost(hostInfo.host);
        browser.runtime.sendMessage({
            type : types.redirect,
            url : hostInfo.url
        });
    });

    domainText.innerText = hostInfo.host;
});
