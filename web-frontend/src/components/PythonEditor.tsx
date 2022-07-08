import React from 'react';
import { render } from 'react-dom';
import MonacoEditor from 'react-monaco-editor';

type PythonEditorProps = {
    initialCode: string,
}



class PythonEditor extends React.Component<PythonEditorProps , {}> {
  state: { code: string };
  constructor(props: PythonEditorProps) {
    super(props);
    this.state = {
      code: props.initialCode
    }
  }
  editorDidMount(editor: any, monaco: any) {
    console.log('editorDidMount', editor);
    editor.focus();
  }

  onChange(newValue: any, e: any) {
    console.log('onChange', newValue, e);
  }

  render() {
    const code = this.state.code;
    const options = {
      selectOnLineNumbers: true
    };

    return (
      <MonacoEditor
        language="python"
        automaticLayout={true}
        theme="vs-dark"
        value={code}
        options={options}
        onChange={this.onChange}
        editorDidMount={this.editorDidMount}
      />
    );
  }
}

export default PythonEditor
