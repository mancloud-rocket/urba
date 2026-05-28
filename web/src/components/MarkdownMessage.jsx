import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function ListItem({ children, ordered }) {
  if (ordered) {
    return <li className="agent-md-oli">{children}</li>;
  }
  return (
    <li className="flex gap-2 leading-relaxed">
      <span className="text-accent font-bold shrink-0 select-none">•</span>
      <span className="flex-1 min-w-0">{children}</span>
    </li>
  );
}

const components = {
  h3: ({ children }) => (
    <h3 className="agent-md-h3">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-text-primary">{children}</strong>
  ),
  ul: ({ children }) => (
    <ul className="my-2 space-y-1.5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="agent-md-ol my-2 space-y-2">{children}</ol>
  ),
  li: ({ children, node }) => (
    <ListItem ordered={node?.parent?.tagName === "ol"}>{children}</ListItem>
  ),
};

export default function MarkdownMessage({ content }) {
  const text = String(content ?? "").trim();
  if (!text) return null;

  const hasMarkdown = /(^#{1,3}\s|^\s*[-*]\s|^\d+\.\s|(\*\*|__))/m.test(text);

  if (!hasMarkdown) {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }

  return (
    <div className="agent-markdown text-body text-text-secondary">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
