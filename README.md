# VerseCatch - Bible Verse Detection Application

VerseCatch is a web application that listens to spoken words, analyzes them for Bible references, and then displays the corresponding verses in real-time. The application supports multiple Bible versions, including KJV, ESV, and NIV.

## Features
- Real-time speech-to-text transcription
- Detection of Bible references from spoken text
- Fetch and display Bible verses from multiple translations (KJV, ESV, NIV)
- Support for continuous speech recognition
- User can select the preferred Bible version

## Tech Stack
- **Frontend**: React (with Next.js)
- **Backend**: Next.js API routes
- **Voice Recognition**: Web Speech API (SpeechRecognition)
- **Bible Data**: KJV, ESV, and NIV JSON data
- **Generative AI**: Google's Gemini API for context-aware text analysis

## Setup

### Prerequisites
- Node.js (v16.x or later)
- Google Gemini API key (for Generative AI)

### Install Dependencies
Run the following command to install the required dependencies:

```bash
npm install
