import { NextResponse } from "next/server";

const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

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

        const model = "gemini-3.8-flash";

        let lastError = "Failed to generate content";

        // Try up to 4 times
        for (let attempt = 0; attempt < 4; attempt++) {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
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

            if (response.ok) {
                const generatedContent =
                    data?.candidates?.[0]?.content?.parts
                        ?.map((part: { text?: string }) => part.text ?? "")
                        .join("")
                        .trim();

                if (generatedContent) {
                    return NextResponse.json({
                        content: generatedContent,
                    });
                }

                lastError = "Gemini returned no content";
            } else {
                lastError =
                    data?.error?.message ||
                    "Failed to generate content";

                console.error(
                    `Gemini attempt ${attempt + 1} failed:`,
                    data
                );

                // Only retry temporary errors
                if (
                    response.status !== 503 &&
                    response.status !== 429 &&
                    response.status !== 408 &&
                    response.status < 500
                ) {
                    return NextResponse.json(
                        { error: lastError },
                        { status: response.status }
                    );
                }
            }

            // Exponential backoff: 1s, 2s, 4s
            if (attempt < 3) {
                const delay = 1000 * Math.pow(2, attempt);
                await sleep(delay);
            }
        }

        return NextResponse.json(
            {
                error:
                    lastError +
                    " Please try again in a moment.",
            },
            { status: 503 }
        );
    } catch (error) {
        console.error("Generate route error:", error);

        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}