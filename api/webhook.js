const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Список моделей по приоритету: от быстрых к стабильным резервным
const CANDIDATE_MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-8b',
  'gemini-3.8-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

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
        text: 'API-ключ не найден в переменных окружения.',
        end_session: false,
      },
    });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  let replyText = null;

  // Автоматический каскадный перебор моделей без падений
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const prompt = `Ответь кратко (1-2 емких предложения), без списков и markdown-разметки: ${userText}`;
      
      const result = await model.generateContent(prompt);
      const text = result?.response?.text();
      
      if (text) {
        replyText = text.trim().replace(/[*#_`]/g, '');
        console.log(`Success with model: ${modelName}`);
        break; // Успешно получили ответ, выходим из цикла
      }
    } catch (err) {
      console.warn(`Model ${modelName} failed, switching to next fallback...`);
    }
  }

  if (!replyText) {
    replyText = 'Сервис нейросети временно недоступен. Попробуйте еще раз через минуту.';
  } else if (replyText.length > 950) {
    replyText = replyText.slice(0, 950) + '...';
  }

  return res.json({
    version,
    session,
    response: {
      text: replyText,
      end_session: false,
    },
  });
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
