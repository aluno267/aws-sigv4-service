const express = require('express');
const AWS = require('aws-sdk');
const bodyParser = require('body-parser');

// Criação do servidor Express
const app = express();
const port = process.env.PORT || 3000;

// Middleware para interpretar JSON no corpo da requisição
app.use(bodyParser.json());

// Configuração do AWS SDK para a região us-east-2
AWS.config.update({
  region: 'us-east-2', // Região ajustada para us-east-2 (Ohio)
});

// Inicializando o cliente do AWS Textract
const textract = new AWS.Textract();

// Endpoint HTTP POST para processar o PDF
app.post('/process-pdf', async (req, res) => {
  const { fileUrl } = req.body;

  // Verifica se a URL do arquivo foi passada
  if (!fileUrl) {
    return res.status(400).send('fileUrl é obrigatório');
  }

  try {
    // Parâmetro de entrada para o AWS Textract (usando o S3)
    const params = {
      DocumentLocation: {
        S3Object: {
          // Certifique-se de que o PDF está em um bucket S3 acessível ao Textract
          Bucket: 'seu-bucket-s3',  // Substitua pelo nome do seu bucket S3
          Name: fileUrl,  // Nome do arquivo PDF (ou URL acessível)
        },
      },
    };

    // Chama o Textract para iniciar o processamento do documento
    const response = await textract.startDocumentTextDetection(params).promise();
    console.log('Job iniciado com sucesso, ID do Job:', response.JobId);

    // Retorna o JobId para o cliente
    res.status(200).json({ JobId: response.JobId });
  } catch (error) {
    console.error('Erro ao iniciar o processamento:', error);
    res.status(500).send('Erro ao iniciar o processamento');
  }
});

// Endpoint para verificar o status do job
app.get('/status-job/:jobId', async (req, res) => {
  const { jobId } = req.params;

  // Parâmetros para consultar o status do job
  const params = {
    JobId: jobId,
  };

  try {
    // Chama o Textract para obter o status do job
    const response = await textract.getDocumentTextDetection(params).promise();

    // Verifica o status do job
    if (response.JobStatus === 'IN_PROGRESS') {
      return res.status(200).json({ status: 'IN_PROGRESS' });
    }

    if (response.JobStatus === 'SUCCEEDED') {
      // Processa o resultado (extração de texto)
      const textBlocks = response.Blocks.filter(block => block.BlockType === 'LINE').map(block => block.Text);
      return res.status(200).json({ status: 'SUCCEEDED', textBlocks });
    }

    return res.status(400).json({ status: 'FAILED', message: 'Falha no processamento' });
  } catch (error) {
    console.error('Erro ao verificar o status do job:', error);
    res.status(500).send('Erro ao verificar o status do job');
  }
});

// Inicia o servidor na porta especificada
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
