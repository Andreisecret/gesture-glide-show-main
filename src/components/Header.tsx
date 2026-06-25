import { Link } from "@tanstack/react-router";
import { Hand, Coffee, Presentation } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-border/60 bg-background/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 font-mono text-sm tracking-tight">
          <Hand className="size-5 text-primary" />
          <span className="font-semibold">gesturedeck</span>
        </Link>
        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-foreground" }}
              className="hover:text-foreground"
            >
              Upload
            </Link>
            <Link
              to="/google"
              activeProps={{ className: "text-foreground" }}
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <Presentation className="size-3.5" />
              Google Slides
            </Link>
            <Link
              to="/present"
              activeProps={{ className: "text-foreground" }}
              className="hover:text-foreground"
            >
              Present
            </Link>
            <Link
              to="/settings"
              activeProps={{ className: "text-foreground" }}
              className="hover:text-foreground"
            >
              Settings
            </Link>
            <Link
              to="/help"
              activeProps={{ className: "text-foreground" }}
              className="hover:text-foreground"
            >
              Help
            </Link>
          </nav>
          <a
            href="https://buymeacoffee.com/andreibos"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-yellow-500/10 px-3 py-1.5 text-sm font-medium text-yellow-500 transition-colors hover:bg-yellow-500/20"
          >
            <Coffee className="size-4" />
            Support
          </a>
        </div>
      </div>
    </header>
  );
}
