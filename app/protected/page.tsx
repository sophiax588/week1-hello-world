"use client";

import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function ProtectedPage() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (!data.user) {
                router.replace("/");
                return;
            }

            setUser(data.user);
            setLoading(false);
        });
    }, [router]);

    if (loading) {
        return <main>Loading...</main>;
    }

    return (
        <main
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "100vh",
                gap: "20px",
            }}
        >
            <h1>Protected Page</h1>
            <p>Only signed-in users can see this page.</p>
            <p>{user?.email}</p>

            <button
                onClick={() => router.push("/")}
                style={{
                    padding: "10px 18px",
                    fontSize: "16px",
                    cursor: "pointer",
                }}
            >
                Back Home
            </button>
        </main>
    );
}