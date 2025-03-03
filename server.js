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

    const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const shortDate = date.substring(0, 8);
    const credentialScope = `${shortDate}/${region}/${service}/aws4_request`;

    const payloadHash = crypto.createHash('sha256').update(payload).digest('hex');
    const stringToSign = `AWS4-HMAC-SHA256\n${date}\n${credentialScope}\n${payloadHash}`;

    const signingKey = crypto.createHmac('sha256', `AWS4${secretKey}`)
        .update(shortDate)
        .update(region)
        .update(service)
        .update('aws4_request')
        .digest();

    const signature = crypto.createHmac('sha256', signingKey)
        .update(stringToSign)
        .digest('hex');

    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=content-type;host;x-amz-date;x-amz-target, Signature=${signature}`;

    return {
        endpoint,
        amzTarget,
        authorizationHeader,
        date
    };
}

// Endpoint para gerar a assinatura
app.post("/generate-signature", (req, res) => {
    const payload = JSON.stringify(req.body);
    const signatureData = getSignature(payload);
    res.json(signatureData);
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});