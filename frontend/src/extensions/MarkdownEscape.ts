import { Extension, Mark } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

const MARKDOWN_SPECIAL_CHARS = [
    "*",
    "_",
    "`",
    "#",
    "[",
    "]",
    "~",
    ">",
    "!",
    "-",
    "+",
    "\\",
    "(",
    ")",
    "{",
    "}",
    ".",
    "|",
    "=",
    "^",
];

export const MarkdownEscapePluginKey = new PluginKey("markdownEscape");

export const EscapedChar = Mark.create({
    name: "escapedChar",

    parseHTML() {
        return [
            {
                tag: "span[data-escaped]",
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ["span", { ...HTMLAttributes, "data-escaped": "true" }, 0];
    },

    addAttributes() {
        return {
            char: {
                default: null,
            },
        };
    },
});

export const MarkdownEscape = Extension.create({
    name: "markdownEscape",

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: MarkdownEscapePluginKey,

                props: {
                    handleTextInput(view, from, _to, text) {
                        if (!MARKDOWN_SPECIAL_CHARS.includes(text)) {
                            return false;
                        }

                        const { state, dispatch } = view;
                        const { schema, storedMarks, selection } = state;

                        const codeMark = schema.marks.code;
                        if (codeMark) {
                            const activeMarks =
                                storedMarks || selection.$from.marks();
                            const hasCodeMark = activeMarks.some(
                                (mark) => mark.type === codeMark,
                            );
                            if (hasCodeMark) {
                                return false;
                            }

                            const isInCode = state.doc.rangeHasMark(
                                Math.max(0, from - 1),
                                from,
                                codeMark,
                            );
                            if (isInCode) {
                                return false;
                            }
                        }

                        const $pos = state.doc.resolve(from);
                        for (let d = $pos.depth; d > 0; d--) {
                            if ($pos.node(d).type.name === "codeBlock") {
                                return false;
                            }
                        }

                        const escapedMark = schema.marks.escapedChar;
                        if (!escapedMark) {
                            return false;
                        }

                        const mark = escapedMark.create({ char: text });
                        const tr = state.tr
                            .insertText(text, from, from)
                            .addMark(from, from + 1, mark);

                        dispatch(tr);
                        return true;
                    },
                },
            }),
        ];
    },
});
