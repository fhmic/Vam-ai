"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert } from "@/components/ui/form-alert";
import { LEGAL_SLUG_ROUTES } from "@/lib/legal/routes";
import { CAREER_LEVELS, COUNTRIES } from "@/lib/onboarding/constants";

const TIMEZONES = Intl.supportedValuesOf ? Intl.supportedValuesOf("timeZone") : ["UTC"];

const PRIMARY_GOALS = [
  "Improve Confidence",
  "Executive Presence",
  "Ace Interviews",
  "Improve Presentations",
  "Improve Meetings",
  "Become More Persuasive",
  "Leadership Communication",
] as const;

interface RequiredDocument {
  id: string;
  name: string;
  slug: string;
}

interface ReferenceOption {
  id: string;
  name: string;
}

/** Shared select styling — kept as one constant so every dropdown stays visually consistent. */
const SELECT_CLASSNAME =
  "h-11 w-full rounded-xl border border-ink/10 dark:border-white/10 px-3 text-sm outline-none " +
  "focus:border-signal-500 focus:ring-2 focus:ring-signal-500/30 bg-white dark:bg-ink-soft " +
  "text-ink dark:text-white";

export function OnboardingForm({
  defaultDisplayName,
  industries,
  functionalAreas,
  currentRoles,
  requiredDocuments,
}: {
  defaultDisplayName: string;
  industries: ReferenceOption[];
  functionalAreas: ReferenceOption[];
  currentRoles: ReferenceOption[];
  requiredDocuments: RequiredDocument[];
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );
  const [country, setCountry] = useState<string>("");
  const [organizationName, setOrganizationName] = useState("");
  const [industryId, setIndustryId] = useState<string>("");
  const [functionalAreaId, setFunctionalAreaId] = useState<string>("");
  const [currentRoleId, setCurrentRoleId] = useState<string>("");
  const [careerLevel, setCareerLevel] = useState<string>("");
  const [primaryGoal, setPrimaryGoal] = useState<string>("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (requiredDocuments.length > 0 && !legalAccepted) {
      setError("Please review and accept the required agreements to continue.");
      return;
    }

    setIsLoading(true);

    const res = await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        timezone,
        country: country || undefined,
        organizationName: organizationName || undefined,
        industryId: industryId || undefined,
        functionalAreaId: functionalAreaId || undefined,
        currentRoleId: currentRoleId || undefined,
        careerLevel: careerLevel || undefined,
        primaryGoal: primaryGoal || undefined,
        acceptedDocumentIds: requiredDocuments.map((doc) => doc.id),
      }),
    });

    setIsLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "Something went wrong. Please try again.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <FormAlert tone="error" message={error} /> : null}

      <div>
        <Label htmlFor="displayName">Full name</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          maxLength={80}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="country">Country</Label>
          <select
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={SELECT_CLASSNAME}
          >
            <option value="">Prefer not to say</option>
            {COUNTRIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <select
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className={SELECT_CLASSNAME}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="organizationName">Organization</Label>
        <Input
          id="organizationName"
          value={organizationName}
          onChange={(e) => setOrganizationName(e.target.value)}
          placeholder="e.g. Acme Bank"
          maxLength={160}
        />
      </div>

      <div>
        <Label htmlFor="industry">Industry</Label>
        <select
          id="industry"
          value={industryId}
          onChange={(e) => setIndustryId(e.target.value)}
          className={SELECT_CLASSNAME}
        >
          <option value="">Prefer not to say</option>
          {industries.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="functionalArea">Functional area</Label>
          <select
            id="functionalArea"
            value={functionalAreaId}
            onChange={(e) => setFunctionalAreaId(e.target.value)}
            className={SELECT_CLASSNAME}
          >
            <option value="">Prefer not to say</option>
            {functionalAreas.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="currentRole">Current role</Label>
          <select
            id="currentRole"
            value={currentRoleId}
            onChange={(e) => setCurrentRoleId(e.target.value)}
            className={SELECT_CLASSNAME}
          >
            <option value="">Prefer not to say</option>
            {currentRoles.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="careerLevel">Career level</Label>
        <select
          id="careerLevel"
          value={careerLevel}
          onChange={(e) => setCareerLevel(e.target.value)}
          className={SELECT_CLASSNAME}
        >
          <option value="">Prefer not to say</option>
          {CAREER_LEVELS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="primaryGoal">What&apos;s your primary goal?</Label>
        <select
          id="primaryGoal"
          value={primaryGoal}
          onChange={(e) => setPrimaryGoal(e.target.value)}
          className={SELECT_CLASSNAME}
        >
          <option value="">Prefer not to say</option>
          {PRIMARY_GOALS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {requiredDocuments.length > 0 ? (
        <div className="flex gap-3 rounded-xl border border-ink/10 dark:border-white/10 p-3">
          <input
            id="legalAccepted"
            type="checkbox"
            checked={legalAccepted}
            onChange={(e) => setLegalAccepted(e.target.checked)}
            required
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink/20 dark:border-white/20 text-signal-600
              focus:ring-signal-500"
          />
          <Label htmlFor="legalAccepted" className="mb-0 font-normal text-ink/70 dark:text-white/70">
            I have read and agree to the{" "}
            {requiredDocuments.map((doc, i) => (
              <span key={doc.id}>
                <Link
                  href={LEGAL_SLUG_ROUTES[doc.slug] ?? "#"}
                  target="_blank"
                  className="font-medium text-signal-600 underline hover:text-signal-700"
                >
                  {doc.name}
                </Link>
                {i < requiredDocuments.length - 2
                  ? ", "
                  : i === requiredDocuments.length - 2
                    ? ", and "
                    : ""}
              </span>
            ))}
            .
          </Label>
        </div>
      ) : null}

      <Button type="submit" className="w-full" isLoading={isLoading}>
        Continue
      </Button>
    </form>
  );
}
