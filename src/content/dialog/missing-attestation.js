import './style.css';
import '../../style/button.css';

import {getHostInfo, types} from "../../lib/messaging";
import * as storage from "../../lib/storage";

const domainText = document.getElementById("domain");
const removeButton = document.getElementById("remove-record-button");

let hostInfo;

removeButton.addEventListener("click", async () => {
    await storage.removeHost(hostInfo.host);
    browser.runtime.sendMessage({
        type : types.redirect,
        url : hostInfo.url
    });
});

window.addEventListener("load", async () => {
    hostInfo = await getHostInfo();
    domainText.innerText = hostInfo.host;

    removeButton.classList.remove("invisible");
});
