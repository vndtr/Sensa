declare module 'rn-text-touch-highlight' {
  import { Component } from 'react';
  import { TextProps, ViewStyle, TextStyle } from 'react-native';

  interface HighlightData {
    id: string;
    text: string;
    start: number;
    end: number;
  }

  interface HighlightTextProps {
    text: string;
    highlightColor?: string;
    highlightedTextColor?: string;
    textStyle?: TextStyle;
    highlightStyle?: ViewStyle;
    highlightInitialDelay?: number;
    onHighlightStart?: (id: string) => void;
    onHighlightEnd?: (id: string) => void;
    onHighlightTapped?: (id: string) => void;
    initialHighlightData?: HighlightData[];
  }

  export class HighlightText extends Component<HighlightTextProps> {
    getHighlightedData: () => HighlightData[];
    clearHighlights: () => void;
    setInitialHighlightData: (data: HighlightData[]) => void;
  }
}