const express = require("express");
const crypto = require("crypto");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

const accessKey = process.env.AWS_ACCESS_KEY;
const secretKey = process.env.AWS_SECRET_KEY;
const region = process.env.AWS_REGION || "us-east-2";
const service = "textract";

function getSignature(payload) {
    const host = `${service}.${region}.amazonaws.com`;
    const endpoint = `https://${host}/`;
    const amzTarget = "Textract.StartDocumentTextDetection";

    const now = new Date();
    const dateISO = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const shortDate = dateISO.substring(0, 8);
    const credentialScope = `${shortDate}/${region}/${service}/aws4_request`;

    const payloadHash = crypto.createHash("sha256").update(payload).digest("hex");

    const canonicalRequest = [
        "POST",
        "/",
        "",
        "content-type:application/x-amz-json-1.1",
        `host:${host}`,
        `x-amz-date:${dateISO}`,
        `x-amz-target:${amzTarget}`,
        "",
        "content-type;host;x-amz-date;x-amz-target",
        payloadHash
    ].join("\n");

    const stringToSign = [
        "AWS4-HMAC-SHA256",
        dateISO,
        credentialScope,
        crypto.createHash("sha256").update(canonicalRequest).digest("hex")
    ].join("\n");

    function getSignatureKey(key, dateStamp, regionName, serviceName) {
        const kDate = crypto.createHmac("sha256", "AWS4" + key).update(dateStamp).digest();
        const kRegion = crypto.createHmac("sha256", kDate).update(regionName).digest();
        const kService = crypto.createHmac("sha256", kRegion).update(serviceName).digest();
        return crypto.createHmac("sha256", kService).update("aws4_request").digest();
    }

    const signingKey = getSignatureKey(secretKey, shortDate, region, service);
    const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");

    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=content-type;host;x-amz-date;x-amz-target, Signature=${signature}`;

    return {
        endpoint,
        amzTarget,
        authorizationHeader,
        date: dateISO
    };
}

app.post("/generate-signature", (req, res) => {
    const payload = JSON.stringify(req.body);
    const signatureData = getSignature(payload);
    res.json(signatureData);
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
