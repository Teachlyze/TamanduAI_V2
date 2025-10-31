
import React from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { ResponseNode } from './nodes/ResponseNode';
import ToolbarPlugin from './plugins/ToolbarPlugin';

const editorTheme = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
  },
  list: {
    nested: {
      listitem: 'editor-nested-listitem',
    },
    ol: 'editor-list-ol',
    ul: 'editor-list-ul',
    listitem: 'editor-listitem',
  },
  link: 'editor-link',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    underline: 'editor-text-underline',
  },
};

function EditorErrorBoundary(error) {
  return <div>Ocorreu um erro no editor: {error.message}</div>;
}

const LexicalEditor = ({ onChange, initialConfig = {}, showToolbar = true }) => {
  const baseConfig = {
    namespace: 'TamanduAI-Editor',
    theme: editorTheme,
    onError: (error) => console.error(error),
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      AutoLinkNode,
      LinkNode,
      ResponseNode,
    ],
  };

  const finalConfig = { ...baseConfig, ...initialConfig };

  return (
    <LexicalComposer initialConfig={finalConfig}>
      <div className="lexical-container relative bg-white border border-gray-300 rounded-lg">
        {showToolbar && <ToolbarPlugin />}
        <div className="relative">
          <RichTextPlugin
            contentEditable={<ContentEditable className="editor-input min-h-[150px] p-4 outline-none resize-y" />}
            placeholder={<div className="editor-placeholder absolute top-4 left-4 text-gray-400 pointer-events-none">Comece a escrever...</div>}
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        {onChange && <OnChangePlugin onChange={(editorState) => onChange(JSON.stringify(editorState))} />}
      </div>
    </LexicalComposer>
  );
};

export default LexicalEditor;
