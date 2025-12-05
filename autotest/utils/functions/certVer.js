
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createSign } from "node:crypto";

import qz from "../../../js/qz-tray.js"

// Recreations of the '__filename' and '__dirname' variables from CommonJS
// https://stackoverflow.com/q/46745014
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//     /..      /..   /..
// tray/autotest/utils/functions
const qzRoot = path.join(__dirname, "..", "..", "..");

// Cert Logic

export function certVer() {

    const certPath = path.join(qzRoot, "autotest", "cert.txt");
    const pkeyPath = path.join(qzRoot, "autotest", "pkey.txt");

    if ( existsSync(certPath) && existsSync(pkeyPath) ) {

        const cert = readFileSync(certPath, 'utf8');
        const pkey = readFileSync(pkeyPath, 'utf8');

        qz.security.setCertificatePromise(function(resolve, reject) {
            resolve(cert);
        });

        qz.security.setSignatureAlgorithm("SHA512");
        qz.security.setSignaturePromise(function(toSign) {
            return function(resolve, reject) {
                var sign = createSign('SHA512');
                sign.update(toSign);
                var signature = sign.sign({ key: pkey }, 'base64');
                resolve(signature);
            };
        });

    }

    else {
        console.warn("Certificate or Pkey not found, proceding without them, expected:", certPath, pkeyPath)
        console.warn(" - To resolve: QZ Tray --> Advanced --> Site Manager --> '+' --> Create New")
        console.warn("   - cp ~'/Desktop/QZ Tray Demo Cert/digital-certificate.txt' ./cert.txt")
        console.warn("   - cp ~'/Desktop/QZ Tray Demo Cert/private-key.pem' ./pkey.txt")
    }

}
