declare module 'react-native-selectable-text' {
  import { Component } from 'react';
  import { TextInputProps } from 'react-native';

  interface SelectableTextProps extends TextInputProps {
    value: string;
    onSelection?: (event: any) => void;
  }

  export class SelectableText extends Component<SelectableTextProps> {}
}