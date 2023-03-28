import './style.css'
// TODO: unique ids for html elements (html-loader preprocessor?)
import html from "./trust-dialog.html"
import "../../style/button.css"

(function () {
  if (window.hasRun) {
    console.log("has run")
    return;
  }
  window.hasRun = true;

  console.log("fresh run")

  browser.runtime.onMessage.addListener((m) => {
    console.log("Nachricht erhalten! " + m)

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

    ignoreButton.addEventListener("click", () => {
      modal.close()
    })

    trustButton.addEventListener("click",  () => {
      browser.runtime.sendMessage({
        trust: true,
        url: document.location.href
      })
      modal.close()
    })

    noTrustButton.addEventListener("click", () => {
      modal.close()
      body.innerHTML = "Site is deemed unsafe!"
      browser.runtime.sendMessage({
        trust: false,
        url: document.location.href
      })
    })

    titleText.innerHTML = m.title
    domainText.innerHTML = m.domain
    descriptionText.innerHTML = m.description

    if (!modal.open)
      modal.showModal()
  })
})()
