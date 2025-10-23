
import { DecoratorNode } from 'lexical';

export class ResponseNode extends DecoratorNode {
  __responseId;

  static getType() {
    return 'response-node';
  }

  static clone(node) {
    return new ResponseNode(node.__responseId, node.__key);
  }
  
  static importJSON(serializedNode) {
    const node = $createResponseNode(serializedNode.responseId);
    return node;
  }

  exportJSON() {
    return {
      type: 'response-node',
      version: 1,
      responseId: this.__responseId,
    };
  }

  constructor(responseId, key) {
    super(key);
    this.__responseId = responseId;
  }

  createDOM(config) {
    const div = document.createElement('div');
    div.style.border = '1px dashed #ccc';
    div.style.borderRadius = '4px';
    div.style.padding = '8px';
    div.style.margin = '8px 0';
    div.style.backgroundColor = '#f9f9f9';
    div.textContent = `[Campo para Resposta Aberta #${this.__responseId + 1}]`;
    return div;
  }

  updateDOM() {
    return false;
  }

  decorate() {
    return null;
  }
}

export function $createResponseNode(responseId) {
  return new ResponseNode(responseId);
}

export function $isResponseNode(node) {
  return node instanceof ResponseNode;
}
