import React from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $createTextNode,
  COMMAND_PRIORITY_CRITICAL,
  SELECTION_CHANGE_COMMAND,
  FORMAT_TEXT_COMMAND,
  $isRootNode
} from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode, $isHeadingNode } from '@lexical/rich-text';
import { $getNearestNodeOfType } from '@lexical/utils';
import { Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2, MessageSquare as MessageSquareReply, Undo, Redo,  } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { $createResponseNode } from '@/lexical/nodes/ResponseNode';

const ToolbarPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const [activeEditor, setActiveEditor] = React.useState(editor);
  const [isBold, setIsBold] = React.useState(false);
  const [isItalic, setIsItalic] = React.useState(false);
  const [isUnderline, setIsUnderline] = React.useState(false);
  const [blockType, setBlockType] = React.useState('paragraph');

  const updateToolbar = React.useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));

      const anchorNode = selection.anchor.getNode();
      const element = anchorNode.getKey() === 'root'
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();
      const elementKey = element.getKey();
      const elementDOM = activeEditor.getElementByKey(elementKey);

      if (elementDOM !== null) {
        if ($isHeadingNode(element)) {
          const tag = element.getTag();
          setBlockType(tag);
        } else {
          setBlockType('paragraph');
        }
      }
    }
  }, [activeEditor]);

  React.useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        updateToolbar();
        setActiveEditor(newEditor);
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor, updateToolbar]);

  const formatHeading = (headingSize) => {
    if (blockType !== headingSize) {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode(headingSize));
        }
      });
    } else {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createParagraphNode());
        }
      });
    }
  };
  
  const insertResponseField = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const root = editor.getEditorState().read(() => editor.getRootElement());
        const responseNodes = root ? root.getChildren().filter(node => node.getType() === 'response-node') : [];
        const newResponseId = responseNodes.length;

        const responseNode = $createResponseNode(newResponseId);
        selection.insertNodes([responseNode]);
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-100 border-b border-gray-300 rounded-t-lg">
      <Button variant="ghost" size="icon" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')} className={isBold ? 'bg-gray-300' : ''}>
        <Bold className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')} className={isItalic ? 'bg-gray-300' : ''}>
        <Italic className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')} className={isUnderline ? 'bg-gray-300' : ''}>
        <Underline className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => formatHeading('h1')} className={blockType === 'h1' ? 'bg-gray-300' : ''}>
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => formatHeading('h2')} className={blockType === 'h2' ? 'bg-gray-300' : ''}>
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={insertResponseField}>
        <MessageSquareReply className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ToolbarPlugin;
