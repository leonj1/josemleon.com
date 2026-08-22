const slugify = (title) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const categories = ["Technical", "Managerial", "Personal"];

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
    {
      title: "Multi-Agent Systems in Production",
      date: "2025-12-08",
      excerpt:
        "Practical approaches to deploying autonomous agent frameworks.",
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
