// import './style.css'
// import '../style/button.css'
// const html = 'HALLO OOOOOOOOO<dialog class="modal" id="modal"><h2>An interesting title</h2><p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Rerum esse nisi, laboriosam illum temporibus ipsam?</p><p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Atque, quo.</p><button class="button close-button">close modal</button><form class="form" method="dialog"><label>Your name <input type="text"></label><label>Your email <input type="email"></label><button class="button" type="submit">submit form</button></form></dialog><script src="./trust-dialogue.js"></script>'
import html from "./trust-dialog.html"
import "../../style/button.css"

// const descriptionText = document.getElementById("description")
// const ignoreButton = document.getElementById("ignore-button")
// const noTrustButton = document.getElementById("do-not-trust-button")
// const trustButton = document.getElementById("trust-button")

// ignoreButton.onclick = function () { console.log("ja man lets goooooo") }

console.log("hallo du schlingel!")
const body = document.getElementsByTagName('body')[0]
body.innerHTML = body.innerHTML + html

const modal = document.querySelector("#modal");
const openModal = document.querySelector(".open-button");
const closeModal = document.querySelector(".close-button");

// openModal.addEventListener("click", () => {
  modal.showModal();
// });

closeModal.addEventListener("click", () => {
  modal.close();
});
