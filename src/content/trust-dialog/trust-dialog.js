import './style.css'
// TODO: unique ids for html elements (html-loader preprocessor?)
import html from "./trust-dialog.html"
import "../../style/button.css"

console.log("still here!")

const config = param

const body = document.getElementsByTagName('body')[0]
body.innerHTML = body.innerHTML + html

// html injected

const titleText = document.getElementById("title")
const domainText = document.getElementById("domain")
const descriptionText = document.getElementById("description")
const ignoreButton = document.getElementById("ignore-button")
const noTrustButton = document.getElementById("do-not-trust-button")
const trustButton = document.getElementById("trust-button")
const modal = document.querySelector("#modal")

titleText.innerHTML = config.title
domainText.innerHTML = config.domain
descriptionText.innerHTML = config.description

if (!modal.open)
  modal.showModal()

ignoreButton.addEventListener("click", () => {
  modal.close()
})

trustButton.addEventListener("click",  () => {
  browser.runtime.sendMessage({
    url: document.location.href
  })
  modal.close()
})

noTrustButton.addEventListener("click", () => {
  // TODO: safe pages that are not trusted and do not trust in the future
  body.innerHTML = "Site is deemed unsafe!"
})
