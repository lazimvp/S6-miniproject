import { useState, useEffect, useRef } from "react";

const sections = [
  "admission",
  "placement",
  "academics",
  "faculties",
  "fees",
  "hostel",
  "contact"
];

export default function FloatingCollegeAssistant() {
  const [voiceMode, setVoiceMode] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  // 🎤 Speech recognition
const recognitionRef = useRef(null);

const startListening = () => {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Speech recognition not supported in this browser");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.start();

  recognition.onresult = (event) => {
    const voiceText = event.results[0][0].transcript;
    setInput(voiceText);      // put text in input
    setVoiceMode(false);      // close listening UI

    setTimeout(() => {
      sendMessageFromVoice(voiceText);
    }, 500);
  };

  recognitionRef.current = recognition;
};

// helper to send voice message
const sendMessageFromVoice = async (voiceText) => {
  if (!voiceText.trim() || loading || !currentSection) return;

  const userMessage = voiceText;

  setChats((prev) => ({
    ...prev,
    [currentSection]: [
      ...prev[currentSection],
      { role: "user", text: userMessage },
    ],
  }));

  setLoading(true);

  try {
    const res = await fetch("http://127.0.0.1:8000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: userMessage,
        purpose: currentSection,
      }),
    });

    const data = await res.json();

    setChats((prev) => ({
      ...prev,
      [currentSection]: [
        ...prev[currentSection],
        { role: "bot", text: data.answer },
      ],
    }));

    speakText(data.answer); // 🔊 bot speaks
  } catch (err) {
    console.error(err);
  }

  setLoading(false);
};

// 🔊 text to speech (force female voice)
const speakText = (text) => {
  if (!text) return;

  const utterance = new SpeechSynthesisUtterance(text);

  const setFemaleVoice = () => {
    const voices = window.speechSynthesis.getVoices();

    const femaleVoice =
      voices.find(v => v.name.includes("Microsoft Zira")) ||
      voices.find(v => v.name.includes("Google UK English Female")) ||
      voices.find(v => v.name.includes("Microsoft Heera"));

    if (femaleVoice) {
      utterance.voice = femaleVoice;
      utterance.pitch = 1.2;
      utterance.rate = 1;
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  // ✅ IMPORTANT: wait for voices to load
  if (speechSynthesis.getVoices().length === 0) {
    speechSynthesis.onvoiceschanged = setFemaleVoice;
  } else {
    setFemaleVoice();
  }
};

  const [chats, setChats] = useState(() => {
    const obj = {};
    sections.forEach(sec => (obj[sec] = []));
    return obj;
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, loading, currentSection]);

  const sendMessage = async () => {
    if (!input.trim() || loading || !currentSection) return;

    const userMessage = input;

    setChats(prev => ({
      ...prev,
      [currentSection]: [
        ...prev[currentSection],
        { role: "user", text: userMessage }
      ]
    }));

    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMessage,
          purpose: currentSection,
        }),
      });

      const data = await res.json();

      setChats(prev => ({
        ...prev,
        [currentSection]: [
          ...prev[currentSection],
          { role: "bot", text: data.answer }
        ]
      }));
    } catch {
      setChats(prev => ({
        ...prev,
        [currentSection]: [
          ...prev[currentSection],
          { role: "bot", text: "Server error. Please try again." }
        ]
      }));
    }

    setLoading(false);
  };

  return (
    <>
      {/* Floating Bubble */}
      {!isOpen && (
        <div
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-br from-blue-800 to-blue-600 shadow-2xl flex items-center justify-center cursor-pointer z-50 animate-pulseGlow"
        >
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold">
            AI
          </div>
        </div>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[380px] h-[620px] rounded-3xl shadow-2xl bg-white/80 backdrop-blur-lg flex flex-col border border-blue-200 z-50 animate-slideUp">

          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-blue-900 to-blue-700 text-white rounded-t-3xl flex justify-between items-center">
            <div>
              <div className="font-semibold text-sm">
                College AI Assistant
              </div>
              <div className="text-xs opacity-80">
                {currentSection ? currentSection.toUpperCase() : "Main Menu"}
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-white text-lg"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 p-4 overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-blue-100">

            {/* MAIN MENU */}
            {!currentSection && (
              <div className="flex flex-col h-full justify-between">

                <div>
                  <div className="text-center mt-6 px-6">
                    <h2 className="text-xl font-semibold text-blue-900">
                      Welcome 👋
                    </h2>
                    <p className="text-sm text-slate-600 mt-2">
                      I'm your College AI Assistant.  
                      Ask me anything about admissions, placements,
                      academics and more.
                    </p>
                  </div>

                  <div className="flex flex-col gap-4 px-6 mt-8">
                    {sections.map(sec => (
                      <div
                        key={sec}
                        onClick={() => setCurrentSection(sec)}
                        className="cursor-pointer bg-white/90 backdrop-blur-md border border-blue-100 rounded-2xl p-4 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
                      >
                        <div className="text-blue-900 font-medium capitalize">
                          {sec}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                </div>
                )}
                
            

            {/* CHAT VIEW */}
            {currentSection && (
              <>
                <div className="space-y-3">
                  {chats[currentSection].map((m, i) => (
                    <div
                      key={i}
                      className={`flex ${
                        m.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2 text-sm rounded-2xl shadow-md ${
                          m.role === "user"
                            ? "bg-blue-900 text-white"
                            : "bg-white border border-blue-100"
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="text-sm text-blue-600 animate-pulse">
                      AI is thinking...
                    </div>
                  )}
                </div>

                <div ref={endRef} />
              </>
            )}
          </div>

          {/* Footer for Chat */}
          {currentSection && (
            <div className="p-3 border-t bg-white flex gap-2">
              <button
                onClick={() => setCurrentSection(null)}
                className="text-xs bg-blue-100 px-3 rounded-full"
              >
                Back
              </button>

              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                disabled={loading}
                placeholder="Ask something..."
                className="flex-1 px-4 py-2 text-sm border border-blue-200 rounded-full outline-none focus:ring-2 focus:ring-blue-400"
              />
              {/* 🎤 MIC BUTTON */}
              <button
                onClick={() => {
                  setVoiceMode(true);
                  startListening();
                }}
                className="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center"
              >
                🎤
              </button>

              <button
                onClick={sendMessage}
                disabled={loading}
                className="bg-blue-900 text-white px-4 py-2 text-sm rounded-full"
              >
                Send
              </button>
            </div>
          )}
        </div>
      )}
{voiceMode && (
  <div className="fixed inset-0 z-[60] bg-gradient-to-br from-blue-100 via-white to-blue-200 flex flex-col items-center justify-center animate-fadeIn">

    {/* Close Button */}
    <button
      onClick={() => setVoiceMode(false)}
      className="absolute top-8 right-8 text-blue-900 text-2xl"
    >
      ×
    </button>

    {/* Orb Container */}
    <div className="flex flex-col items-center">

      <div className="relative">

        {/* Outer Glow */}
        <div className="absolute inset-0 rounded-full bg-blue-500 opacity-20 animate-pingSlow"></div>

        {/* Main Orb */}
        <div className="w-40 h-40 rounded-full bg-gradient-to-br from-blue-700 to-blue-500 shadow-2xl flex items-center justify-center animate-breathe">

          <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-3xl">
            🎤
          </div>

        </div>
      </div>

      <p className="mt-8 text-blue-900 text-lg font-medium">
        Listening...
      </p>

      <p className="text-sm text-slate-600 mt-2">
        Speak clearly into your microphone
      </p>

    </div>
  </div>
)}
      {/* Animations */}
      <style>
        {`
        .animate-slideUp {
          animation: slideUp 0.25s ease-out;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-pulseGlow {
          animation: glow 2s infinite;
        }
        @keyframes glow {
          0% { box-shadow: 0 0 10px rgba(37,99,235,0.6); }
          50% { box-shadow: 0 0 20px rgba(37,99,235,0.9); }
          100% { box-shadow: 0 0 10px rgba(37,99,235,0.6); }
        }
          .animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-breathe {
  animation: breathe 2.5s ease-in-out infinite;
}
@keyframes breathe {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}

.animate-pingSlow {
  animation: pingSlow 2s infinite;
}
@keyframes pingSlow {
  0% { transform: scale(1); opacity: 0.4; }
  100% { transform: scale(1.8); opacity: 0; }
}
        `}
      </style>
    </>
  );
}