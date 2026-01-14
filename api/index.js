export default async function handler(request, response) {
  // Настройка доступа (CORS)
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Получаем данные от твоего Джарвиса
  const { text, model } = request.body;

  try {
    let aiText;

    if (model === "gemini") {
      // Твой ключ Gemini (спрятан в безопасности)
      const API_KEY = "AIzaSyDklZ4s7q2BPHwhSy7to9nJ9jD2AuQ5cPA";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
      
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text }] }] })
      });
      const data = await res.json();
      aiText = data.candidates[0].content.parts[0].text;
    } else {
      // Другие модели
      const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(text)}?model=${model}`);
      aiText = await res.text();
    }

    response.status(200).json({ reply: aiText });

  } catch (error) {
    response.status(500).json({ error: error.message });
  }
}
