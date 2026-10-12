import { notFound } from "next/navigation";
import { FlappyPlayground } from "./playground";

// Dev only: the waiting game without making a generation first.
export default function FlappyDevPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <FlappyPlayground />;
}
