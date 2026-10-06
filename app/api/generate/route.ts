import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { prompt } = await request.json();

        if (!prompt || !prompt.trim()) {
            return NextResponse.json(
                { error: "Prompt is required" },
                { status: 400 }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "GEMINI_API_KEY is missing" },
                { status: 500 }
            );
        }

        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey,
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt.trim(),
                                },
                            ],
                        },
                    ],
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini API error:", data);

            return NextResponse.json(
                {
                    error:
                        data?.error?.message ||
                        "Failed to generate content",
                },
                { status: response.status }
            );
        }

        const generatedContent =
            data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedContent) {
            return NextResponse.json(
                { error: "Gemini returned no content" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            content: generatedContent,
        });
    } catch (error) {
        console.error("Generate route error:", error);

        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}