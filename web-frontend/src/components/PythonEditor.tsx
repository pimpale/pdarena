import React from 'react';
import { render } from 'react-dom';
import MonacoEditor, { ChangeHandler, EditorDidMount } from 'react-monaco-editor';
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";

type PythonEditorProps = {
  code: string,
  setCode: (s:string)=>void
}

class PythonEditor extends React.Component<PythonEditorProps, {}> {
  private code: string;
  private editor!: monacoEditor.editor.IStandaloneCodeEditor;

  constructor(props: PythonEditorProps) {
    super(props);
    this.code = props.code;
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

  };

  onChange: ChangeHandler = (newValue, e) => {
    //this.props.setCode(newValue);
  }

  render() {
    const options = {
      selectOnLineNumbers: true
    };

    return (
      <MonacoEditor
        language="python"
        theme="vs-dark"
        value={this.code}
        options={options}
        onChange={this.onChange}
        editorDidMount={this.editorDidMount}
      />
    );
  }
}

export default PythonEditor
