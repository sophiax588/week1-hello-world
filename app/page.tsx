import { createClient } from "@supabase/supabase-js";

export default async function Home() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    const { data: games, error } = await supabase
        .from("favorite_games")
        .select("*")
        .order("id");

    if (error) {
        return <main>Error loading games: {error.message}</main>;
    }

    return (
        <main>
            <h1>My Favorite Games</h1>

            <ul>
                {games?.map((game) => (
                    <li key={game.id}>{game.name}</li>
                ))}
            </ul>
        </main>
    );
}