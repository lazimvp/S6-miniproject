# CEC AI Assistant — Chrome Extension

Injects the AI Assistant widget into ceconline.edu automatically.

## ⚙️ Setup (One-time)

1. Make sure your **backend is running**:
   ```
   cd project/backend
   uvicorn main:app --reload
   ```
   Backend must be live at http://127.0.0.1:8000

## 🚀 Install the Extension

1. Open Chrome and go to: `chrome://extensions`
2. Turn ON **Developer mode** (toggle, top-right)
3. Click **"Load unpacked"**
4. Select this folder: `cec-extension/`
5. Done ✅

## ✅ Using It

- Visit **ceconline.edu** — the AI bubble appears at bottom-right
- Click it to open the chat widget
- Select a topic (Admission, Placement, Fees, etc.)
- Type or use 🎤 voice input

## 🔄 Backend URL

Widget talks to `http://127.0.0.1:8000/chat` by default.
If you deploy the backend online, update line 8 of `content.js`:
```js
const BACKEND = 'https://your-deployed-api.com/chat';
```
Then reload the extension in chrome://extensions.
