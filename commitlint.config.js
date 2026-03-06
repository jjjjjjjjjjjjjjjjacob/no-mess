export default {
  extends: ["@commitlint/config-conventional"],
  ignores: [
    (commit) => commit.includes("Co-authored-by: coderabbitai[bot]"),
    (commit) => /^Merge\b/.test(commit),
    (commit) => /^.+\(#\d+\)$/.test(commit.split("\n")[0]),
  ],
};
