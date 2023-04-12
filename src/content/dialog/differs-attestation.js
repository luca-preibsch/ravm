import './style.css';
import '../../style/button.css'

import {getHostInfo, types} from "../../lib/messaging";
import * as storage from "../../lib/storage";

const domainText = document.getElementById("domain");
const oldMeasurementText = document.getElementById("old-measurement");
const newMeasurementText = document.getElementById("new-measurement");

const noTrustButton = document.getElementById("do-not-trust-button");
const trustButton = document.getElementById("trust-button");

let hostInfo;

noTrustButton.addEventListener("click", async () => {
   await storage.setUntrusted(hostInfo.host);
    browser.runtime.sendMessage({
        type : types.redirect,
        url : hostInfo.url
    });
});

window.addEventListener("load", async () => {
    hostInfo = getHostInfo();
    domainText.innerText = hostInfo.host;
});
