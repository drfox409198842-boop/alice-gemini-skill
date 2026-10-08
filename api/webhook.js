const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).send('OK');
  }

  const { request, session, version } = req.body || {};
  const userText = request?.command || request?.original_utterance;

  if (session?.new || !userText) {
    return res.status(200).json({
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
    return res.status(200).json({
      version,
      session,
      response: {
        text: 'Ключ Gemini не найден в настройках Vercel.',
        end_session: false,
      },
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent(userText);
    let reply = result.response.text().trim();

    if (reply.length > 950) {
      reply = reply.slice(0, 950) + '... (ответ сокращен)';
    }

    return res.status(200).json({
      version,
      session,
      response: {
        text: reply,
        end_session: false,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(200).json({
      version,
      session,
      response: {
        text: 'Ошибка получения ответа от Gemini. Попробуйте еще раз.',
        end_session: false,
      },
    });
  }
};
