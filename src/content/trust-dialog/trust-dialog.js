import './style.css'
import html from "./trust-dialog.html"
import "../../style/button.css"

console.log("hallo du schlingel!")
const body = document.getElementsByTagName('body')[0]
body.innerHTML = body.innerHTML + html

// html injected

const descriptionText = document.getElementById("description")
const ignoreButton = document.getElementById("ignore-button")
const noTrustButton = document.getElementById("do-not-trust-button")
const trustButton = document.getElementById("trust-button")
const modal = document.querySelector("#modal");

modal.showModal();

ignoreButton.addEventListener("click", () => {
  modal.close();
});
