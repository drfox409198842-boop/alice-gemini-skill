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
        text: 'Ошибка: API-ключ не настроен.',
        end_session: false,
      },
    });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });

  let reply = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await model.generateContent(
        `Ответь кратко (1-2 предложения), без списков и без markdown: ${userText}`
      );
      reply = result.response.text().trim();
      break;
    } catch (err) {
      console.error(`Attempt ${attempt} error:`, err);
      if (attempt === 2) {
        return res.json({
          version,
          session,
          response: {
            text: 'Нейросеть сейчас сильно загружена. Спросите еще раз через пару секунд.',
            end_session: false,
          },
        });
      }
      await new Promise((r) => setTimeout(r, 400));
    }
  }

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
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
