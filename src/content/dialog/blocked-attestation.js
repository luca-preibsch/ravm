import '../../style/button.css'

import {getHostInfo, types} from "../../lib/messaging";
import * as storage from "../../lib/storage";

const titleText = document.getElementById("title");
const domainText = document.getElementById("domain");
const descriptionText = document.getElementById("description");

const unblockButton = document.getElementById("unblock-button");

unblockButton.addEventListener("click", async () => {
    const hostInfo = await getHostInfo();
    await storage.removeUntrusted(hostInfo.host);
    browser.runtime.sendMessage({
        type : types.redirect,
        url : hostInfo.url
    });
});
