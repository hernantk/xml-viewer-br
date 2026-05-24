import { useMemo } from "react";

interface Props {
  xml: string;
}

function formatXml(xml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const serializer = new XMLSerializer();
  const serialized = serializer.serializeToString(doc);
  let formatted = "";
  let indent = 0;
  const tab = "  ";
  for (let i = 0; i < serialized.length; i++) {
    const ch = serialized[i];
    if (ch === "<" && serialized[i + 1] === "/") {
      indent--;
      formatted += "\n" + tab.repeat(Math.max(0, indent)) + ch;
    } else if (ch === "<" && (serialized[i + 1] === "?" || serialized[i + 1] === "!")) {
      formatted += ch;
    } else if (ch === "<") {
      formatted += "\n" + tab.repeat(indent) + ch;
      indent++;
    } else if (ch === ">" && (serialized[i - 1] === "/" || serialized[i - 1] === "?")) {
      formatted += ch;
      indent--;
    } else if (ch === ">" && serialized[i - 1] !== "'" && serialized[i - 1] !== '"') {
      formatted += ch;
    } else {
      formatted += ch;
    }
  }
  return formatted.trim();
}

export function GenericXmlViewer({ xml }: Props) {
  const formattedXml = useMemo(() => {
    try {
      return formatXml(xml);
    } catch {
      return xml;
    }
  }, [xml]);

  return (
    <div className="w-full overflow-auto">
      <pre className="text-[11px] leading-relaxed font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-all select-all">
        {formattedXml}
      </pre>
    </div>
  );
}
