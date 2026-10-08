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
  // Страховка от таймаута Яндекса: если нейросеть думает дольше 2.7 сек, отвечаем сразу
  const timer = setTimeout(() => {
    if (!responded) {
      responded = true;
      res.json({
        version,
        session,
        response: {
          text: 'Нейросеть долго генерирует ответ. Пожалуйста, повторите вопрос еще раз.',
          end_session: false,
        },
      });
    }
  }, 2700);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Бьем СРАЗУ в подтвержденную рабочую модель без задержек на перебор
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.8-flash',
      generationConfig: {
        maxOutputTokens: 100, // Очень короткий ответ = моментальная генерация
      }
    });

    const result = await model.generateContent(
      `Ответь Алисе предельно кратко (1-2 предложения), без списков и markdown: ${userText}`
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
          text: 'Нейросеть сейчас перегружена. Спросите еще раз через пару секунд.',
          end_session: false,
        },
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
