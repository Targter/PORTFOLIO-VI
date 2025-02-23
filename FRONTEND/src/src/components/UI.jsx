import React, { useCallback, useEffect, useState, useRef } from "react";
import { Mic } from "lucide-react";
import "regenerator-runtime/runtime";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { useChat } from "../hooks/useChat";

export const UI = ({ hidden, ...props }) => {
  const input = useRef();
  const { chat, loading, cameraZoomed, setCameraZoomed, message } = useChat();
  const [isRecording, setIsRecording] = useState(false);

  const {
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition,
    listening,
  } = useSpeechRecognition();

  // Timeout to detect silence
  const silenceTimeout = useRef(null);

  // Effect to reset transcript when chat changes
  useEffect(() => {
    if (chat) {
      resetTranscript();
    }
  }, [chat, resetTranscript]);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      SpeechRecognition.stopListening();
    } else {
      SpeechRecognition.startListening({ continuous: true, language: "en-IN" });
    }
    setIsRecording((prev) => !prev);
  }, [isRecording]);

  // Send message function
  const sendMessage = useCallback(() => {
    const text = input.current.value;
    console.log(text);
    if (!loading && !message && text.trim()) {
      chat(text);
      input.current.value = "";
      resetTranscript(); // Clear the transcript after sending
    }
  }, [loading, message, chat, resetTranscript]);

  // Effect to detect silence and auto-send
  useEffect(() => {
    if (listening && transcript) {
      // Clear the previous timeout
      if (silenceTimeout.current) {
        clearTimeout(silenceTimeout.current);
      }

      // Set a new timeout to detect silence
      silenceTimeout.current = setTimeout(() => {
        if (listening) {
          sendMessage(); // Auto-send when silence is detected
        }
      }, 2000); // 2 seconds of silence
    }

    // Cleanup timeout on unmount or when listening stops
    return () => {
      if (silenceTimeout.current) {
        clearTimeout(silenceTimeout.current);
      }
    };
  }, [listening, transcript, sendMessage]);

  // Update input value with transcript
  useEffect(() => {
    if (transcript) {
      input.current.value = transcript;
    }
  }, [transcript]);

  if (!browserSupportsSpeechRecognition) {
    return null;
  }

  if (hidden) {
    return null;
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bottom-0 z-10 flex justify-between p-4 flex-col pointer-events-none">
        <div className="w-full flex flex-col items-end justify-center gap-4">
          <button
            onClick={() => setCameraZoomed(!cameraZoomed)}
            className="pointer-events-auto bg-gray-500 hover:bg-gray-900 text-white p-4 rounded-md"
          >
            {cameraZoomed ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
                />
              </svg>
            )}
          </button>
          <button
            onClick={() => {
              const body = document.querySelector("body");
              if (body.classList.contains("greenScreen")) {
                body.classList.remove("greenScreen");
              } else {
                body.classList.add("greenScreen");
              }
            }}
            className="pointer-events-auto bg-gray-500 hover:bg-gray-800 text-white p-4 rounded-md"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-2 pointer-events-auto max-w-screen-sm w-full mx-auto">
          <button
            onClick={toggleRecording}
            className={`p-2 rounded-full ${
              isRecording
                ? "bg-[#2f2f2f] text-red-600"
                : "bg-[#2f2f2f] text-gray-600"
            }`}
          >
            <Mic className="h-7 w-7" />
          </button>
          <input
            className="w-full placeholder:text-gray-800 placeholder:italic p-4 rounded-md bg-opacity-50 bg-white backdrop-blur-md"
            placeholder="Type a message..."
            ref={input}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
          />
          <button
            disabled={loading || message}
            onClick={sendMessage}
            className={`bg-gray-700 hover:bg-gray-800 text-white p-4 px-10 font-semibold uppercase rounded-md ${
              loading || message ? "cursor-not-allowed opacity-30" : ""
            }`}
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
};
