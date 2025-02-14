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

                setIsListening(false)
                setIsPaused(true)
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
      setTranscript("");
    }
  };

  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
      {/* Quotes Display */}
      <div 
        className="w-full md:w-[90%] lg:w-[80%] h-[300px] overflow-auto rounded-xl md:rounded-2xl shadow-lg mb-4 md:mb-6 bg-white"
        ref={quotesContainerRef}
      >
        <div className="border-t pt-4 px-2 md:px-4">
          <div className="flex flex-col md:flex-row items-center gap-2 mb-4">
            <Book className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold flex items-center gap-2">
              <span className="text-lg md:text-xl">VerseCatch</span>
              <span className="bg-orange-100 text-orange-800 rounded-lg px-3 py-1 text-sm md:text-base">
                {selectedVersion}
              </span>
            </h3>
          </div>

          <div className="space-y-3 md:space-y-4 px-2 pb-4">
            {quotes.map((quote, index) => (
              <div
                key={index}
                className="p-3 md:p-4 bg-blue-50 rounded-lg animate-fade-in shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <p className="font-semibold text-blue-800 text-sm md:text-base">
                    {quote.reference}
                  </p>
                </div>
                <p className="mt-1 md:mt-2 text-sm md:text-base text-gray-700">
                  {quote.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls Card */}
      <Card className="w-full md:max-w-2xl mx-2 md:mx-auto shadow-xl">
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="text-lg md:text-xl">Bible Quote Detection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 md:space-y-4 flex flex-col items-center">
            <div className="w-full max-w-[200px] md:max-w-[300px]">
              <AudioVisualizer isListening={isListening} isPaused={isPaused} />
            </div>

            <div className="w-full p-3 md:p-4 bg-gray-50 rounded-lg min-h-[100px] shadow-inner">
              <p className="font-semibold text-sm md:text-base mb-2 text-gray-700">
                Live Transcription:
              </p>
              <div className="overflow-y-auto max-h-[80px] md:max-h-32 text-sm md:text-base text-gray-600">
                {transcript || "Please start speaking..."}
              </div>
            </div>

            <div className="w-full space-y-1">
              <label htmlFor="version" className="font-semibold text-sm md:text-base block mb-1">
                Bible Version:
              </label>
              <select
                id="version"
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(e.target.value)}
                className="w-full p-2 text-sm md:text-base border rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                {bibleVersions.map((version) => (
                  <option key={version} value={version}>{version}</option>
                ))}
              </select>
            </div>

            <Button
              onClick={toggleListening}
              variant={isListening ? "destructive" : isPaused ? "secondary" : "default"}
              className="w-full md:w-auto px-6 py-3 text-sm md:text-base rounded-xl transition-all hover:scale-105 active:scale-95"
            >
              <span className="flex items-center gap-2">
                {isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : isPaused ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                {isListening ? "Stop" : isPaused ? "Continue" : "Start"} Listening
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}