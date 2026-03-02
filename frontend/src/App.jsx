import { useState, useRef } from "react";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const recognitionRef = useRef(null);

  // 🎤 Speech to Text
  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.start();

    recognition.onresult = (event) => {
      const voiceText = event.results[0][0].transcript;
      setMessage(voiceText);
      sendMessage(voiceText);
    };

    recognitionRef.current = recognition;
  };

  // 🔊 Text to Speech
  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);

    const voices = speechSynthesis.getVoices();

    // ⭐ choose best female voice
    const femaleVoice =
      voices.find((v) =>
        v.name.includes("Google UK English Female")
      ) || voices[0];

    utterance.voice = femaleVoice;
    speechSynthesis.speak(utterance);
  };

  // 🤖 Send to backend
  const sendMessage = async (textParam) => {
    const userText = textParam || message;
    if (!userText.trim()) return;

    setChat((prev) => [...prev, { sender: "user", text: userText }]);
    setMessage("");

    try {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: userText }),
      });

      const data = await res.json();

      setChat((prev) => [
        ...prev,
        { sender: "bot", text: data.answer },
      ]);

      speak(data.answer); // 🔊 bot speaks
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>🎓 College AI Assistant</h1>

      <div style={{ marginBottom: "10px" }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask something..."
          style={{ padding: "8px", width: "300px" }}
        />

        <button onClick={() => sendMessage()} style={{ marginLeft: "5px" }}>
          Send
        </button>

        <button onClick={startListening}
         style={{ marginLeft: "5px" }}>
          🎤 speak
        </button>
      </div>

      <div>
        {chat.map((c, i) => (
          <p key={i}>
            <b>{c.sender === "user" ? "You" : "Bot"}:</b> {c.text}
          </p>
        ))}
      </div>
    </div>
  );
}

export default App;