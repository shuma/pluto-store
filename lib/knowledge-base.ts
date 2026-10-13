// These answers describe rules the app actually enforces — the eight image cap,
// the reading order the board saves, and the limits in verifyImage — so they
// need to be revisited whenever those change. Each topic id is also the anchor
// other pages link to, e.g. /dashboard/knowledge-base#board.
export const KNOWLEDGE_BASE = [
  {
    id: "board",
    title: "How your board works",
    summary: "What your reference images do and how the board is read.",
    questions: [
      {
        question: "What do my reference images actually do?",
        answer:
          "They teach the model your style, not your subject. Every customer’s photo is reimagined using the palette, texture and artistic treatment it finds across your board, so the result looks like your work even though the moment is theirs.",
      },
      {
        question: "How many images should I add?",
        answer:
          "Up to eight. A small, consistent set usually reads more clearly than eight images pulling in different directions — if two pieces disagree about palette or texture, the result tends to land somewhere in between.",
      },
      {
        question: "Does where I place an image on the board matter?",
        answer:
          "Yes. The board is read top to bottom and left to right, and that is the order your references reach the model, so the images nearer the top carry the most weight. Moving any image saves a new order for the whole board.",
      },
      {
        question: "What does “Not in use” mean?",
        answer:
          "Hiding an image with the eye button keeps it on your board but leaves it out of new artwork. It is the reversible option when you want to retire a look for a while without losing the image.",
      },
    ],
  },
  {
    id: "preview",
    title: "Previewing your style",
    summary: "Checking what customers will receive before they order.",
    questions: [
      {
        question: "Can I preview my style on my own photo?",
        answer:
          "Yes. Tap the small sample in the corner of the preview to upload a JPEG, PNG or WebP, the kind of photo your customers tend to send. It stays private, and the cross on it puts the built-in sample back. A new sample only takes effect when you refresh the preview.",
      },
    ],
  },
  {
    id: "uploads",
    title: "Uploading images",
    summary: "What files work and what happens to them on upload.",
    questions: [
      {
        question: "What can I upload?",
        answer:
          "JPEG, PNG or WebP files up to 10 MB, at least 256 pixels on each side. Larger, cleaner images give the model more to work from than small or heavily compressed ones.",
      },
      {
        question: "Why does my image look slightly cropped after uploading?",
        answer:
          "Artwork exported from drawing apps often arrives sitting inside a plain border. That uniform edge is trimmed on upload so the image fills its card properly. Only a border of a single flat colour is removed; the artwork itself is left alone.",
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy and rights",
    summary: "Who sees your images and what you need to own.",
    questions: [
      {
        question: "Will customers ever see these images?",
        answer:
          "No. Your reference images stay private and are never shown on your storefront. What customers see are your before-and-after examples: a photo and the artwork made from it. Add them under Your store, in the “Before and after” section, or publish a style preview from its full-size view with “Show on storefront”. A published preview includes its sample photo, so only use photos you have permission to show.",
      },
      {
        question: "What rights do I need to the images I add?",
        answer:
          "Only add images you made or have permission to license. They shape artwork that is sold to customers, so treat the board the way you would treat anything else you put your name on.",
      },
    ],
  },
];
