# Interview Assistant - AI-Powered Interview Helper 🎯

An invisible chatbot assistant that helps you answer technical interview questions with concise, natural-sounding responses.

## ✨ Features

- 🤖 **AI-Powered Answers** - Get instant, interview-ready responses using Google Gemini API
- 💬 **Chatbot Interface** - Simple Q&A format like ChatGPT
- 🎭 **Interview-Optimized** - Concise, natural answers that sound genuine when spoken
- 👻 **Invisible to Screen Sharing** - Won't appear on Zoom, Teams, Meet, etc.
- ⚡ **Quick Toggle** - Show/hide with `Ctrl+Shift+I`
- 🎨 **Beautiful UI** - Modern dark theme with glassmorphism
- 🔒 **Privacy First** - API key stored locally, no data collection

## 🚀 Quick Start

### Installation
```bash
npm install
```

### Run
```bash
npm start
```

### First Time Setup
1. Press `Ctrl+Shift+I` to show the window
2. Click ⚙️ Settings
3. Enter your Gemini API key from [Google AI Studio](https://aistudio.google.com)
4. Click Save

### Usage
1. Type your interview question
2. Press Enter or click Send
3. Read the concise, interview-ready answer
4. Press `Ctrl+Shift+I` to hide when done

## 🎯 Perfect For

- **Technical Interviews** - Get quick answers to coding questions
- **Concept Reviews** - Understand technical topics concisely
- **Interview Prep** - Practice with realistic, speakable answers
- **Quick Reference** - Fast lookup during live interviews

## 💡 Example

**You ask:** "What is a REST API?"

**Normal AI (too long):**
> "A REST API is a Representational State Transfer Application Programming Interface that uses HTTP methods like GET, POST, PUT, and DELETE to perform operations on resources identified by URLs. REST APIs are stateless, meaning each request contains all the information needed..."

**Interview Assistant (perfect):**
> "It's an API that follows REST architectural constraints. REST APIs use standard HTTP methods like GET and POST to interact with resources identified by URLs. A common use case is fetching data from a web server to display on a website."

## 📊 API Limits (Free Tier)

- **15 requests per minute**
- **200 requests per day**
- Plenty for interview prep!

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Show/Hide Window | `Ctrl+Shift+I` |
| Send Message | `Enter` |
| New Line | `Shift+Enter` |

## 🔧 How It Works

- **Electron App** - Runs as a desktop application
- **Content Protection** - Uses `setContentProtection(true)` to stay invisible during screen sharing
- **Gemini API** - Powered by Google's Gemini 2.0 Flash model
- **Smart Prompting** - Custom system prompt optimized for interview-style answers

## 📝 Customization

Want to adjust the response style? Edit the system prompt in `app.js` (line 199) to:
- Make answers shorter/longer
- Add more technical detail
- Change the tone

## 🛡️ Privacy & Security

- ✅ API key stored locally in browser localStorage
- ✅ No data sent to third parties (except Google Gemini API)
- ✅ No tracking or analytics
- ✅ Open source - inspect the code yourself

## 🎓 Interview Tips

1. **Don't read word-for-word** - Understand the answer, then speak naturally
2. **Position strategically** - Bottom corner of your screen
3. **Use opacity slider** - Make it semi-transparent to avoid suspicion
4. **Practice beforehand** - Get comfortable with the workflow
5. **Have a backup** - Know some answers yourself

## 📁 Project Structure

```
InvisibleApp/
├── main.js           # Electron main process
├── app.js            # Interview-optimized chatbot logic
├── index.html        # UI structure
├── styles.css        # Beautiful styling
├── package.json      # Dependencies
└── INTERVIEW_GUIDE.md # Detailed usage guide
```

## 🐛 Troubleshooting

**Window won't show?**
- Press `Ctrl+Shift+I` to toggle

**API errors?**
- Check your API key in Settings
- Verify you have quota remaining (200/day)
- Ensure internet connection is stable

**Answers too long?**
- Edit the system prompt in `app.js` to request shorter responses

## 📄 License

MIT License - Use responsibly and ethically

## ⚠️ Disclaimer

This tool is for educational and interview preparation purposes. Use it responsibly and in accordance with the interview guidelines of the company you're interviewing with.

---

**Good luck with your interviews! 🚀**
