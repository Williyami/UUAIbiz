import { ArrowDown } from "lucide-react";

/*
 * The first-meeting script with a company, drawn as a flow: a shared opening,
 * one discovery question, then two branches depending on what the company is
 * after. Figures, programmes, partners and past events come from the
 * Partnership Overview PDF (public/UUAIS-Partnership-Overview.pdf) — update
 * both together when the deck is refreshed.
 */

type Step = {
  title: string;
  minutes?: string;
  points: React.ReactNode[];
  say?: string;
};

const OPENING: Step[] = [
  {
    title: "Small talk",
    minutes: "1–2 min",
    points: [
      "Thank them for taking the time, and check how long they have.",
      "Something light: how their week is going, their role, how they came across UUAIS.",
    ],
  },
  {
    title: "Who we are",
    minutes: "3–5 min",
    say: "UU AI Society is a student-led, non-profit society at Uppsala University for students who want to learn and apply AI, connecting them with the companies shaping it.",
    points: [
      <>
        <b>Reach:</b> 462 members, about 1,100 followers on LinkedIn and 600 on Instagram, and 12
        events this year. Founded April 2025.
      </>,
      <>
        <b>Who our members study:</b> Data Science &amp; Machine Learning, Engineering Physics,
        Computer Science, and Industrial Engineering &amp; Management are the largest programmes.
      </>,
      <>
        <b>Who we have worked with:</b> Anthropic, NVIDIA, AWS, Lovable and Ericsson, plus Modulai,
        Scaleout Systems and Unibap Space Solutions.
      </>,
      <>
        <b>Two or three past events:</b> the National AI Startup Competition with Anthropic, NVIDIA,
        AWS and Lovable; a federated machine learning workshop with Scaleout Systems; a study visit
        to Ericsson's Stockholm HQ.
      </>,
      <>
        <b>What we usually run:</b> lunch lectures, evening workshops, case evenings, fireside chats
        and panels, study visits, hackathons, and guest lectures.
      </>,
      <>
        <b>Longer term:</b> mention that we also offer partnerships for companies that want an
        ongoing relationship rather than a single event.
      </>,
    ],
  },
  {
    title: "Their questions",
    minutes: "as needed",
    points: [
      "Let them ask anything about the society, our members, or past events.",
      "Answer from the Partnership Overview; offer to follow up in writing on anything you're unsure of.",
    ],
  },
];

const DISCOVERY: Step = {
  title: "Ask what they want out of it",
  say: "What are you hoping to get out of an event or partnership with us?",
  points: [
    "Listen for the goal: meeting students, showing their tech, a specific problem, or recruiting.",
    "Take notes in their company's Outreach entry while it's fresh.",
  ],
};

// Goal they mention → the format to suggest
const FORMAT_FIT: [string, string][] = [
  ["Introduce the company to students", "Lunch lecture"],
  ["Show their tools, data or tech", "Evening workshop"],
  ["A real problem they want ideas on", "Case evening or hackathon"],
  ["Show their culture and office", "Study visit"],
  ["Share expertise or research", "Fireside chat, panel or guest lecture"],
];

type Branch = {
  when: string;
  pitch: Step;
  close: Step;
  after: Step[];
};

const BRANCHES: Branch[] = [
  {
    when: "They want an event",
    pitch: {
      title: "Suggest an event format",
      points: [
        <FormatTable key="fit" />,
        "Keep it to one or two concrete options; the details get shaped together later.",
      ],
    },
    close: {
      title: "Thank them and wrap up",
      say: "Thanks for your time. We'll put together a concrete suggestion and get back to you by email.",
      points: ["Agree on who their contact person is for the follow-up."],
    },
    after: [
      {
        title: "Plan a concrete suggestion",
        points: ["Format, rough date, topic, and what we handle versus what they bring."],
      },
      {
        title: "Email the proposal",
        points: ["Send it within a few days while the conversation is still fresh."],
      },
      {
        title: "If they like it, book a meeting to confirm",
        points: ["Then create the event in Events and log the meeting under Meetings."],
      },
    ],
  },
  {
    when: "They mostly talk about hiring or employer branding",
    pitch: {
      title: "Pitch a partnership",
      say: "If hiring and visibility are the goal, a partnership gets you in front of our members all year, not just at one event.",
      points: [
        "Logo placement and visibility across the semester or year.",
        "Distribution of their job postings to our members.",
        "Engagement with students across several events.",
      ],
    },
    close: {
      title: "Thank them and wrap up",
      say: "Thanks for your time. I'll send over our partnership tiers so you can have a look.",
      points: [],
    },
    after: [
      {
        title: "Send the price list",
        points: [
          <>
            Email the <b>Partnership Tiers</b> PDF (above) with a short recap of the call.
          </>,
        ],
      },
      {
        title: "Let them review",
        points: ["Give them time, then follow up if you haven't heard back in about a week."],
      },
    ],
  },
];

export function MeetingPlaybook() {
  return (
    <section className="border bg-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-5 py-4">
        <div>
          <h2 className="font-display text-base font-medium tracking-tight">
            First meeting with a company
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            The usual flow for an intro call, and where it goes depending on what they want.
          </p>
        </div>
        <span className="microlabel text-[10px] text-muted-foreground">About 20–30 min</span>
      </div>

      <div className="p-5">
        {/* Shared opening */}
        <ol className="mx-auto max-w-3xl">
          {OPENING.map((step, i) => (
            <li key={step.title}>
              <StepCard step={step} n={i + 1} />
              <Connector />
            </li>
          ))}
          <li>
            <StepCard step={DISCOVERY} n={OPENING.length + 1} accent />
          </li>
        </ol>

        {/* The split: a stem down from the question, then a bar across both branches */}
        <div aria-hidden className="mx-auto flex h-6 max-w-3xl justify-center">
          <span className="w-px bg-border" />
        </div>
        <div aria-hidden className="hidden h-6 md:block">
          <div className="mx-[25%] h-full border-x border-t" />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {BRANCHES.map((b, bi) => (
            <ol key={b.when} className="space-y-0">
              <li className="mb-3 text-center">
                <span className="inline-block border border-(--brand-red)/40 bg-(--brand-red)/5 px-3 py-1.5 text-xs font-medium text-(--brand-red)">
                  {bi === 0 ? "A" : "B"} · {b.when}
                </span>
              </li>
              <li>
                <StepCard step={b.pitch} n={OPENING.length + 2} />
                <Connector />
              </li>
              <li>
                <StepCard step={b.close} n={OPENING.length + 3} />
                <Connector label="After the meeting" />
              </li>
              {b.after.map((step, i) => (
                <li key={step.title}>
                  <StepCard step={step} muted />
                  {i < b.after.length - 1 && <Connector />}
                </li>
              ))}
            </ol>
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({
  step,
  n,
  accent,
  muted,
}: {
  step: Step;
  n?: number;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`border px-4 py-3 ${
        accent ? "border-(--brand-red)/50 bg-(--brand-red)/5" : muted ? "bg-muted/30" : "bg-card"
      }`}
    >
      <div className="flex items-baseline gap-2.5">
        {n !== undefined && (
          <span
            className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
              accent ? "bg-(--brand-red) text-white" : "bg-foreground/85 text-background"
            }`}
          >
            {n}
          </span>
        )}
        <h3 className="text-sm font-semibold">{step.title}</h3>
        {step.minutes && (
          <span className="microlabel ml-auto shrink-0 text-[9.5px] text-muted-foreground">
            {step.minutes}
          </span>
        )}
      </div>
      {step.say && (
        <p className="mt-2 border-l-2 border-(--brand-red)/60 pl-3 text-sm italic text-foreground/85">
          “{step.say}”
        </p>
      )}
      {step.points.length > 0 && (
        <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-foreground/85">
          {step.points.map((p, i) =>
            typeof p === "string" ? (
              <li key={i} className="flex gap-2">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>{p}</span>
              </li>
            ) : (
              <li key={i} className="flex gap-2">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" />
                <span className="min-w-0 flex-1">{p}</span>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function Connector({ label }: { label?: string }) {
  return (
    <div aria-hidden className="flex flex-col items-center py-1 text-muted-foreground">
      <span className="h-2 w-px bg-border" />
      {label ? <span className="microlabel my-0.5 text-[9.5px]">{label}</span> : null}
      <ArrowDown className="h-3 w-3" />
    </div>
  );
}

function FormatTable() {
  return (
    <div>
      <div className="mb-1.5">Match the format to what they said:</div>
      <table className="w-full text-[12.5px]">
        <tbody className="divide-y">
          {FORMAT_FIT.map(([goal, format]) => (
            <tr key={goal}>
              <td className="py-1 pr-3 text-muted-foreground">{goal}</td>
              <td className="py-1 text-right font-medium">{format}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
