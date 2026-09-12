import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LegalFooter } from "@/components/layout/legal-footer";
import { WaveformBars } from "@/components/waveform/waveform-bars";
import { AvatarAva, AvatarElias, AvatarMorgan, AvatarNova, AvatarPriya, AvatarRiley } from "@/components/avatar/coach-avatars";

const MENTORS = [
  { Avatar: AvatarMorgan, name: "Morgan", style: "Direct & challenging" },
  { Avatar: AvatarAva, name: "Ava", style: "Calm & structured" },
  { Avatar: AvatarPriya, name: "Priya", style: "Balanced & analytical" },
  { Avatar: AvatarElias, name: "Elias", style: "Practice-first" },
  { Avatar: AvatarRiley, name: "Riley", style: "Adaptable companion" },
  { Avatar: AvatarNova, name: "Nova", style: "Encouraging & playful" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
        <span className="font-display text-lg font-medium text-ink">VAM</span>
        <nav className="flex items-center gap-3">
          <Link href="/sign-in" className="text-sm font-medium text-ink/60 hover:text-ink">
            Sign in
          </Link>
          <Link href="/sign-up">
            <Button size="sm">Get started</Button>
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:py-28">
          <div className="mb-6 flex justify-center">
            <WaveformBars className="h-10" />
          </div>
          <h1 className="font-display text-4xl font-medium leading-tight text-ink sm:text-5xl">
            Practice speaking up, before the moment that matters.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink/60">
            VAM is a voice mentor that trains your executive presence, interview answers, and
            hard conversations — then remembers where you left off and tracks how you&apos;re
            actually improving.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/sign-up">
              <Button size="lg">Start for free</Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="secondary">
                Sign in
              </Button>
            </Link>
          </div>
        </section>

        <section className="border-t border-ink/10 bg-white py-16">
          <div className="mx-auto max-w-4xl px-4">
            <p className="text-center text-sm font-medium uppercase tracking-wide text-ink/40">
              Meet your mentors
            </p>
            <p className="mx-auto mt-2 max-w-lg text-center text-sm text-ink/60">
              VAM matches you with the coaching style that fits how you want to be pushed —
              you&apos;ll meet whichever one suits your goal first.
            </p>
            <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3">
              {MENTORS.map(({ Avatar, name, style }) => (
                <div key={name} className="flex flex-col items-center text-center">
                  <Avatar className="h-20 w-20" />
                  <p className="mt-3 font-display text-base font-medium text-ink">{name}</p>
                  <p className="text-xs text-ink/50">{style}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-16">
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-ink/10 bg-white p-6">
              <p className="font-display text-lg font-medium text-ink">Talks back, in voice</p>
              <p className="mt-2 text-sm text-ink/60">
                Speak your practice answer out loud and hear a real spoken response back —
                switch between a male or female voice any time.
              </p>
            </div>
            <div className="rounded-2xl border border-ink/10 bg-white p-6">
              <p className="font-display text-lg font-medium text-ink">Remembers your goals</p>
              <p className="mt-2 text-sm text-ink/60">
                Set a goal once. VAM brings it back into the conversation without you repeating
                yourself every session.
              </p>
            </div>
            <div className="rounded-2xl border border-ink/10 bg-white p-6">
              <p className="font-display text-lg font-medium text-ink">Shows the trend, not just today</p>
              <p className="mt-2 text-sm text-ink/60">
                Assessments and action plans roll up into one place, so you can see whether
                you&apos;re actually getting better.
              </p>
            </div>
          </div>
        </section>
      </main>
      <LegalFooter />
    </div>
  );
}
