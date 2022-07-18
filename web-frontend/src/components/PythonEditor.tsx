import React from 'react';
import { render } from 'react-dom';
import MonacoEditor, { ChangeHandler, EditorDidMount } from 'react-monaco-editor';
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";


function pythonMonarchDefs():monacoEditor.languages.IMonarchLanguage {
  // Difficulty: "Moderate"
  // Python language definition.
  // Only trickiness is that we need to check strings before identifiers
  // since they have letter prefixes. We also treat ':' as an @open bracket
  // in order to get auto identation.
  return {
    defaultToken: '',
    tokenPostfix: '.python',
    keywords: [
      'and',
      'as',
      'assert',
      'break',
      'class',
      'continue',
      'def',
      'del',
      'elif',
      'else',
      'except',
      'exec',
      'finally',
      'for',
      'from',
      'global',
      'if',
      'import',
      'in',
      'is',
      'lambda',
      'None',
      'not',
      'or',
      'pass',
      'print',
      'raise',
      'return',
      'self',
      'try',
      'while',
      'with',
      'yield',

      'int',
      'float',
      'long',
      'complex',
      'hex',

      'abs',
      'all',
      'any',
      'apply',
      'basestring',
      'bin',
      'bool',
      'buffer',
      'bytearray',
      'callable',
      'chr',
      'classmethod',
      'cmp',
      'coerce',
      'compile',
      'complex',
      'delattr',
      'dict',
      'dir',
      'divmod',
      'enumerate',
      'eval',
      'execfile',
      'file',
      'filter',
      'format',
      'frozenset',
      'getattr',
      'globals',
      'hasattr',
      'hash',
      'help',
      'id',
      'input',
      'intern',
      'isinstance',
      'issubclass',
      'iter',
      'len',
      'locals',
      'list',
      'map',
      'max',
      'memoryview',
      'min',
      'next',
      'object',
      'oct',
      'open',
      'ord',
      'pow',
      'print',
      'property',
      'reversed',
      'range',
      'raw_input',
      'reduce',
      'reload',
      'repr',
      'reversed',
      'round',
      'set',
      'setattr',
      'slice',
      'sorted',
      'staticmethod',
      'str',
      'sum',
      'super',
      'tuple',
      'type',
      'unichr',
      'unicode',
      'vars',
      'xrange',
      'zip',

      'True',
      'False',

      '__dict__',
      '__methods__',
      '__members__',
      '__class__',
      '__bases__',
      '__name__',
      '__mro__',
      '__subclasses__',
      '__init__',
      '__import__'
    ],

    brackets: [
      { open: '{', close: '}', token: 'delimiter.curly' },
      { open: '[', close: ']', token: 'delimiter.bracket' },
      { open: '(', close: ')', token: 'delimiter.parenthesis' }
    ],

    tokenizer: {
      root: [
        { include: '@whitespace' },
        { include: '@numbers' },
        { include: '@strings' },

        [/[,:;]/, 'delimiter'],
        [/[{}\[\]()]/, '@brackets'],

        [/@[a-zA-Z]\w*/, 'tag'],
        [/[a-zA-Z]\w*/, {
          cases: {
            '@keywords': 'keyword',
            '@default': 'identifier'
          }
        }]
      ],

      // Deal with white space, including single and multi-line comments
      whitespace: [
        [/\s+/, 'white'],
        [/(^#.*$)/, 'comment'],
        [/('''.*''')|(""".*""")/, 'string'],
        [/'''.*$/, 'string', '@endDocString'],
        [/""".*$/, 'string', '@endDblDocString']
      ],
      endDocString: [
        [/\\'/, 'string'],
        [/.*'''/, 'string', '@popall'],
        [/.*$/, 'string']
      ],
      endDblDocString: [
        [/\\"/, 'string'],
        [/.*"""/, 'string', '@popall'],
        [/.*$/, 'string']
      ],

      // Recognize hex, negatives, decimals, imaginaries, longs, and scientific notation
      numbers: [
        [/-?0x([abcdef]|[ABCDEF]|\d)+[lL]?/, 'number.hex'],
        [/-?(\d*\.)?\d+([eE][+\-]?\d+)?[jJ]?[lL]?/, 'number']
      ],

      // Recognize strings, including those broken across lines with \ (but not without)
      strings: [
        [/'$/, 'string.escape', '@popall'],
        [/'/, 'string.escape', '@stringBody'],
        [/"$/, 'string.escape', '@popall'],
        [/"/, 'string.escape', '@dblStringBody']
      ],
      stringBody: [
        [/[^\\']+$/, 'string', '@popall'],
        [/[^\\']+/, 'string'],
        [/\\./, 'string'],
        [/'/, 'string.escape', '@popall'],
        [/\\$/, 'string']
      ],
      dblStringBody: [
        [/[^\\"]+$/, 'string', '@popall'],
        [/[^\\"]+/, 'string'],
        [/\\./, 'string'],
        [/"/, 'string.escape', '@popall'],
        [/\\$/, 'string']
      ]
    }
  };
}

type PythonEditorProps = {
  initialCode: string,
  onChange: (s: string) => void
}

class PythonEditor extends React.Component<PythonEditorProps, {}> {
  private editor!: monacoEditor.editor.IStandaloneCodeEditor;

  constructor(props: PythonEditorProps) {
    super(props);
  }

  editorDidMount: EditorDidMount = (editor, monaco) => {

    monaco.languages.register({ id: "python3" });
    monaco.languages.setMonarchTokensProvider('python3', pythonMonarchDefs() )


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
        language="python3"
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
