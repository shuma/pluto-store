import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { KNOWLEDGE_BASE } from "@/lib/knowledge-base";
export default function KnowledgeBase() {
  return (
    <>
      <h1 className="text-3xl font-semibold">Knowledge base.</h1>
      <p className="mb-8 mt-3 max-w-2xl text-sm text-muted-foreground">
        How your board, previews and uploads shape the artwork your customers
        receive.
      </p>
      <div className="grid max-w-5xl gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="Topics" className="self-start lg:sticky lg:top-6">
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {KNOWLEDGE_BASE.map((topic) => (
              <li key={topic.id}>
                <a
                  href={`#${topic.id}`}
                  className="block rounded-lg ring-1 ring-neutral-6-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:ring-transparent"
                >
                  {topic.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-12">
          {KNOWLEDGE_BASE.map((topic) => (
            <section
              key={topic.id}
              id={topic.id}
              aria-labelledby={`${topic.id}-title`}
              className="scroll-mt-6"
            >
              <h2
                id={`${topic.id}-title`}
                className="text-base font-semibold"
              >
                {topic.title}
              </h2>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">
                {topic.summary}
              </p>
              {/* Several can be open at once: this is a page to read, not a
                  compact widget beside something else. */}
              <Accordion type="multiple" className="shadow-[inset_0_var(--border-s)_0_var(--border)]">
                {topic.questions.map(({ question, answer }) => (
                  <AccordionItem key={question} value={question}>
                    <AccordionTrigger>{question}</AccordionTrigger>
                    <AccordionContent className="max-w-2xl text-muted-foreground">
                      {answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
