import './style.css';
import '../../style/button.css';

import {types} from '../../lib/messaging';
import * as storage from '../../lib/storage';
import {arrayBufferToHex} from "../../lib/util";
import {getHostInfo} from "../../lib/messaging";
import {checkHost, getReport} from "./dialog";
import {getMeasurementFromRepo} from "../../lib/net";

const titleText = document.getElementById("title");
const domainText = document.getElementById("domain");
const descriptionText = document.getElementById("description");
const measurementText = document.getElementById("measurement");
const measurementRepoText = document.getElementById("measurement-repo");

const ignoreButton = document.getElementById("ignore-button");
const noTrustButton = document.getElementById("do-not-trust-button");
const trustMeasurementButton = document.getElementById("trust-measurement-button");
const trustRepoButton = document.getElementById("trust-repo-button");

let ar;
let hostInfo;

ignoreButton.addEventListener("click", async () => {
    await storage.setIgnore(hostInfo.host, true);
    browser.runtime.sendMessage({
        type : types.redirect,
        url : hostInfo.url
    });
});

trustMeasurementButton.addEventListener("click", async () => {
    await storage.newTrusted(
        hostInfo.host, new Date(), new Date(), hostInfo.attestationInfo.technology, ar.arrayBuffer, hostInfo.ssl_sha512);
    browser.runtime.sendMessage({
        type : types.redirect,
        url : hostInfo.url
    });
});

trustRepoButton.addEventListener("click", async () => {
    await storage.newTrusted(
        hostInfo.host, new Date(), new Date(), hostInfo.attestationInfo.technology, ar.arrayBuffer, hostInfo.ssl_sha512);
    await storage.setTrustedMeasurementRepo(hostInfo.host, hostInfo.attestationInfo.measurement_repo);
    browser.runtime.sendMessage({
        type : types.redirect,
        url : hostInfo.url
    });
});

noTrustButton.addEventListener("click", async () => {
    await storage.setUntrusted(hostInfo.host, true);
    browser.runtime.sendMessage({
        type : types.redirect,
        url : hostInfo.url
    });
});

window.addEventListener("load", async () => {
    hostInfo = await getHostInfo();
    let measurement;

    // init UI
    domainText.innerText = hostInfo.host;

    console.log("repo: " + hostInfo.attestationInfo.measurement_repo);

    // check if the host supplies a measurement repo
    if (hostInfo.attestationInfo.measurement_repo) {
        measurement = await getMeasurementFromRepo(hostInfo.attestationInfo.measurement_repo, hostInfo.attestationInfo.version);
        console.log(measurement);
    }

    ar = await getReport(hostInfo);
    if (ar && (await checkHost(hostInfo, ar))) {
        if (measurement && arrayBufferToHex(ar.measurement) === measurement) {
            // this host supplies a measurement using a measurement repo
            // 4. Trust the measurement-repo?
            descriptionText.innerHTML = "This host offers remote attestation using a measurement repository. " +
                "Do you want to trust this measurement repository and thus all the measurements it contains?<br><br>" +
                "This means, the owner can update the measurement repository in case of a host update, and you "+
                "won't have to trust the updated host's measurement again.<br><br>"+
                "You can also just trust the measurement.";
            measurementRepoText.setAttribute("href", hostInfo.attestationInfo.measurement_repo);
            measurementRepoText.innerText = hostInfo.attestationInfo.measurement_repo;
            measurementText.innerText = arrayBufferToHex(ar.measurement);
            [ignoreButton, noTrustButton, trustMeasurementButton, trustRepoButton, measurementRepoText.parentNode, measurementText.parentNode]
                .forEach((button) => button.classList.remove("invisible"));
        } else {
            // 4. Trust the measurement? wait for user input
            descriptionText.innerText = "This host offers remote attestation, do you want to trust it?";
            measurementText.innerText = arrayBufferToHex(ar.measurement);
            [ignoreButton, noTrustButton, trustMeasurementButton, measurementText.parentNode].forEach((button) =>
                button.classList.remove("invisible"));
        }
    } else {
        titleText.innerText = "Attestation FAILED";
        descriptionText.innerText = "ERROR";
    }
});
