const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

let cachedModelName = null;

async function getAvailableModel(apiKey) {
  if (cachedModelName) return cachedModelName;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    if (data.models && Array.isArray(data.models)) {
      const suitable = data.models.find(m => 
        m.supportedGenerationMethods?.includes('generateContent') && 
        (m.name.includes('flash') || m.name.includes('gemini'))
      );
      if (suitable) {
        cachedModelName = suitable.name.replace('models/', '');
        console.log('Automatically selected model:', cachedModelName);
        return cachedModelName;
      }
    }
  } catch (err) {
    console.error('ListModels error:', err);
  }
  return 'gemini-pro';
}

app.get('/', (req, res) => {
  res.send('Alice Gemini Server is running!');
});

app.post('/api/webhook', async (req, res) => {
  const { request, session, version } = req.body || {};
  const userText = request?.command || request?.original_utterance;

  if (session?.new || !userText) {
    return res.json({
      version,
      session,
      response: {
        text: 'Привет! Я Gemini в Алисе. Задайте любой вопрос.',
        end_session: false,
      },
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({
      version,
      session,
      response: {
        text: 'Ошибка: API-ключ не настроен.',
        end_session: false,
      },
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = await getAvailableModel(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent(
      `Ответь кратко (1-3 предложения), без спецсимволов и markdown: ${userText}`
    );
    let reply = result.response.text().trim();
    reply = reply.replace(/[*#_`]/g, '');

    if (reply.length > 950) {
      reply = reply.slice(0, 950) + '...';
    }

    return res.json({
      version,
      session,
      response: {
        text: reply,
        end_session: false,
      },
    });
  } catch (error) {
    console.error('Gemini error:', error);
    return res.json({
      version,
      session,
      response: {
        text: 'Нейросеть сейчас обрабатывает запрос. Повторите еще раз.',
        end_session: false,
      },
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
