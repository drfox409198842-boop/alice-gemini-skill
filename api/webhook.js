const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

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
        text: 'Ошибка: API-ключ Gemini не настроен на сервере.',
        end_session: false,
      },
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    const result = await model.generateContent(userText);
    let reply = result.response.text().trim();

    if (reply.length > 950) {
      reply = reply.slice(0, 950) + '... (ответ сокращен)';
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
        text: 'Не удалось получить ответ от нейросети. Попробуйте еще раз.',
        end_session: false,
      },
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
