"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Generation = {
    id: string;
    created_at: string;
    user_id: string;
    prompt: string;
    content: string;
};

type Vote = {
    id: string;
    created_at: string;
    user_id: string;
    generation_id: string;
    vote: number;
};

export default function GenerationsPage() {
    const [user, setUser] = useState<User | null>(null);
    const [generations, setGenerations] = useState<Generation[]>([]);
    const [votes, setVotes] = useState<Vote[]>([]);
    const [prompt, setPrompt] = useState("");
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const router = useRouter();

    useEffect(() => {
        const loadPage = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.push("/");
                return;
            }

            setUser(user);

            const { data: generationsData, error: generationsError } =
                await supabase
                    .from("generations")
                    .select("*")
                    .order("created_at", { ascending: false });

            if (generationsError) {
                console.error(generationsError);
            } else {
                setGenerations(generationsData ?? []);
            }

            const { data: votesData, error: votesError } = await supabase
                .from("votes")
                .select("*");

            if (votesError) {
                console.error(votesError);
            } else {
                setVotes(votesData ?? []);
            }

            setLoading(false);
        };

        loadPage();
    }, [router]);

    const generateWithAI = async () => {
        if (!prompt.trim()) {
            alert("Please enter a prompt first.");
            return;
        }

        setGenerating(true);
        setContent("");

        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || "Failed to generate content.");
                return;
            }

            setContent(data.content);
        } catch (error) {
            console.error(error);
            alert("Something went wrong while generating content.");
        } finally {
            setGenerating(false);
        }
    };

    const createGeneration = async () => {
        if (!user || !prompt.trim() || !content.trim()) {
            alert("Please generate content first.");
            return;
        }

        const { data, error } = await supabase
            .from("generations")
            .insert({
                user_id: user.id,
                prompt: prompt.trim(),
                content: content.trim(),
            })
            .select()
            .single();

        if (error) {
            console.error(error);
            alert(error.message);
            return;
        }

        setGenerations((current) => [data, ...current]);
        setPrompt("");
        setContent("");
    };

    const createVote = async (
        generationId: string,
        voteValue: number
    ) => {
        if (!user) return;

        const existingVote = votes.find(
            (vote) =>
                vote.user_id === user.id &&
                vote.generation_id === generationId
        );

        if (existingVote) {
            const { data, error } = await supabase
                .from("votes")
                .update({
                    vote: voteValue,
                })
                .eq("id", existingVote.id)
                .select()
                .single();

            if (error) {
                console.error(error);
                alert(error.message);
                return;
            }

            setVotes((current) =>
                current.map((vote) =>
                    vote.id === existingVote.id ? data : vote
                )
            );

            return;
        }

        const { data, error } = await supabase
            .from("votes")
            .insert({
                user_id: user.id,
                generation_id: generationId,
                vote: voteValue,
            })
            .select()
            .single();

        if (error) {
            console.error(error);
            alert(error.message);
            return;
        }

        setVotes((current) => [data, ...current]);
    };

    if (loading) {
        return <main style={{ padding: "40px" }}>Loading...</main>;
    }

    return (
        <main
            style={{
                maxWidth: "800px",
                margin: "40px auto",
                padding: "20px",
            }}
        >
            <h1>AI Rating App</h1>

            <p>Signed in as: {user?.email}</p>

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    marginTop: "30px",
                }}
            >
                <input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter a prompt for AI"
                    style={{
                        padding: "12px",
                        fontSize: "16px",
                    }}
                />

                <button
                    onClick={generateWithAI}
                    disabled={generating}
                    style={{
                        padding: "12px",
                        fontSize: "16px",
                        cursor: generating ? "not-allowed" : "pointer",
                    }}
                >
                    {generating
                        ? "Generating..."
                        : "✨ Generate with AI"}
                </button>

                <textarea
                    value={content}
                    readOnly
                    placeholder="AI generated content will appear here"
                    rows={6}
                    style={{
                        padding: "12px",
                        fontSize: "16px",
                    }}
                />

                <button
                    onClick={createGeneration}
                    disabled={!content.trim()}
                    style={{
                        padding: "12px",
                        fontSize: "16px",
                        cursor: content.trim()
                            ? "pointer"
                            : "not-allowed",
                    }}
                >
                    Save Generation
                </button>
            </div>

            <div style={{ marginTop: "40px" }}>
                <h2>Saved Generations</h2>

                {generations.length === 0 ? (
                    <p>No generations yet.</p>
                ) : (
                    generations.map((generation) => {
                        const generationVotes = votes.filter(
                            (vote) =>
                                vote.generation_id === generation.id
                        );

                        const score = generationVotes.reduce(
                            (total, vote) => total + vote.vote,
                            0
                        );

                        const myVote = generationVotes.find(
                            (vote) => vote.user_id === user?.id
                        );

                        return (
                            <div
                                key={generation.id}
                                style={{
                                    border: "1px solid #ccc",
                                    padding: "16px",
                                    marginTop: "12px",
                                    borderRadius: "8px",
                                }}
                            >
                                <strong>Prompt:</strong>
                                <p>{generation.prompt}</p>

                                <strong>AI Generated Content:</strong>
                                <p>{generation.content}</p>

                                <p>
                                    <strong>Score:</strong> {score}
                                </p>

                                <div
                                    style={{
                                        display: "flex",
                                        gap: "10px",
                                        marginTop: "12px",
                                    }}
                                >
                                    <button
                                        onClick={() =>
                                            createVote(
                                                generation.id,
                                                1
                                            )
                                        }
                                        style={{
                                            padding: "8px 12px",
                                            cursor: "pointer",
                                            fontWeight:
                                                myVote?.vote === 1
                                                    ? "bold"
                                                    : "normal",
                                        }}
                                    >
                                        👍 Upvote
                                    </button>

                                    <button
                                        onClick={() =>
                                            createVote(
                                                generation.id,
                                                -1
                                            )
                                        }
                                        style={{
                                            padding: "8px 12px",
                                            cursor: "pointer",
                                            fontWeight:
                                                myVote?.vote === -1
                                                    ? "bold"
                                                    : "normal",
                                        }}
                                    >
                                        👎 Downvote
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </main>
    );
}