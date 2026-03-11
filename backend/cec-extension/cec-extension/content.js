(function () {
  if (document.getElementById('cec-ai-root')) return;

  // ── Inject styles ──────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #cec-ai-root * { box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }

    /* Floating bubble */
    #cec-ai-bubble {
      position: fixed; bottom: 28px; right: 28px;
      width: 62px; height: 62px; border-radius: 50%;
      background: linear-gradient(135deg, #1e3a8a, #2563eb);
      box-shadow: 0 4px 24px rgba(37,99,235,0.55);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; z-index: 2147483647;
      animation: cecGlow 2.5s ease-in-out infinite;
      border: none; outline: none;
    }
    #cec-ai-bubble:hover { transform: scale(1.08); transition: transform .2s; }
    #cec-ai-bubble .bubble-inner {
      width: 42px; height: 42px; border-radius: 50%;
      background: rgba(255,255,255,0.18);
      backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 700; font-size: 13px; letter-spacing: .5px;
    }

    /* Panel */
    #cec-ai-panel {
      position: fixed; bottom: 28px; right: 28px;
      width: 370px; height: 600px; border-radius: 22px;
      background: rgba(255,255,255,0.92);
      backdrop-filter: blur(14px);
      box-shadow: 0 8px 40px rgba(30,58,138,0.22);
      border: 1px solid #bfdbfe;
      display: flex; flex-direction: column;
      z-index: 2147483647;
      animation: cecSlideUp .25s ease-out;
      overflow: hidden;
    }

    /* Header */
    #cec-ai-panel .cec-header {
      padding: 14px 18px;
      background: linear-gradient(90deg, #1e3a8a, #1d4ed8);
      color: #fff;
      display: flex; justify-content: space-between; align-items: center;
      flex-shrink: 0;
    }
    #cec-ai-panel .cec-header .cec-title { font-size: 14px; font-weight: 600; }
    #cec-ai-panel .cec-header .cec-subtitle { font-size: 11px; opacity: .75; margin-top: 2px; }
    #cec-ai-panel .cec-header .cec-close {
      background: none; border: none; color: #fff;
      font-size: 22px; cursor: pointer; line-height: 1; padding: 0;
    }

    /* Body */
    #cec-ai-panel .cec-body {
      flex: 1; overflow-y: auto; padding: 16px;
      background: linear-gradient(160deg, #eff6ff 0%, #fff 60%, #dbeafe 100%);
    }
    #cec-ai-panel .cec-body::-webkit-scrollbar { width: 4px; }
    #cec-ai-panel .cec-body::-webkit-scrollbar-thumb { background: #bfdbfe; border-radius: 4px; }

    /* Menu */
    .cec-welcome { text-align: center; padding: 12px 8px 0; }
    .cec-welcome h2 { font-size: 17px; font-weight: 600; color: #1e3a8a; margin: 0 0 6px; }
    .cec-welcome p  { font-size: 12px; color: #475569; margin: 0; line-height: 1.5; }
    .cec-menu { display: flex; flex-direction: column; gap: 10px; margin-top: 18px; }
    .cec-menu-item {
      background: rgba(255,255,255,0.9);
      border: 1px solid #dbeafe; border-radius: 14px;
      padding: 12px 16px; cursor: pointer;
      box-shadow: 0 2px 8px rgba(30,58,138,0.07);
      transition: box-shadow .2s, transform .2s;
      display: flex; align-items: center; gap: 10px;
    }
    .cec-menu-item:hover { box-shadow: 0 6px 18px rgba(30,58,138,0.15); transform: translateY(-2px); }
    .cec-menu-item .cec-icon { font-size: 18px; }
    .cec-menu-item .cec-label { font-size: 13px; font-weight: 500; color: #1e3a8a; text-transform: capitalize; }

    /* Messages */
    .cec-msg-wrap { display: flex; margin-bottom: 10px; }
    .cec-msg-wrap.user { justify-content: flex-end; }
    .cec-msg-wrap.bot  { justify-content: flex-start; }
    .cec-msg {
      max-width: 78%; padding: 9px 14px; font-size: 12.5px;
      border-radius: 16px; line-height: 1.5;
      box-shadow: 0 2px 6px rgba(0,0,0,0.07);
    }
    .cec-msg.user { background: #1e3a8a; color: #fff; border-bottom-right-radius: 4px; }
    .cec-msg.bot  { background: #fff; color: #1e293b; border: 1px solid #e0e7ff; border-bottom-left-radius: 4px; }
    .cec-typing  { font-size: 12px; color: #3b82f6; padding: 4px 0; animation: cecPulse 1.2s infinite; }

    /* Footer */
    #cec-ai-panel .cec-footer {
      padding: 10px 12px; border-top: 1px solid #e0e7ff;
      background: #fff; display: flex; gap: 7px; align-items: center;
      flex-shrink: 0;
    }
    .cec-back-btn {
      font-size: 11px; background: #eff6ff; border: none;
      padding: 7px 11px; border-radius: 20px; cursor: pointer;
      color: #1e3a8a; font-weight: 500; white-space: nowrap;
    }
    .cec-back-btn:hover { background: #dbeafe; }
    .cec-input {
      flex: 1; padding: 8px 14px; font-size: 12.5px;
      border: 1px solid #bfdbfe; border-radius: 20px;
      outline: none;
    }
    .cec-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }
    .cec-mic-btn, .cec-send-btn {
      border: none; border-radius: 50%; width: 34px; height: 34px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; font-size: 14px; flex-shrink: 0;
    }
    .cec-mic-btn  { background: #3b82f6; color: #fff; }
    .cec-send-btn { background: #1e3a8a; color: #fff; }
    .cec-mic-btn:hover  { background: #2563eb; }
    .cec-send-btn:hover { background: #1d4ed8; }

    /* Voice overlay */
    #cec-voice-overlay {
      position: fixed; inset: 0; z-index: 2147483648;
      background: linear-gradient(135deg, #dbeafe, #fff, #eff6ff);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      animation: cecFadeIn .3s ease-out;
    }
    #cec-voice-overlay .cec-orb-wrap { position: relative; }
    #cec-voice-overlay .cec-orb-ping {
      position: absolute; inset: 0; border-radius: 50%;
      background: #3b82f6; opacity: .2;
      animation: cecPing 2s infinite;
    }
    #cec-voice-overlay .cec-orb {
      width: 140px; height: 140px; border-radius: 50%;
      background: linear-gradient(135deg, #1e3a8a, #3b82f6);
      box-shadow: 0 8px 40px rgba(37,99,235,0.4);
      display: flex; align-items: center; justify-content: center;
      animation: cecBreathe 2.5s ease-in-out infinite;
    }
    #cec-voice-overlay .cec-orb-inner {
      width: 90px; height: 90px; border-radius: 50%;
      background: rgba(255,255,255,.18); backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      font-size: 36px;
    }
    #cec-voice-overlay p { margin: 18px 0 6px; color: #1e3a8a; font-size: 16px; font-weight: 600; }
    #cec-voice-overlay small { color: #64748b; font-size: 12px; }
    #cec-voice-overlay .cec-close-voice {
      position: absolute; top: 24px; right: 24px;
      background: none; border: none; font-size: 24px;
      color: #1e3a8a; cursor: pointer;
    }

    /* Animations */
    @keyframes cecGlow {
      0%,100% { box-shadow: 0 4px 20px rgba(37,99,235,.5); }
      50%      { box-shadow: 0 4px 30px rgba(37,99,235,.9); }
    }
    @keyframes cecSlideUp {
      from { opacity: 0; transform: translateY(30px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes cecFadeIn {
      from { opacity: 0; } to { opacity: 1; }
    }
    @keyframes cecPulse {
      0%,100% { opacity: 1; } 50% { opacity: .4; }
    }
    @keyframes cecBreathe {
      0%,100% { transform: scale(1); } 50% { transform: scale(1.07); }
    }
    @keyframes cecPing {
      0%   { transform: scale(1); opacity: .4; }
      100% { transform: scale(1.9); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  // ── State ──────────────────────────────────────────────────────────────────
  const BACKEND = 'http://127.0.0.1:8000/chat';
  const SECTIONS = [
    { key: 'admission',  icon: '🎓' },
    { key: 'placement',  icon: '💼' },
    { key: 'academics',  icon: '📚' },
    { key: 'faculties',  icon: '👨‍🏫' },
    { key: 'fees',       icon: '💰' },
    { key: 'hostel',     icon: '🏠' },
    { key: 'contact',    icon: '📞' },
  ];

  let isOpen        = false;
  let currentSection = null;
  let loading       = false;
  let chats         = {};
  SECTIONS.forEach(s => chats[s.key] = []);

  // ── Root container ─────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = 'cec-ai-root';
  document.body.appendChild(root);

  // ── Build bubble ───────────────────────────────────────────────────────────
  const bubble = document.createElement('button');
  bubble.id = 'cec-ai-bubble';
  bubble.innerHTML = `<div class="bubble-inner">AI</div>`;
  bubble.onclick = openPanel;
  root.appendChild(bubble);

  // ── Build panel ────────────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.id    = 'cec-ai-panel';
  panel.style.display = 'none';
  panel.innerHTML = `
    <div class="cec-header">
      <div>
        <div class="cec-title">🎓 College AI Assistant</div>
        <div class="cec-subtitle" id="cec-subtitle">Main Menu</div>
      </div>
      <button class="cec-close" id="cec-close">×</button>
    </div>
    <div class="cec-body" id="cec-body"></div>
    <div class="cec-footer" id="cec-footer" style="display:none;">
      <button class="cec-back-btn" id="cec-back">← Back</button>
      <input class="cec-input" id="cec-input" placeholder="Ask something..." />
      <button class="cec-mic-btn" id="cec-mic">🎤</button>
      <button class="cec-send-btn" id="cec-send">➤</button>
      <button class="cec-stop-btn" id="cec-stop">⏹</button>
    </div>
  `;
  root.appendChild(panel);

  // ── Build voice overlay ────────────────────────────────────────────────────
  const voiceOverlay = document.createElement('div');
  voiceOverlay.id = 'cec-voice-overlay';
  voiceOverlay.style.display = 'none';
  voiceOverlay.innerHTML = `
    <button class="cec-close-voice" id="cec-close-voice">×</button>
    <div class="cec-orb-wrap">
      <div class="cec-orb-ping"></div>
      <div class="cec-orb"><div class="cec-orb-inner">🎤</div></div>
    </div>
    <p>Listening...</p>
    <small>Speak clearly into your microphone</small>
  `;
  root.appendChild(voiceOverlay);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function openPanel() {
    bubble.style.display = 'none';
    panel.style.display  = 'flex';
    renderMenu();
  }

  function closePanel() {
    panel.style.display  = 'none';
    bubble.style.display = 'flex';
    currentSection = null;
  }

  function renderMenu() {
    currentSection = null;
    document.getElementById('cec-subtitle').textContent = 'Main Menu';
    document.getElementById('cec-footer').style.display = 'none';

    const body = document.getElementById('cec-body');
    body.innerHTML = `
      <div class="cec-welcome">
        <h2>Welcome 👋</h2>
        <p>I'm your CEC AI Assistant.<br>Ask me anything about admissions, placements, academics and more.</p>
      </div>
      <div class="cec-menu">
        ${SECTIONS.map(s => `
          <div class="cec-menu-item" data-section="${s.key}">
            <span class="cec-icon">${s.icon}</span>
            <span class="cec-label">${s.key}</span>
          </div>
        `).join('')}
      </div>
    `;

    body.querySelectorAll('.cec-menu-item').forEach(el => {
      el.onclick = () => openSection(el.dataset.section);
    });
  }

  function openSection(section) {
    currentSection = section;
    document.getElementById('cec-subtitle').textContent = section.toUpperCase();
    document.getElementById('cec-footer').style.display = 'flex';
    renderChat();
  }

  function renderChat() {
    const body = document.getElementById('cec-body');
    const msgs = chats[currentSection];

    body.innerHTML = msgs.map(m => `
      <div class="cec-msg-wrap ${m.role}">
        <div class="cec-msg ${m.role}">${escapeHtml(m.text)}</div>
      </div>
    `).join('');

    if (loading) {
      body.innerHTML += `<div class="cec-typing">AI is thinking...</div>`;
    }

    body.scrollTop = body.scrollHeight;
  }

  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  async function sendMessage(text) {
    const userText = (text || document.getElementById('cec-input').value).trim();
    if (!userText || loading || !currentSection) return;

    document.getElementById('cec-input').value = '';
    chats[currentSection].push({ role: 'user', text: userText });
    loading = true;
    renderChat();

    try {
      const res = await fetch(BACKEND, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userText, purpose: currentSection }),
      });
      const data = await res.json();
      chats[currentSection].push({ role: 'bot', text: data.answer });
      speakText(data.answer);
    } catch {
      chats[currentSection].push({ role: 'bot', text: 'Server error. Make sure the backend is running at localhost:8000.' });
    }

    loading = false;
    renderChat();
  }

  function speakText(text) {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    const tryVoice = () => {
      const voices = speechSynthesis.getVoices();
      const voice  = voices.find(v => v.name.includes('Microsoft Zira'))
                  || voices.find(v => v.name.includes('Google UK English Female'))
                  || voices.find(v => v.name.includes('Microsoft Heera'));
      if (voice) { utterance.voice = voice; utterance.pitch = 1.2; }
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    };
    speechSynthesis.getVoices().length === 0
      ? (speechSynthesis.onvoiceschanged = tryVoice)
      : tryVoice();
  }

  function stopSpeech() {
  speechSynthesis.cancel();
  }

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition not supported in this browser'); return; }
    voiceOverlay.style.display = 'flex';
    const rec = new SR();
    rec.lang = 'en-US';
    rec.start();
    rec.onresult = (e) => {
      const voiceText = e.results[0][0].transcript;
      voiceOverlay.style.display = 'none';
      document.getElementById('cec-input').value = voiceText;
      setTimeout(() => sendMessage(voiceText), 300);
    };
    rec.onerror = () => { voiceOverlay.style.display = 'none'; };
  }

  // ── Event listeners ────────────────────────────────────────────────────────
  panel.querySelector('#cec-close').onclick = closePanel;

  panel.querySelector('#cec-back').onclick = () => {
    currentSection = null;
    renderMenu();
  };

  panel.querySelector('#cec-send').onclick = () => sendMessage();

  panel.querySelector('#cec-input').onkeydown = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  panel.querySelector('#cec-mic').onclick = startListening;
  panel.querySelector('#cec-stop').onclick = stopSpeech;

  voiceOverlay.querySelector('#cec-close-voice').onclick = () => {
    voiceOverlay.style.display = 'none';
  };

})();
