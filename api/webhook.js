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
        text: 'API-ключ не настроен.',
        end_session: false,
      },
    });
  }

  let responded = false;
  // Яндекс держит соединение до 4.5 секунд, ставим отсечку на 4.2 секунды
  const timer = setTimeout(() => {
    if (!responded) {
      responded = true;
      res.json({
        version,
        session,
        response: {
          text: 'Нейросеть генерирует ответ дольше обычного. Попробуйте спросить чуть короче.',
          end_session: false,
        },
      });
    }
  }, 4200);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.8-flash',
      generationConfig: {
        maxOutputTokens: 60,
      }
    });

    const result = await model.generateContent(
      `Ответь Алисе кратко одним предложением: ${userText}`
    );
    
    const reply = result.response.text().trim().replace(/[*#_`]/g, '');

    if (!responded) {
      clearTimeout(timer);
      responded = true;
      return res.json({
        version,
        session,
        response: {
          text: reply.slice(0, 950),
          end_session: false,
        },
      });
    }
  } catch (error) {
    console.error('Gemini error:', error);
    if (!responded) {
      clearTimeout(timer);
      responded = true;
      return res.json({
        version,
        session,
        response: {
          text: 'Нейросеть сейчас занята, повторите вопрос через несколько секунд.',
          end_session: false,
        },
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
