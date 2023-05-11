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
const authorKeyText = document.getElementById("author-key");

const ignoreButton = document.getElementById("ignore-button");
const noTrustButton = document.getElementById("do-not-trust-button");
const trustMeasurementButton = document.getElementById("trust-measurement-button");
const trustRepoButton = document.getElementById("trust-repo-button");
const trustAuthorKeyButton = document.getElementById("trust-author-key-button");

let hostInfo;
let ar;

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
    await storage.setMeasurementRepo(hostInfo.host, hostInfo.attestationInfo.measurement_repo);
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

    // check if the host supplies a measurement repo
    if (hostInfo.attestationInfo.measurement_repo) {
        measurement = await getMeasurementFromRepo(hostInfo.attestationInfo.measurement_repo, hostInfo.attestationInfo.version);
        console.log(measurement);
    }

    ar = await getReport(hostInfo);
    if (ar && (await checkHost(hostInfo, ar))) {
        let makeVisible = [];

        // 4. Trust the measurement? wait for user input
        measurementText.innerText = arrayBufferToHex(ar.measurement);
        descriptionText.innerHTML =
            "This host offers remote attestation, do you want to trust it?<br>" +
            "<i>You may trust its measurement.</i>";
        makeVisible.push(ignoreButton, noTrustButton, trustMeasurementButton, measurementText.parentNode);

        if (ar.author_key_en) {
            // this host supplies an author key
            // 4. Trust the author key?
            // TODO
            descriptionText.innerText +=
                "<br><br>This host also offers an author key.<br>" +
                "<i>You may trust the author key.</i><br>" +
                "Consequences: You trust all hosts signed by the same author key.";
            // authorKeyText.innerText = "";
            makeVisible.push(trustAuthorKeyButton, authorKeyText.parentNode);
        } else if (measurement && arrayBufferToHex(ar.measurement) === measurement) {
            // this host supplies a measurement using a measurement repo
            descriptionText.innerHTML +=
                "<br><br>This host also offers a measurement repository.<br>" +
                "<i>You may trust the repository.</i><br>" +
                "Consequences: You trust all measurement the repository contains.";
            measurementRepoText.setAttribute("href", hostInfo.attestationInfo.measurement_repo);
            measurementRepoText.innerText = hostInfo.attestationInfo.measurement_repo;
            makeVisible.push(trustRepoButton, measurementRepoText.parentNode);
        }

        makeVisible.forEach(el => el.classList.remove("invisible"));
    } else {
        titleText.innerText = "Warning: Attestation Failed";
        descriptionText.innerText = "This host offers remote attestation, but the hosts implementation is broken! " +
            "You may ignore this host, but this could very well be a malicious attack.";
        ignoreButton.classList.remove("invisible");
    }
});
