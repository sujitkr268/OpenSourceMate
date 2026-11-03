"use client";
import { useId, useRef, useState, type KeyboardEvent } from "react";

const FAQ_ITEMS = [
  {
    question: "What data does OpenSourceMate use?",
    answer:
      "Only public GitHub data: your public profile and your public repositories, including their languages and topics. For your 5 most recently updated repositories that are not forks, it also reads the language breakdown and any package.json, requirements.txt or pyproject.toml file.",
  },
  {
    question: "Do I need to log in?",
    answer:
      "No. There is no sign-up and no GitHub login. Just enter a GitHub username and the analyzer reads that profile's public data.",
  },
  {
    question: "Are my private repositories read?",
    answer:
      "No. OpenSourceMate only calls GitHub's public endpoints, so private repositories are never seen or analyzed.",
  },
  {
    question: "How are my skills detected?",
    answer:
      "Each language used in your repositories counts once per repository. Dependencies from your manifest files and repository topics are mapped to frameworks and tools. These counts are turned into the percentages you see in your skill profile.",
  },
  {
    question: "Is my data stored?",
    answer:
      "No account or profile is saved. GitHub responses are only cached in memory for a few minutes so repeat searches are faster and stay within GitHub's rate limits.",
  },
  {
    question: "Is it free?",
    answer: "Yes. OpenSourceMate is free to use and open source under the MIT License.",
  },
];

export default function FAQ({ theme }: { theme: "dark" | "light" }) {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = FAQ_ITEMS.length - 1;
    let next: number | null = null;

    if (event.key === "ArrowDown") next = index === last ? 0 : index + 1;
    if (event.key === "ArrowUp") next = index === 0 ? last : index - 1;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = last;

    if (next !== null) {
      event.preventDefault();
      buttonRefs.current[next]?.focus();
    }
  };

  return (
    <div className="mx-auto mt-14 max-w-3xl space-y-3">
      {FAQ_ITEMS.map((item, index) => {
        const isOpen = openIndex === index;
        const buttonId = `${baseId}-question-${index}`;
        const panelId = `${baseId}-answer-${index}`;

        return (
          <div
            key={item.question}
            className={`rounded-2xl border transition-colors ${
              theme === "dark"
                ? "border-white/10 bg-white/[0.025]"
                : "border-gray-200 bg-white shadow-sm"
            }`}
          >
            <h3>
              <button
                ref={(element) => {
                  buttonRefs.current[index] = element;
                }}
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className={`flex w-full items-center justify-between gap-4 rounded-2xl px-6 py-5 text-left font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                  theme === "dark" ? "hover:bg-white/[0.03]" : "hover:bg-gray-50"
                }`}
              >
                {item.question}

                <span
                  aria-hidden="true"
                  className={`shrink-0 text-xl text-purple-400 transition-transform ${
                    isOpen ? "rotate-45" : ""
                  }`}
                >
                  +
                </span>
              </button>
            </h3>

            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className={`px-6 pb-5 text-sm leading-6 ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
