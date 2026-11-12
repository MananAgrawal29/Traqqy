
import { useState, type FormEvent } from "react";
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    // Intentionally frontend-only. Nothing is stored or transmitted.
    setSubmitted(true);
    setError("");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-7 w-7" />
          </div>

          <p className="text-sm font-medium text-primary">
            SOMETHING GOOD IS COMING
          </p>

          <h1 className="text-4xl font-semibold tracking-tight">
            A better way to track subscriptions.
          </h1>

          <p className="text-muted-foreground">
            Traqqy is getting ready for launch. Leave your email and be part
            of the excitement.
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
              placeholder="Enter your email address"
              autoComplete="email"
              required
              className="w-full h-12 rounded-xl border bg-background px-4 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
            />

            {error && (
              <p className="text-sm text-destructive text-left">{error}</p>
            )}

            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 transition hover:opacity-90"
            >
              Join the waitlist
              <ArrowRight className="h-4 w-4" />
            </button>

            <p className="text-xs text-muted-foreground">
              No spam. Just a little excitement for what's coming.
            </p>
          </form>
        ) : (
          <div className="rounded-2xl border bg-card p-7 space-y-3">
            <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />

            <h2 className="text-xl font-semibold">
              You're on the list!
            </h2>

            <p className="text-sm text-muted-foreground">
              Thanks for your interest in Traqqy. See you at launch!
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Traqqy
        </p>
      </div>
    </main>
  );
}
