/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import bibleData_KJV from '../../../public/KJV_bible.json';
import bibleData_ESV from '../../../public/ESV_bible.json';
import bibleData_NIV from '../../../public/NIV_bible.json';



const bibleVersions: Record<string, any> = {
  KJV: bibleData_KJV,
  ESV: bibleData_ESV,
  NIV: bibleData_NIV,
};

function getVerseText(reference: string, version: string): string {
  try {
    const bibleData = bibleVersions[version];
    // console.log(bibleData,"####")
    if (!bibleData) return "Invalid Bible version";

    const [bookPart, chapterVerse] = reference.split(/ (\d+:\d+)$/);
    if (!bookPart || !chapterVerse) return "Text not found";

    const [chapter, verse] = chapterVerse.split(":");
    if (!chapter || !verse) return "Text not found";

    const bookData = bibleData[bookPart];
    if (!bookData) return "Text not found";

    const chapterData = bookData[chapter];
    if (!chapterData) return "Text not found";

    return chapterData[verse] || "Text not found";
  } catch (error) {
    console.error("Error retrieving verse:", error);
    return "Text not found";
  }
}

function expandVerseRange(reference: string): string[] {
  try {
    const match = reference.match(/^(.+?\s+\d+):(\d+)-(\d+)$/);
    if (!match) return [reference]; // Not a range, return as single reference

    const [_, bookChapter, startVerse, endVerse] = match;
    const verses: string[] = [];
    
    // Generate all verses in the range
    for (let i = parseInt(startVerse); i <= parseInt(endVerse); i++) {
      verses.push(`${bookChapter}:${i}`);
    }
    
    return verses;
  } catch (error) {
    console.error("Error expanding verse range:", error);
    return [reference];
  }
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const contextCache = new Map<string, {
  text: string;
  timestamp: number;
}>();

const CACHE_DURATION = 20000; /// here it like to store the previous context so... so like it can know the previous once and know how to analys it well 
const MIN_CHUNK_LENGTH = 10; /// that  to capture max len

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of contextCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      contextCache.delete(key);
    }
  }
}, 60000);

export const runtime = "edge";

export async function POST(req: Request) {
  const encoder = new TextEncoder();

  try {
    const { text, sessionId ,version} = await req.json();

    const recentContext = Array.from(contextCache.values())
      .filter(entry => Date.now() - entry.timestamp < CACHE_DURATION)
      .map(entry => entry.text)
      .join(" ");

    contextCache.set(sessionId + Date.now(), {
      text,
      timestamp: Date.now()
    });

    const analyzableText = `${recentContext} ${text}`.trim();

    if (analyzableText.length < MIN_CHUNK_LENGTH) {
      return new Response(
        encoder.encode(JSON.stringify({ type: "no-match", data: null })),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      new ReadableStream({
        async start(controller) {
          try {
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const prompt = `
              Analyze this spoken text for Bible references: "${text}"
              Consider:
              1. Common speech recognition errors
              2. Key biblical phrases
              3. Context and meaning
              4. Verse ranges (e.g., "Genesis 4:5-8" should be identified as a range)

              For each match, provide:
              { "reference": "Book Chapter:Verse" } or { "reference": "Book Chapter:StartVerse-EndVerse" }

              Pay special attention to phrases like:
              - "in the back of [book] chapter [X] verse [Y] to verse [Z]"
              - "from [book] [chapter]:[verse] to [verse]"
              - "[book] [chapter]:[verse]-[verse]"

              Only return matches with high confidence. Format as JSON array.
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            let responseText = response.text().trim();

            responseText = responseText.replace(/```json|```/g, "").trim();
            
            try {
              const matches = JSON.parse(responseText);

              for (const match of matches) {
                const referenceRanges = expandVerseRange(match.reference);
                
                for (const reference of referenceRanges) {
                  const text = getVerseText(reference,version);

                  controller.enqueue(
                    encoder.encode(
                      JSON.stringify({
                        type: "quote",
                        data: { reference, text,version:version }
                      })
                    )
                  );

                  await new Promise(resolve => setTimeout(resolve, 100));
                }
              }
            } catch (error) {
              console.error("Parsing error:", error);
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: "error",
                    data: { message: "Failed to parse matches" }
                  })
                )
              );
            }

            controller.close();
          } catch (error) {
            console.error("Stream error:", error);
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "error",
                  data: { message: "Processing failed" }
                })
              )
            );
            controller.close();
          }
        }
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        }
      }
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}