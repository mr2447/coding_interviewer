# Coding Interviewer Platform - Frontend

A React-based single-page application for coding interview practice, featuring a LeetCode-style interface with three panels: question display, Monaco code editor, and AI chatbot assistant.

## Features

- **Question Panel**: Displays coding interview questions with examples, constraints, and hints
- **Code Editor**: Monaco Editor (VS Code core) with support for JavaScript, Python, and Java
- **AI Chatbot**: Mock OpenAI integration for code feedback and hints
- **Responsive Design**: Three-panel layout that adapts to different screen sizes

## Tech Stack

- React 18
- Vite
- Monaco Editor (@monaco-editor/react)
- CSS3

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to the URL shown in the terminal (typically `http://localhost:5173`)

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment to AWS S3.

## Project Structure

```
src/
├── components/
│   ├── Layout/          # Three-panel layout wrapper
│   ├── QuestionPanel/   # Question display component
│   ├── CodeEditor/      # Monaco editor integration
│   └── ChatBot/         # AI chatbot interface
├── data/
│   └── mockQuestions.js # Sample coding interview questions
├── utils/
│   └── mockOpenAI.js    # Mock OpenAI API responses
├── App.jsx              # Main application component
├── main.jsx             # React entry point
└── index.css            # Global styles
```

## Future Integrations

- Connect question data to AWS backend API
- Replace mock OpenAI with actual OpenAI API integration
- Add AWS Cognito authentication
- Connect code submission to AWS Lambda/API Gateway
- Deploy to AWS S3 + CloudFront

## Development Notes

- The chatbot uses mock responses that simulate OpenAI API behavior
- Questions are randomly selected from mock data on page load
- Code editor supports JavaScript, Python, and Java
- All backend integrations are placeholders for future AWS microservices

