import './style.css'
import '../style/table.css'

import * as storage from '../lib/storage'

const tableWidth = document.getElementById("tableHead").rows[0].cells.length
const table = document.getElementById("tableBody")
let counter = 0

loadAllItems();
document.getElementById("testButton").onclick = function () { saveItem(counter++ + "example.com", new Date(), new Date(), "AMD-SEV", "xxx") }

function loadAllItems() {
    table.innerHTML = ""
    storage.getTrusted().then((items) => {

        let domains = Object.keys(items)
        for (let domain of domains) {
            let row = table.insertRow()
            let data = items[domain]
            row.insertCell().innerHTML = domain
            row.insertCell().innerHTML = data.trustedSince.toString()
            row.insertCell().innerHTML = data.lastTrusted.toString()
            row.insertCell().innerHTML = data.type
        }
        
    },
    (reason) => { 
        console.log("error while loading options")
    })
    console.log("load")
}

function saveItem(domain, trustedSince, lastTrusted, type, measurement) {
    storage.setTrusted(domain, trustedSince, lastTrusted, type, measurement)
    console.log("save")
    loadAllItems()
}
