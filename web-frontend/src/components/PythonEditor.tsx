import React from 'react';
import { render } from 'react-dom';
import MonacoEditor, { ChangeHandler, EditorDidMount } from 'react-monaco-editor';
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";

type PythonEditorProps = {
  initialCode: string,
  onChange: (s:string)=>void
}

class PythonEditor extends React.Component<PythonEditorProps, {}> {
  private editor!: monacoEditor.editor.IStandaloneCodeEditor;

  constructor(props: PythonEditorProps) {
    super(props);
  }

  editorDidMount: EditorDidMount = (editor, monaco) => {
    this.editor = editor;
    const parentElement = editor.getDomNode()?.parentElement;
    if (parentElement) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentBoxSize) {
            this.editor.layout();
          }
        }
      });
      observer.observe(parentElement);
    }
    this.props.onChange(this.props.initialCode);
  };

  onChange: ChangeHandler = (newValue, e) => {
    this.props.onChange(newValue);
  }

  render() {
    const options = {
      selectOnLineNumbers: true
    };

    return (
      <MonacoEditor
        language="python"
        theme="vs-dark"
        defaultValue={this.props.initialCode}
        options={options}
        onChange={this.onChange}
        editorDidMount={this.editorDidMount}
      />
    );
  }
}

export default PythonEditor
