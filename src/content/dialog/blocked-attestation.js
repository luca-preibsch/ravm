import './style.css';
import '../../style/button.css'

import {getHostInfo, types} from "../../lib/messaging";
import * as storage from "../../lib/storage";

const titleText = document.getElementById("title");
const domainText = document.getElementById("domain");
const descriptionText = document.getElementById("description");

const unblockButton = document.getElementById("unblock-button");

let hostInfo;

unblockButton.addEventListener("click", async () => {
    await storage.removeHost(hostInfo.host);
    browser.runtime.sendMessage({
        type : types.redirect,
        url : hostInfo.url
    });
});

window.addEventListener("load", async () => {
    hostInfo = await getHostInfo();
    domainText.innerText = hostInfo.host;
});
