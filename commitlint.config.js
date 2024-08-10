module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "subs",
        "admin",
        "content",
        "feat",
        "fix",
        "blog",
        "ci",
        "script",
        "refactor",
        "config",
        "chore",
        "build",
      ],
    ],
    "scope-empty": [2, "never"],
    "subject-case": [2, "always", "sentence-case"],
  },
};
