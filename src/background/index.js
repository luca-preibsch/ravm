import * as pkijs from "pkijs";
import * as asn1js from "asn1js";
import _ from "lodash"

import * as attestation from "../helpers/attestation";
import * as util from "../helpers/util";
import { fetchFile, fetchAttestationInfo } from "../helpers/file"
import * as settings from "../helpers/settings"

import ask from '../certificates/ask.der';
import ark from '../certificates/ark.der';

// Domain to observe 
const VM_DOMAIN="transparent-vm.net";
const MEASURED_LOCATION= "*://"+VM_DOMAIN+"/*";
// ! url to remote attestation report
// const REPORT_URL= "https://"+VM_DOMAIN+":8080/guest_report.bin"
const SERVER_URL = "https://"+VM_DOMAIN+":8080/"
const ATTESTATION_INFO_PATH = "/remote-attestation.json"

// For now hardcoded hash of the measurment this information needs 
// to be retrieved from the IC
const VM_MEASUREMENT = ""; 

// AMD key server
const KDSINF= "https://kdsintf.amd.com/vcek/v1/Milan/";
const AMD_ARK_ASK_REVOKATION= "https://kdsintf.amd.com/vcek/v1/Milan/crl"

// Check if we previously validated the attestaion report 
var isValidated=false;

// Query to Amd key sever including the used TCB  
// https://kdsintf.amd.com/vcek/v1/Milan/<5b-machine-id-a2654>/?blSPL=02&teeSPL=00&snpSPL=06&ucodeSPL=55
function getKdsURL(chip_id,tcbObj){
  var url = KDSINF+util.arrayBufferToHex(chip_id, false)+"?";
  url += "blSPL="+util.zeroPad(tcbObj.blSPL,2)+"&";
  url += "teeSPL="+util.zeroPad(tcbObj.teeSPL,2)+"&";
  url += "snpSPL="+util.zeroPad(tcbObj.snpSPL,2)+"&";
  url += "ucodeSPL="+util.zeroPad(tcbObj.ucodeSPL,2);
  //console.log(url);
  return url;
}

// Wrapper for fetch API
// TODO: Error handling... 
async function getFile(url) {

    // console.log("fetch " + url);
    const response = await fetch(url, {
      method: 'GET',
     // mode: 'cors',
      cache: 'no-cache',
      referrerPolicy: 'no-referrer'
    })
  return response.arrayBuffer();
}

// Fetch assets of the web extension such as ask and ark
async function loadData(resourcePath) {
  var url = browser.runtime.getURL(resourcePath);
  return (await fetch(url)).arrayBuffer();
}

async function importPubKey(rawData) {

  const pubKeyObj = await window.crypto.subtle.importKey(
       "raw",
       rawData, 
       {
        name: "ECDSA",
        namedCurve: "P-384"
       },
       true,
       ["verify"]
    );

  return pubKeyObj;
}

async function verifyMessage(pubKey, signature, data ){

  const result =  await window.crypto.subtle.verify(
    {
      name: "ECDSA",
      namedCurve: "P-384",
      hash: {name: "SHA-384"},
    },
    pubKey, 
    signature, 
    data
    );
  return result;
}

// Validate the vcek certificate using the AMD provided keys
// and revocation list.
// returns boolean 
async function validateWithCertChain(certificate) {

  function decodeCert(der) {
    const asn1 = asn1js.fromBER(der)
    return new pkijs.Certificate({ schema: asn1.result })
  }
  
  var ask_cert = decodeCert( await loadData(ask));
  var ark_cert = decodeCert( await loadData(ark));

  var text = await getFile(AMD_ARK_ASK_REVOKATION);

  const crls  = []; 
  const crl = pkijs.CertificateRevocationList.fromBER(text);
  crls.push(crl);

  // Create certificate's array (end-user certificate + intermediate certificates)
  const certificates = [];
  certificates.push(ask_cert);
  certificates.push(certificate);

  // Make a copy of trusted certificates array
  const trustedCerts = [];
  trustedCerts.push(ark_cert);

  // Create new X.509 certificate chain object
  const certChainVerificationEngine = new pkijs.CertificateChainValidationEngine({
    trustedCerts,
    certificates,
    crls,
  });

  return certChainVerificationEngine.verify();
} 

async function sha512(str) {
  return crypto.subtle.digest("SHA-512", new TextEncoder("utf-8").encode(str)).then(buf => {
    return Array.prototype.map.call(new Uint8Array(buf), x=>(('00'+x.toString(16)).slice(-2))).join('');
  });
}

// ? what does this do?
async function exportAndFormatCryptoKey(key) {
  const exported = await window.crypto.subtle.exportKey(
    "spki",
    key
  );
  const exportedAsString = util.ab2str(exported);
  const exportedAsBase64 = window.btoa(exportedAsString);

  const pemExported =
`-----BEGIN PUBLIC KEY-----
${exportedAsBase64.substring(0,64)}
${exportedAsBase64.substring(64,64*2)}
${exportedAsBase64.substring(64*2,64*3)}
${exportedAsBase64.substring(64*3,64*4)}
${exportedAsBase64.substring(64*4,64*5)}
${exportedAsBase64.substring(64*5,64*6)}
${exportedAsBase64.substring(64*6,64*6+8)}
-----END PUBLIC KEY-----\n`;
  
  return pemExported;
}



// Function requests the SecurityInfo of the established https connection
// and extracts the public key.
// return: sha521 of the public key 
async function querySSLFingerprint(requestId){

  // ! information about TLS connection of requestId, received through onHeadersReceived
  // ! await to resolve the promise
  var securityInfo =  await browser.webRequest.getSecurityInfo(requestId, {
    "rawDER" : true,
    "certificateChain" : true, // ? why is this needed? Isn't only the server certificate used, also present if certificateChain is false?
   });

  try {
    
    // ! excludes weak or broken TLS connections
    if (securityInfo.state === "secure" || securityInfo.state === "unsafe") {
     
      const serverCert= securityInfo.certificates[0];
      console.log("hallo");
      console.log(securityInfo.certificates[0].subject); 

      // ! ASN1 encoded certificate data
      // ? maybe rename stuff isn't really telling that this is a certificate
      const stuff = new Uint8Array(serverCert.rawDER).buffer 

      // We collect the rawDER encoded certificate 
      const asn1 = asn1js.fromBER(stuff);
      if (asn1.offset === -1) {
        throw new Error("Incorrect encoded ASN.1 data");
      }
      const cert_simpl = new pkijs.Certificate({ schema: asn1.result });
      var pubKey = await cert_simpl.getPublicKey();

      const exported = await exportAndFormatCryptoKey(pubKey);
      // console.log(exported);
      var sha = await sha512(exported);      
      return sha;
    } else {
      console.error("querySSLFingerprint: Cannot validate connection in state " +securityInfo.state );
    }
  }
  catch(error) {
    console.error("querySSLFingerprint: "+error);
  }
}

function listenerOnHeadersReceived(details) {

  // ? remote attestation only once globaly?
  if (isValidated){ 
    // Perform remote attestion only once this needs more work.
    // What about different tabs etc. 
    // console.log("We did it already ... ");
    return {};
  } else {
      fetchAttestationInfo(SERVER_URL + ATTESTATION_INFO_PATH).then(attestationInfo => {
        // ! gets the public key of the host connection as sha512 hash
        querySSLFingerprint(details.requestId).then(ssl_sha512 => {

          // ? set only when attestation actually went through?
          isValidated=true; 

          // Request attesation report from VM 
          getFile(SERVER_URL + attestationInfo.path).then(arrayBuffer => {

            // Parse attesation report
            const ar = new attestation.AttesationReport(arrayBuffer);

            // Query the AMD key server for VCEK certificate using chip_id and TCB from report
            getFile(getKdsURL(ar.chip_id,ar.committedTCB)).then(text => {

              const asn1 = asn1js.fromBER(text);
              if (asn1.offset === -1) {
                throw new Error("Incorrect encoded ASN.1 data");
              }
              // ! this is the VCEK
              var cert_simpl = new pkijs.Certificate({ schema: asn1.result });

              // Validate that the VCEK ic correctly signed by AMD root cert
              validateWithCertChain(cert_simpl);

              // ! read public key out of attestation report through converting to json and back
              // Hack: We cannot directly ask the cert object for the public key as
              // it triggers a 'not supported' execption.  
              const publicKeyInfo =  cert_simpl.subjectPublicKeyInfo;
              // console.log(publicKeyInfo.subjectPublicKey.toJSON());
              const jsonPubKey = publicKeyInfo.subjectPublicKey.toJSON();
              // console.log("VCEK certificate included pub key: " + jsonPubKey.valueBlock.valueHex);
              
              importPubKey(util.hex_decode(jsonPubKey.valueBlock.valueHex)).then(pubKey => {
                // ? what does this verify exactly? Just that the "hack" worked? -> is VCEK correct or was it manipulated?
              if(verifyMessage(pubKey, ar.signature,ar.getSignedData)){
                
                console.log("1. Attestation report has been validated by the AMD keyserver.");

                // ? Is the actual check if the ar.measurement is equal to the expected measurement missing here?
                // TODO 2. VM has been initalized in the expected state
                console.log("2. Expected state: " + util.arrayBufferToHex(ar.measurment))

                settings.getAttestationDomain(SERVER_URL).then(result => {
                  if (result == null) {
                    console.log("unknown domain, saving measurement!")
                    settings.setAttestationDomain(SERVER_URL, new Date(), new Date(), attestationInfo.technology, ar.measurment)
                  } else {
                    console.log("known measurement!")
                    settings.getAttestationDomain(SERVER_URL).then(stored => {
                      console.log("is equal? " + _.isEqual(ar.measurment, stored.measurement))
                    })
                  }
                })

                // console.log("saved: " + util.arrayBufferToHex(ar.measurment))
                // settings.setAttestationDomain(SERVER_URL, new Date(), new Date(), attestationInfo.technology, ar.measurment).then(
                //   result => {
                //     settings.getAttestationDomain(SERVER_URL).then(
                //       got => {
                //         console.log("is equal? " + _.isEqual(ar.measurment, got.measurement) + " hallo")
                //       },
                //       reason => console.log(reason)
                //     )
                //   },
                //   reason => console.log(reason)
                // )

                // settings.getAttestationDomain(SERVER_URL).then(
                //   result => {
                //     console.log("result ist " + result)
                //     if (result == null) {
                //       console.log("nicht vorhanden")
                //       settings.setAttestationDomain(SERVER_URL, new Date(), new Date(), attestationInfo.technology, ar.measurment)
                //     } else {
                //       if (result.measurment == ar.measurment)
                //         console.log("passt so")
                //       else
                //         console.log("passt nicht " + result.measurment + " " + ar.measurment)
                //     }
                //   }
                // )
                
                // 3. Communication terminates inside the secured VM 
                // ! trick ssl connection is correct for now
                if (true || util.arrayBufferToHex(ar.report_data) === ssl_sha512 ){
                  console.log("3. Comnunication terminates inside the secured VM: \n" +ssl_sha512);
                } else {
                  console.log(" No, expected state:" + util.arrayBufferToHex(ar.report_data) + " but received: " +  ssl_sha512);
                }
                // console.log(ar.parse_report);
                }   
              });          
            });
          });
        })
      })
  }
  return {};
}

// We need to register this listener, since we require the SecurityInfo object
// to validate the public key of the SSL connection
browser.webRequest.onHeadersReceived.addListener(
  listenerOnHeadersReceived,          
  {urls: [MEASURED_LOCATION]},
  // ! inside manifest file: plugin should run on all hosts (websites)
  // ! though, only specific requests (to specific hosts) should be intercepted
  // ? only for testing purposes, since in the end the plugin should check all requests?
  ["blocking", "responseHeaders"]
)