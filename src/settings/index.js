import './style.css'
import '../style/table.css'

const tableWidth = document.getElementById("tableHead").rows[0].cells.length
const table = document.getElementById("tableBody")
let counter = 0

/*
for (let i = 0; i < 10; i++) {
    let row = table.insertRow()
    for (let j = 0; j < tableWidth; j++) {
        let cell = row.insertCell()
        cell.innerHTML = i.toString() + j.toString()
    }
}
*/

loadAllItems();
document.getElementById("testButton").onclick = function () { saveItem(counter++ + "example.com", new Date(), new Date(), "AMD-SEV", "xxx") }

function loadAllItems() {
    table.innerHTML = ""
    browser.storage.local.get(null).then((items) => {
        let domains = Object.keys(items)
        for (let domain of domains) {
            let row = table.insertRow()
            let data = items[domain]
            row.insertCell().innerHTML = domain
            row.insertCell().innerHTML = new Date(data.trustedSince).toString()
            row.insertCell().innerHTML = new Date(data.lastTrusted).toString()
            row.insertCell().innerHTML = data.type
        }
    },
    (reason) => { 
        console.log("error while loading options")
    })
    console.log("load")
}

function saveItem(domain, trustedSince, lastTrusted, type, measurement) {
    browser.storage.local.set({
        [domain] : {
            "trustedSince" : trustedSince.toJSON(),
            "lastTrusted" : lastTrusted.toJSON(),
            "type" : type,
            "measurement" : measurement,
        }
    })
    console.log("save")
    loadAllItems()
}
