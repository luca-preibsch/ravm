import './style.css';
import '../../style/button.css';

import {getHostInfo, types} from "../../lib/messaging";
import * as storage from "../../lib/storage";
import {arrayBufferToHex} from "../../lib/util";
import {checkHost, getReport} from "./dialog";
import {AttesationReport} from "../../lib/attestation";
import {getMeasurementFromRepo} from "../../lib/net";

const titleText = document.getElementById("title");
const domainText = document.getElementById("domain");
const descriptionText = document.getElementById("description");
const oldMeasurementText = document.getElementById("old-measurement");
const newMeasurementText = document.getElementById("new-measurement");
const measurementRepoText = document.getElementById("measurement-repo");

const noTrustButton = document.getElementById("do-not-trust-button");
const trustMeasurementButton = document.getElementById("trust-measurement-button");
const trustRepoButton = document.getElementById("trust-repo-button");

let hostInfo;
let ar;

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
    await storage.removeHost(hostInfo.host);
    await storage.setUntrusted(hostInfo.host, true);
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
    if (ar && await checkHost(hostInfo, ar)) {
        // TODO: rewrite this to auto generate the page depending on the combination of author key + repo + measurement

        // attestation of the new measurement was successful
        let description = "This host has previously been trusted, but the measurement has since changed. " +
            "Do you want to trust the new measurement? " +
            "This could be a malicious attack. ";
        newMeasurementText.innerText = arrayBufferToHex(ar.measurement);
        oldMeasurementText.innerText = arrayBufferToHex(new AttesationReport((await storage.getHost(hostInfo.host)).ar_arrayBuffer).measurement);
        [noTrustButton, trustMeasurementButton, newMeasurementText.parentNode, oldMeasurementText.parentNode]
            .forEach((button) => button.classList.remove("invisible"));

        // additionally to the changed measurement, the host now may supply a repo or the user did not trust the given
        // repo, yet.
        if (measurement && arrayBufferToHex(ar.measurement) === measurement) {
            description = "This host has previously been trusted, but the measurement has since changed. " +
                "Additionaly, this host offers remote attestation using a measurement repository. " +
                "Do you want to trust this measurement repository and thus all the measurements it contains?<br><br>" +
                "This means, the owner can update the measurement repository in case of a host update, and you "+
                "won't have to trust the updated host's measurement again.<br><br>"+
                "You can also just trust the measurement.";
            measurementRepoText.setAttribute("href", hostInfo.attestationInfo.measurement_repo);
            measurementRepoText.innerText = hostInfo.attestationInfo.measurement_repo;
            [measurementRepoText.parentNode, trustRepoButton]
                .forEach((button) => button.classList.remove("invisible"));
        }

        descriptionText.innerHTML = description;
    } else {
        titleText.innerText = "Warning: Attestation Failed";
        descriptionText.innerText = "This host offers remote attestation, but the hosts implementation is broken! " +
            "You may ignore this host, but this could very well be a malicious attack.";
        ignoreButton.classList.remove("invisible");
    }
});
