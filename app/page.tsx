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
    const [avatarUrl, setAvatarUrl] = useState("");

    useEffect(() => {
        // Check whether a user is already signed in
        supabase.auth.getUser().then(async ({ data }) => {
            setUser(data.user);

            if (data.user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("first_name, last_name, avatar_url")
                    .eq("id", data.user.id)
                    .single();

                if (profile) {
                    setFirstName(profile.first_name || "");
                    setLastName(profile.last_name || "");
                    setAvatarUrl(profile.avatar_url || "");
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

    const saveProfile = async () => {
        if (!user) return;

        const { error } = await supabase
            .from("profiles")
            .update({
                first_name: firstName,
                last_name: lastName,
                avatar_url: avatarUrl,
            })
            .eq("id", user.id);

        if (error) {
            console.error("Profile update error:", error.message);
            alert("Could not save profile.");
        } else {
            alert("Profile saved!");
        }
    };

    const uploadAvatar = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        if (!user) return;

        const file = event.target.files?.[0];

        if (!file) return;

        const fileExtension = file.name.split(".").pop();
        const filePath = `${user.id}/avatar.${fileExtension}`;

        const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, file, {
                upsert: true,
            });

        if (uploadError) {
            console.error("Avatar upload error:", uploadError.message);
            alert("Could not upload photo.");
            return;
        }

        const { data } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);

        const newAvatarUrl = data.publicUrl;

        setAvatarUrl(newAvatarUrl);

        const { error: profileError } = await supabase
            .from("profiles")
            .update({
                avatar_url: newAvatarUrl,
            })
            .eq("id", user.id);

        if (profileError) {
            console.error("Profile photo error:", profileError.message);
            alert("Photo uploaded, but profile could not be updated.");
        } else {
            alert("Photo uploaded!");
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

                    <h2>Profile</h2>

                    {avatarUrl && (
                        <img
                            src={avatarUrl}
                            alt="Profile"
                            width={120}
                            height={120}
                            style={{
                                borderRadius: "50%",
                                objectFit: "cover",
                            }}
                        />
                    )}

                    <input
                        type="file"
                        accept="image/*"
                        onChange={uploadAvatar}
                    />

                    <input
                        type="text"
                        placeholder="First name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                    />

                    <input
                        type="text"
                        placeholder="Last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                    />

                    <button
                        onClick={saveProfile}
                        style={{
                            padding: "10px 18px",
                            fontSize: "16px",
                            cursor: "pointer",
                        }}
                    >
                        Save Profile
                    </button>

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