import './style.css'
// TODO: unique ids for html elements (html-loader preprocessor?)
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
const modal = document.querySelector("#modal")

modal.showModal()

ignoreButton.addEventListener("click", () => {
  modal.close()
})

trustButton.addEventListener("click",  () => {
  console.log("sending message to background from: " + document.location.href)
  browser.runtime.sendMessage({
    url: document.location.href
  })
  modal.close()
})

noTrustButton.addEventListener("click", () => {
  // TODO: safe pages that are not trusted and do not trust in the futute
  body.innerHTML = "Site is deemed unsafe!"
})
