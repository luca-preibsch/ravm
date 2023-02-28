import './style.css'
import '../../../style/button.css'
import './trust-dialogue.html'

export function showDialogue() {
  let createData = {
    type: "detached_panel",
    url: "./trust-dialogue.html",
    width: 250,
    height: 100
  }
  browser.windows.create(createData)
}

// called when the dialogue window is loaded
window.onload = function() {
  document.getElementById("ignore-button").onclick = function () { console.log("ja man lets goooooo") }
}

