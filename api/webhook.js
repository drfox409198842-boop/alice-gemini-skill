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

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Используем актуальную модель gemini-3.8-flash с инструкцией отвечать кратко (для скорости)
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.8-flash',
      systemInstruction: 'Отвечай емко, кратко (не более 2-3 предложений), без списков и разметки markdown, так как твой ответ читает голосовой ассистент Алиса.'
    });

    // Делаем генерацию
    const result = await model.generateContent(userText);
    let reply = result.response.text().trim();

    // Очищаем от возможных звездочек markdown для лучшей озвучки
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
        text: 'Нейросеть сейчас перегружена запросами. Пожалуйста, повторите вопрос еще раз.',
        end_session: false,
      },
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
