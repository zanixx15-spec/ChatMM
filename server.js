// ChatMM backend proxy. Keep your OpenRouter key in .env, never in browser code.
require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json({limit:'1mb'}));
app.use(express.static(path.join(__dirname,'public')));
const ALLOWED_MODELS = new Set([
  'meta-llama/llama-3.3-70b-instruct',
  'google/gemma-3-27b-it',
  'deepseek/deepseek-chat'
]);
app.post('/api/chat', async (req,res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) return res.status(503).json({error:'Server မှာ OPENROUTER_API_KEY မသတ်မှတ်ရသေးပါ။'});
    const {model,messages} = req.body || {};
    if (!ALLOWED_MODELS.has(model)) return res.status(400).json({error:'မထောက်ပံ့သော model ဖြစ်သည်။'});
    if (!Array.isArray(messages) || messages.length < 1 || messages.length > 60) return res.status(400).json({error:'messages မမှန်ကန်ပါ။'});
    if (messages.some(m => !m || !['user','assistant','system'].includes(m.role) || typeof m.content !== 'string')) return res.status(400).json({error:'message format မမှန်ပါ။'});
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method:'POST', headers:{'Authorization':`Bearer ${process.env.OPENROUTER_API_KEY}`,'Content-Type':'application/json','X-Title':'ChatMM'},
      body:JSON.stringify({model,messages,temperature:0.7})
    });
    const data = await upstream.json();
    if (!upstream.ok) return res.status(upstream.status).json({error:data?.error?.message || 'AI provider request failed'});
    res.json(data);
  } catch (e) { console.error('ChatMM proxy error:',e.message); res.status(500).json({error:'Server အမှားဖြစ်နေပါတယ်။'}); }
});
const port = process.env.PORT || 3000;
app.listen(port,()=>console.log(`ChatMM running on http://localhost:${port}`));
