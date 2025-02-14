/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Book, Pause } from "lucide-react";
import AudioVisualizer from "./components/AudioVisualizer";

interface BibleQuote {
  reference: string;
  text: string;
  version: string;
}

export default function Page() {
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [quotes, setQuotes] = useState<BibleQuote[]>([]);
  const recognitionRef = useRef<any>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedVersion, setSelectedVersion] = useState("ESV");
  const quotesContainerRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(isPaused);

  const bibleVersions = ["ESV", "KJV", "NIV"];

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = async (event: any) => {
        if (isPausedRef.current) return;
        let currentTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);

        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current);
        }

        processingTimeoutRef.current = setTimeout(async () => {
          try {
            const response = await fetch("/api/stream", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ 
                text: currentTranscript,
                version: selectedVersion, 
              }),
            });

            if (!response.ok) throw new Error("Failed to process text");

     
            const reader = response.body?.getReader();
            if (!reader) return;

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const decodedValue = new TextDecoder().decode(value);
              const result = JSON.parse(decodedValue);

              if (result.type === "quote" && result.data) {
                setQuotes(prev => {
                  const exists = prev.some(q => 
                    q.reference === result.data.reference && 
                    q.text === result.data.text
                  );
                  return exists ? prev : [...prev, result.data];
                });
// setIsListening(false)
setIsPaused(false)
              }
            }
          } catch (error) {
            console.error("Error processing transcript:", error);
          }
        }, 1000);
      };

      recognitionRef.current = recognition;
    }
  }, [selectedVersion]);

  useEffect(() => {
    if (quotesContainerRef.current) {
      quotesContainerRef.current.scrollTo({
        top: quotesContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [quotes]);

  const toggleListening = () => {
    if (isPaused) {
      setIsPaused(false);
      recognitionRef.current?.start();
      setIsListening(true);
    } else if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setIsPaused(true);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
      setIsPaused(false);
      setQuotes([]);
    }
  };

  const getButtonContent = () => {
    if (isListening) {
      return (
        <>
          <MicOff className="h-4 w-4" />
          <span>Stop Listening</span>
        </>
      );
    }
    if (isPaused) {
      return (
        <>
          <Pause className="h-4 w-4" />
          <span>Continue Listening</span>
        </>
      );
    }
    return (
      <>
        <Mic className="h-4 w-4" />
        <span>Start Listening</span>
      </>
    );
  };

  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center">
      <div 
        className="might_wrapper mb-[12px] w-[80%] h-[300px] overflow-auto rounded-2xl shadow-xl"
        ref={quotesContainerRef}
      >
        <div className="border-t pt-4">
          <div className="flex w-[100%] gap-2 mb-4 fex flex-row justify-center items-center">
            <Book className="h-5 w-5" />
            <h3 className="font-semibold flex flex-row items-center justify-center">
              <span>VerseCatch</span>
              <span className="bg-orange-300 bg-opacity-25 rounded-xl p-2 font-medium ml-2">
                {selectedVersion}
              </span>
            </h3>
          </div>

          <div className="space-y-4">
            {quotes.map((quote, index) => (
              <div
                key={index}
                className="p-4 bg-blue-50 rounded-lg animate-fade-in"
              >
                <div className="flex justify-between items-start">
                  <p className="font-semibold text-blue-800 w-fit m-auto">
                    {quote.reference}
                  </p>
                </div>
                <p className="mt-2">{quote.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Bible Quote Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 flex flex-col items-center justify">
            <div className="animated_visualizer">
              <AudioVisualizer isListening={isListening} isPaused={isPaused} />
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg min-h-24 w-full">
              <p className="font-semibold mb-2">Live Transcription:</p>
              <div className="overflow-y-auto max-h-32 custom-scrollbar">
                {transcript || "Please start speaking..."}
              </div>
            </div>

            <div className="w-full">
              <label htmlFor="version" className="font-semibold">
                Select Bible Version:
              </label>
              <select
                id="version"
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(e.target.value)}
                className="mt-2 p-2 border rounded-md w-full"
              >
                {bibleVersions.map((version) => (
                  <option key={version} value={version}>
                    {version}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={toggleListening}
              variant={isListening ? "destructive" : isPaused ? "secondary" : "default"}
              className="flex items-center gap-2 w-2xl rounded-2xl"
            >
              {getButtonContent()}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}