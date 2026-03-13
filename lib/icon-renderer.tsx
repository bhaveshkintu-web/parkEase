
import * as LucideIcons from "lucide-react";
import parse, {HTMLReactParserOptions, Element } from "html-react-parser";

/**
 * Reusable component to render HTML content that might contain <i data-icon="..."></i> tags.
 */
export const IconRenderer = ({ html }: { html: string }) => {
  const options: HTMLReactParserOptions = {
    replace: (domNode) => {
      if (
        domNode instanceof Element &&
        domNode.name === "i" &&
        domNode.attribs["data-icon"]
      ) {
        const iconName = domNode.attribs["data-icon"];
        
        // Robust lookup logic
        const findIcon = (name: string) => {
          if (!name) return null;
          const pascalName = name.charAt(0).toUpperCase() + name.slice(1);
          if ((LucideIcons as any)[pascalName]) return (LucideIcons as any)[pascalName];
          if ((LucideIcons as any)[name]) return (LucideIcons as any)[name];
          const lowered = name.toLowerCase();
          const found = Object.keys(LucideIcons).find(k => k.toLowerCase() === lowered);
          if (found) return (LucideIcons as any)[found];
          return null;
        };

        const LucideIcon = findIcon(iconName) || LucideIcons.HelpCircle;
        
        return (
          <span className="inline-flex items-center justify-center translate-y-[-1px] mx-1">
            <LucideIcon size={18} />
          </span>
        );
      }
      return undefined;
    },
  };

  return <>{parse(html, options)}</>;
};

/**
 * Simple helper to replace data-icon tags in a string with a placeholder or just clean them up.
 * Useful for non-React contexts if needed.
 */
export function processIconHtml(html: string): string {
    // This could be used for plain string manipulation if React rendering isn't available
    return html; 
}
