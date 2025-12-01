# Interview Assistant - AI-Powered Interview Helper 🎯

An invisible chatbot assistant that helps you answer technical interview questions with concise, natural-sounding responses.

## ✨ Features

- 🤖 **AI-Powered Answers** - Get instant, interview-ready responses using Google Gemini API
- 🎤 **Voice Input** - Hold Ctrl+L to speak your question (captures both you and interviewer)
- � **Screen Capture** - Analyze coding problems directly from your screen (Ctrl+S / Ctrl+P)
- �💬 **Chatbot Interface** - Simple Q&A format like ChatGPT
- 🎭 **Interview-Optimized** - Concise, natural answers that sound genuine when spoken
- 🔤 **Multi-Language Support** - Choose your preferred coding language (Python, C++, Java, JS, C#)
- 👻 **Invisible to Screen Sharing** - Won't appear on Zoom, Teams, Meet, etc.
- ⚡ **Quick Toggle** - Show/hide with `Ctrl+Shift+I`
- 🎨 **Beautiful UI** - Modern dark theme with glassmorphism
- 🔒 **Privacy First** - API key stored locally, no data collection

## 🚀 Quick Start

### Prerequisites
Before you begin, make sure you have:
- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** (optional, for cloning) - [Download here](https://git-scm.com/)
- **Google Gemini API Key** (free) - [Get it here](https://aistudio.google.com/app/apikey)

### Installation

#### Option 1: Clone with Git
```bash
# Clone the repository
git clone https://github.com/codingplugin/Unsharable.git

# Navigate to the project folder
cd Unsharable

# Install dependencies
npm install
```

#### Option 2: Download ZIP
1. Click the green **Code** button on GitHub
2. Select **Download ZIP**
3. Extract the ZIP file
4. Open terminal/command prompt in the extracted folder
5. Run: `npm install`

### Getting Your API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the generated key (starts with `AIza...`)
5. Keep it safe - you'll need it in the next step!

### First Time Setup
1. Run the app:
   ```bash
   npm start
   ```
2. Press `Ctrl+Shift+I` to show the window
3. Click ⚙️ **Settings**
4. Paste your Gemini API key
5. (Optional) Enter a custom model ID or leave blank for auto
6. Click **Save**

### Daily Usage
1. **Start the app:** `npm start`
2. **Show window:** Press `Ctrl+Shift+I`
3. **Ask questions:** Type and press Enter
4. **Hide window:** Press `Ctrl+Shift+I` again
5. **Close app:** Click the × button or close terminal

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
| Voice Input (Hold to Speak) | `Ctrl+1` (hold) |
| Capture Full Screen | `Ctrl+2` |
| Capture Area Behind App | `Ctrl+3` |
| Send Message | `Enter` |
| New Line | `Shift+Enter` |

## 🎤 Advanced Features

### Voice Input
Hold `Ctrl+L` to record your question:
- Captures **both** your microphone and system audio (interviewer's voice)
- Automatically transcribes and answers the question
- Perfect for live interview scenarios
- Release the key to send

### Screen Capture
Analyze code problems from your screen:
- **`Ctrl+S`** - Capture full screen and get AI analysis
- **`Ctrl+P`** - Capture the area behind the app window
- Great for solving coding challenges shown on screen
- AI will read the problem and provide the solution

### Language Selection
Choose your preferred coding language from the dropdown:
- Auto (default) - AI decides based on context
- Python, C++, Java, JavaScript, C#
- All code solutions will be in your selected language

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
