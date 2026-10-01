"use client";

import { useState } from "react";
import { docsFor } from "@/components/ds/docs";
import { SUBJECT_KEYS, type SubjectKey } from "@/lib/ds/tokens.generated";
import s from "./showcase.module.css";

/**
 * A component's stories, live, with a subject picker for the ones that wear
 * one - so "what does this look like in a chemistry game" is one click.
 *
 * Client-side because the picker is state, and the stories are functions of
 * it. It looks the docs up by slug rather than taking them as a prop: a
 * function cannot cross from a server component to a client one.
 */
export function StoryBoard({ slug }: { slug: string }) {
  const docs = docsFor(slug);
  const [subject, setSubject] = useState<SubjectKey>("chemistry");
  if (!docs) return null;

  return (
    <section className={s.section} aria-labelledby="stories">
      <div className={s.toolbar}>
        <h2 id="stories" className={`${s.sectionTitle} type-t3`} style={{ flex: 1 }}>
          Stories
        </h2>
        {docs.accented && (
          <label className={`${s.toolbar} type-b3`} style={{ color: "var(--text-default-body)" }}>
            Subject
            <select
              className={`${s.select} type-b3`}
              value={subject}
              onChange={(e) => setSubject(e.target.value as SubjectKey)}
            >
              {SUBJECT_KEYS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      {docs.stories.map((story) => (
        <figure key={story.name} className={s.story}>
          <figcaption className={s.storyHead}>
            <span className={`${s.title} type-t5`}>{story.name}</span>
            {story.note && <span className={`${s.caption} type-c1`}>{story.note}</span>}
          </figcaption>
          <div className={`${s.storyCanvas} ${story.stack ? s.storyCanvasStack : ""}`}>
            {story.render({ subject })}
          </div>
        </figure>
      ))}
    </section>
  );
}
