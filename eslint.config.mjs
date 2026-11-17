import next from "eslint-config-next/core-web-vitals";
export default [
  ...next,
  { ignores: [".next/**", ".next-test/**", "node_modules/**", ".npm-cache/**"] },
  // These pages intentionally use document navigation to rebind the progressive enhancement script.
  { files:["app/**/*.tsx"], rules:{"@next/next/no-html-link-for-pages":"off"} }
];
