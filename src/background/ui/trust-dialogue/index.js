import './style.css'
import '../../../style/button.css'

export function showDialogue() {
    let createData = {
        type: "detached_panel",
        url: "./index.html",
        width: 250,
        height: 100
      }
      let creating = browser.windows.create(createData)
}
