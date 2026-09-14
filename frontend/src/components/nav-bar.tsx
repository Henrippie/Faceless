import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Clapperboard, LayoutGrid, Radio } from "lucide-react";

export async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Clapperboard className="h-5 w-5 text-amber-400" />
          <span>Central de Canais Dark</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <LayoutGrid className="h-4 w-4" />
              Vídeos
            </Button>
          </Link>
          <Link href="/channels">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <Radio className="h-4 w-4" />
              Canais
            </Button>
          </Link>
          {user ? (
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit">
                Sair
              </Button>
            </form>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
