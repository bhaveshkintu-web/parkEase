import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import * as LucideIcons from "lucide-react";
import React from "react";

export interface IconOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    icon: {
      /**
       * Set an icon
       */
      setIcon: (name: string) => ReturnType;
    };
  }
}

export const Icon = Node.create<IconOptions>({
  name: "icon",

  group: "inline",

  inline: true,

  selectable: true,

  atom: true,

  priority: 10000,

  addAttributes() {
    return {
      name: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-icon"),
        renderHTML: (attributes) => {
          if (!attributes.name) {
            return {};
          }

          return {
            "data-icon": attributes.name,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "i[data-icon]",
        priority: 10000,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["i", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addCommands() {
    return {
      setIcon:
        (name: string) =>
          ({ commands }) => {
            return commands.insertContent({
              type: this.name,
              attrs: { name },
            });
          },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer((props) => {
      const iconName = props.node.attrs.name;
      
      // Attempt to find the icon component case-insensitively
      const findIcon = (name: string) => {
        if (!name) return null;
        
        // 1. Precise PascalCase lookup (Shield)
        const pascalName = name.charAt(0).toUpperCase() + name.slice(1);
        if ((LucideIcons as any)[pascalName]) return (LucideIcons as any)[pascalName];
        
        // 2. Exact match check (if user typed BarChart3)
        if ((LucideIcons as any)[name]) return (LucideIcons as any)[name];

        // 3. Fallback: case-insensitive search
        const lowered = name.toLowerCase();
        const found = Object.keys(LucideIcons).find(k => k.toLowerCase() === lowered);
        if (found) return (LucideIcons as any)[found];
        
        return null;
      };

      const LucideIcon = findIcon(iconName) || LucideIcons.HelpCircle;

      return (
        <NodeViewWrapper className="inline-block" as="span">
          <span
            className={`inline-flex items-center justify-center p-0.5 rounded hover:bg-muted cursor-pointer ring-offset-background transition-shadow ${
              props.selected ? "ring-2 ring-ring ring-offset-2 bg-muted" : ""
            }`}
            data-icon={iconName}
          >
            <LucideIcon size={18} />
          </span>
        </NodeViewWrapper>
      );
    });
  },
});
