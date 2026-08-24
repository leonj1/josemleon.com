const slugify = (title) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const categories = ["Technical", "Managerial", "Personal", "Travel"];

const blogPosts = {
  Technical: [
    {
      title: "Git Ten Commandments",
      date: "2026-08-10",
      excerpt:
        "Ten non-negotiable rules for using Git effectively. Commit often, never merge broken code, write for future maintainers, and never rewrite public history.",
      body: [
        "Commit and push often and daily.",
        "Never merge broken code.",
        "Write meaningful commit messages for future maintainers.",
        "Never rewrite public history.",
        "Always pull before you push.",
        "Use branches for everything.",
        "Never commit secrets or credentials.",
        "Review your changes before merging.",
        "Never overwrite a commit on a pull request that has already been reviewed.",
        "Tag releases.",
      ],
    },
  ],
  Managerial: [
    {
      title: "Leading Engineering Teams at Scale",
      date: "2026-01-22",
      excerpt:
        "Principles for building and managing high-performing engineering organizations.",
    },
  ],
  Personal: [
    {
      title: "The Iterative Mindset",
      date: "2025-11-30",
      excerpt:
        "Why small changes and quick iterations lead to better outcomes.",
    },
  ],
  Travel: [
    {
      title: "Let the Event Pick the Destination",
      date: "2024-04-15",
      excerpt:
        "Why a trip built around an event you already want to see beats picking a city and hoping — and how a comedy show sent me to Atlanta.",
      body:
        "I found Andrew Schulz the way most people find comedians now: through a YouTube rabbit hole. A clip turned into a special, and by the end I wanted to see him live. The obvious move was New York — it's my city, and he tours it constantly. I pulled up his tour dates expecting to grab tickets for a local show.\n\nThat's when I noticed Atlanta.\n\nAtlanta had been on my list for a while. It's a beautiful, bustling city with a serious concentration of the tech industry — exactly the kind of place I wanted to see for myself. It was a destination I'd get around to eventually. But \"eventually\" is a trap. A city on a someday list tends to stay there.\n\nAndrew Schulz, though, was going to be in Atlanta. Suddenly the destination and the event lined up. I skipped the New York show and made Atlanta the trip.\n\nThe show was excellent — I'm glad I went, and seeing a comedian you actually like live is a different thing from watching clips. But the trip worked because the event anchored it. I stayed at the Waldorf Astoria, explored the city, and did something I'd never done: my first indoor skydiving. Atlanta lived up to the idea I had of it, and I got a show I wanted to see anyway.\n\nThe takeaway is simple: when you pick a destination alone, you're gambling. The city might deliver or it might not — roughly a coin flip. But when you pick an event you already want to see, and then pick the city around it, you stack the deck. The event is a sure thing. The city becomes the bonus. Even if the city falls flat, the event still made the trip worth it. You're far less likely to walk away disappointed.\n\nNext time you're deciding where to go, don't start with the map. Start with the calendar. Find the thing you'd buy a ticket to anyway, and let it pick the destination.",
    },
  ],
};

const postsWithSlugs = Object.fromEntries(
  Object.entries(blogPosts).map(([category, posts]) => [
    category,
    posts.map((post) => ({ ...post, slug: slugify(post.title) })),
  ])
);

const allPosts = Object.values(postsWithSlugs).flat();

function getPostBySlug(slug) {
  return allPosts.find((p) => p.slug === slug) ?? null;
}

export { categories, postsWithSlugs as blogPosts, getPostBySlug };
