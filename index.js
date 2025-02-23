import express from "express";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as PlayHT from "playht";
import { exec } from "child_process";

import cors from "cors";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: function (origin, callback) {
      if (origin && origin !== process.env.CORS_ORIGIN) {
        console.log("Blocked CORS origin: ", origin); // Log blocked origin
        callback(new Error("CORS Not Allowed"), false);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const PLAY_HT_USER_ID = process.env.PLAY_HT_USER_ID;
const PLAY_HT_API_KEY = process.env.PLAY_HT_API_KEY;

if (!GOOGLE_API_KEY || !PLAY_HT_USER_ID || !PLAY_HT_API_KEY) {
  throw new Error("Missing environment variables. Check your .env file.");
}

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Initialize Play.ht client
PlayHT.init({
  userId: PLAY_HT_USER_ID,
  apiKey: PLAY_HT_API_KEY,
});

// Path to the text file
const FILE_PATH = path.join(__dirname, "data/file.txt");

// Directory for audio files
const AUDIO_DIR = path.join(__dirname, "audios");
console.log(FILE_PATH);
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Path to the Rhubarb executable
const RHUBARB_PATH = path.join(__dirname, "bin", "rhubarb");

// Predefined responses for basic questions
const BASIC_QUESTIONS = {
  hi: "Hi! I'm Abhay Bansal. How can I help you today?",
  hello: "Hello! I'm Abhay Bansal. What can I do for you?",
  "what is your name?": "My name is Abhay Bansal.",
  "who are you?": "I am Abhay Bansal. Nice to meet you!",
  "how are you?": "I'm doing great, thank you! How about you?",
  abhay: "Yes, that's me! How can I help you today?",
};

// Read the content of the text file
const readTextFile = () => {
  try {
    return fs.readFileSync(FILE_PATH, "utf8");
  } catch (error) {
    console.error("Error reading file:", error);
    return "";
  }
};

// Check if the question is a basic one
const isBasicQuestion = (question) => {
  const questionLower = question.toLowerCase().trim();
  return BASIC_QUESTIONS.hasOwnProperty(questionLower);
};

// Generate a response for the user's question
const userInput = async (userQuestion) => {
  if (isBasicQuestion(userQuestion)) {
    return (
      BASIC_QUESTIONS[userQuestion.toLowerCase().trim()] ||
      "I'm not sure how to answer that."
    );
  }

  // Read the text file content
  const context = readTextFile();

  // Use Google Generative AI for non-basic questions
  try {
    const prompt = `You are an assistant providing information on behalf of Abhay Bansal. Your responses should be clear, concise, and professional. Follow these guidelines:

1. **General Knowledge Questions**:
   - Provide a **detailed yet concise answer** based on general knowledge.
   - Ensure the response is informative and accurate.

2. **Questions Related to Abhay Bansal**:
   - If the question is about Abhay Bansal and the information is available, provide a **clear and concise answer**.
   - If the question is about Abhay Bansal but the information is not available, respond with:
     "I am unsure about this. For more information, you can connect with Abhay Bansal on LinkedIn: https://www.linkedin.com/in/bansalabhay/"

3. **Response Format**:
   - Keep the response **within 200 tokens**.
   - Maintain a **professional and clear** tone.

Context: ${context}

Question: ${userQuestion}

Answer:
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating response:", error);
    return "Sorry, I encountered an error while generating a response. Please try again later.";
  }
};

// Convert text to speech using Play.ht and save the audio file
const textToSpeech = async (text, outputFilePath) => {
  try {
    const stream = await PlayHT.stream(text, {
      voice:
        "s3://voice-cloning-zero-shot/e7e9514f-5ffc-4699-a958-3627151559d9/nolansaad2/manifest.json",
      voiceEngine: "PlayHT2.0",
    });

    const writeStream = fs.createWriteStream(outputFilePath);
    for await (const chunk of stream) {
      writeStream.write(chunk);
    }
    writeStream.end();

    console.log("Audio file saved:", outputFilePath);
  } catch (error) {
    console.error("Error generating TTS:", error);
    throw error;
  }
};

const convertMp3ToWav = async (mp3FilePath, wavFilePath) => {
  return new Promise((resolve, reject) => {
    const command = `ffmpeg -i "${mp3FilePath}" -ar 16000 -ac 1 -y "${wavFilePath}"`;
    console.log("Running conversion command:", command);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("Error converting MP3 to WAV:", error);
        console.error("Command stderr:", stderr);
        reject(error);
      } else {
        console.log("Conversion successful:", wavFilePath);
        resolve();
      }
    });
  });
};
// Generate mouth cues using Rhubarb Lip Sync
const generateMouthCues = async (audioFilePath, outputFilePath) => {
  return new Promise((resolve, reject) => {
    const command = `"${RHUBARB_PATH}" -f json -o "${outputFilePath}" "${audioFilePath}" -r phonetic`;
    console.log("Running command:", command);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("Error generating mouth cues:", error);
        console.error("Command stderr:", stderr);
        reject(error);
      } else {
        console.log("Mouth cues generated:", outputFilePath);
        resolve();
      }
    });
  });
};

// Initialize Express app


// Handle user questions
app.post("/ask", async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: "No question provided" });
    }

    // Generate response using Gemini
    const response = await userInput(question);
    console.log("Response generated:", response);

    // Save the audio file
    const mp3FilePath = path.join(AUDIO_DIR, "message_0.mp3");
    await textToSpeech(response, mp3FilePath);

    // Convert MP3 to WAV
    const wavFilePath = path.join(AUDIO_DIR, "message_0.wav");
    await convertMp3ToWav(mp3FilePath, wavFilePath);

    // Generate mouth cues
    const mouthCuesFilePath = path.join(AUDIO_DIR, "message_0.json");
    await generateMouthCues(wavFilePath, mouthCuesFilePath);

    // Read the mouth cues data
    const mouthCuesData = await fs.promises.readFile(mouthCuesFilePath, "utf8");

    return res.json({
      response: response,
      audio: `/audios/message_0.mp3`, // Path to the saved audio file
      mouthCues: JSON.parse(mouthCuesData), // Mouth cues data
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Serve static files (audio files)
app.use("/audios", express.static(AUDIO_DIR));

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
