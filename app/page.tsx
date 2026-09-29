"use client";

import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function Home() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");

    useEffect(() => {
        // Check whether a user is already signed in
        supabase.auth.getUser().then(async ({ data }) => {
            setUser(data.user);

            if (data.user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("first_name, last_name")
                    .eq("id", data.user.id)
                    .single();

                if (profile) {
                    setFirstName(profile.first_name || "");
                    setLastName(profile.last_name || "");
                }
            }

            setLoading(false);
        });

        // Listen for login/logout changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            console.error("Google login error:", error.message);
        }
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error("Logout error:", error.message);
        }
    };

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
            <h1>Week 3 Authentication</h1>

            {user ? (
                <>
                    <h2>You're signed in!</h2>

                    <p>
                        Welcome, {firstName} {lastName}
                    </p>

                    <p>{user.email}</p>

                    <button
                        onClick={signOut}
                        style={{
                            padding: "12px 20px",
                            fontSize: "16px",
                            cursor: "pointer",
                        }}
                    >
                        Sign out
                    </button>
                </>
            ) : (
                <button
                    onClick={signInWithGoogle}
                    style={{
                        padding: "12px 20px",
                        fontSize: "16px",
                        cursor: "pointer",
                    }}
                >
                    Sign in with Google
                </button>
            )}
        </main>
    );
}