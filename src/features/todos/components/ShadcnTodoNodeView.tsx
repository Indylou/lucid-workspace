import React, { useState, useEffect } from 'react';
import { NodeViewProps, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Checkbox } from '../../../components/ui/checkbox';

export const ShadcnTodoNodeView: React.FC<NodeViewProps> = (props) => {
  const { node, updateAttributes } = props;
  const { id, completed } = node.attrs;
  const [isChecked, setIsChecked] = useState(completed || false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsChecked(!!completed);
  }, [completed]);

  const handleCheckChange = (checked: boolean) => {
    setIsChecked(checked);
    setLoading(true);
    
    setTimeout(() => {
      try {
        updateAttributes({
          completed: checked,
          updatedAt: new Date().toISOString(),
        });
        
        const event = new CustomEvent('todoToggle', { 
          detail: { id, completed: checked } 
        });
        document.dispatchEvent(event);
      } catch (error) {
        console.error('Error toggling todo:', error);
      } finally {
        setLoading(false);
      }
    }, 0);
  };

  return (
    <NodeViewWrapper className="todo-wrapper">
      <div className="todo-checkbox">
        <Checkbox
          checked={isChecked}
          onCheckedChange={handleCheckChange}
          disabled={loading}
          className="h-4 w-4"
        />
      </div>
      <div className="todo-content">
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  );
}; 