import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface BookTextProps {
  text: string;
  fontSize?: number;
  backgroundColor?: string;
  onSelection?: (text: string, start: number, end: number, x: number, y: number, isNearBottom: boolean) => void;
}

export interface BookTextRef {
  applyHighlight: (color: string, start: number, end: number) => void;
  applyUnderline: (color: string, start: number, end: number) => void;
  applyAllHighlights: (highlights: Array<{ type: 'highlight' | 'underline', color: string, start: number, end: number }>) => void;
  clearSelection: () => void;
  scrollToPosition: (startIndex: number) => void;
  clearAllHighlights: () => void;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br/>');
}

// Определение цвета текста в зависимости от фона
function getTextColor(backgroundColor: string): string {
  const lightColors = ['#ffffff', '#f5f0e6', '#fff8f0', '#fef9e6'];
  if (lightColors.includes(backgroundColor.toLowerCase())) {
    return '#000000';
  }
  return '#e2e8f0';
}

const BookText = forwardRef<BookTextRef, BookTextProps>(({ 
  text, 
  fontSize = 16, 
  backgroundColor = '#ffffff', 
  onSelection 
}, ref) => {
  const webViewRef = useRef<WebView>(null);
  const textColor = getTextColor(backgroundColor);
  const safeText = escapeHtml(text);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
        <style>
          * {
            -webkit-touch-callout: none;
            -webkit-user-select: text;
            user-select: text;
          }
          
          body {
            font-size: ${fontSize}px;
            line-height: 1.6;
            padding: 16px;
            margin: 0;
            padding-bottom: 300px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: ${backgroundColor};
            color: ${textColor};
          }
          
          ::selection {
            background-color: rgba(255, 179, 71, 0.4);
          }
          
          /* Цвета для выделения цитат (фоновое выделение) */
          .highlight-yellow { background-color: #fde047; color: #1e293b; }
          .highlight-green { background-color: #86efac; color: #1e293b; }
          .highlight-blue { background-color: #7dd3fc; color: #1e293b; }
          .highlight-pink { background-color: #f9a8d4; color: #1e293b; }
          .highlight-gray { background-color: #d1d5db; color: #1e293b; }
          
          /* Цвета для подчёркивания заметок */
          .underline-yellow { border-bottom: 3px solid #fde047; }
          .underline-green { border-bottom: 3px solid #86efac; }
          .underline-blue { border-bottom: 3px solid #7dd3fc; }
          .underline-pink { border-bottom: 3px solid #f9a8d4; }
          .underline-gray { border-bottom: 3px solid #d1d5db; }
          
          /* Анимация подсветки при прокрутке */
          @keyframes flash {
            0% { opacity: 0.4; }
            50% { opacity: 1; }
            100% { opacity: 0.4; }
          }
          .highlight-flash {
            animation: flash 1s ease-in-out 2;
            border-radius: 4px;
          }
        </style>
        <script>
          let selectionTimeout = null;
          let lastSelectionText = '';
          
          // Создание диапазона по глобальным индексам
          function createRangeByIndices(start, end) {
            const body = document.body;
            let currentPos = 0;
            const range = document.createRange();
            
            function findNodeAndOffset(node, targetPos) {
              if (node.nodeType === Node.TEXT_NODE) {
                const nodeLength = node.textContent.length;
                if (targetPos >= currentPos && targetPos <= currentPos + nodeLength) {
                  return { node, offset: targetPos - currentPos };
                }
                currentPos += nodeLength;
                return null;
              }
              
              for (let i = 0; i < node.childNodes.length; i++) {
                const result = findNodeAndOffset(node.childNodes[i], targetPos);
                if (result) return result;
              }
              return null;
            }
            
            const startResult = findNodeAndOffset(body, start);
            currentPos = 0;
            const endResult = findNodeAndOffset(body, end);
            
            if (startResult && endResult) {
              range.setStart(startResult.node, startResult.offset);
              range.setEnd(endResult.node, endResult.offset);
              return range;
            }
            return null;
          }
          
          // Применение фонового выделения (для цитат)
          window.applyHighlight = function(color, start, end) {
            const range = createRangeByIndices(start, end);
            if (range) {
              const span = document.createElement('span');
              span.className = 'highlight-' + color;
              span.setAttribute('data-id', 'hl_' + Date.now() + '_' + Math.random());
              try {
                range.surroundContents(span);
                return true;
              } catch(e) {
                console.error('Highlight error:', e);
                return false;
              }
            }
            return false;
          };
          
          // Применение подчёркивания (для заметок)
          window.applyUnderline = function(color, start, end) {
            const range = createRangeByIndices(start, end);
            if (range) {
              const span = document.createElement('span');
              span.className = 'underline-' + color;
              span.setAttribute('data-id', 'ul_' + Date.now() + '_' + Math.random());
              try {
                range.surroundContents(span);
                return true;
              } catch(e) {
                console.error('Underline error:', e);
                return false;
              }
            }
            return false;
          };
          
          // Применение всех выделений сразу
          window.applyAllHighlights = function(highlights) {
            let successCount = 0;
            for (let i = 0; i < highlights.length; i++) {
              const hl = highlights[i];
              if (hl.type === 'highlight') {
                if (window.applyHighlight(hl.color, hl.start, hl.end)) successCount++;
              } else if (hl.type === 'underline') {
                if (window.applyUnderline(hl.color, hl.start, hl.end)) successCount++;
              }
            }
            return successCount;
          };
          
          // Очистка всех выделений
          window.clearAllHighlights = function() {
            const highlights = document.querySelectorAll('[class*="highlight-"], [class*="underline-"]');
            highlights.forEach(function(el) {
              const parent = el.parentNode;
              if (parent) {
                while (el.firstChild) {
                  parent.insertBefore(el.firstChild, el);
                }
                parent.removeChild(el);
                parent.normalize();
              }
            });
          };
          
          // Прокрутка к позиции
          window.scrollToPosition = function(startIndex) {
            const body = document.body;
            let currentPos = 0;
            
            function findNode(node) {
              if (node.nodeType === Node.TEXT_NODE) {
                const nodeLength = node.textContent.length;
                if (startIndex >= currentPos && startIndex <= currentPos + nodeLength) {
                  return node.parentElement || node;
                }
                currentPos += nodeLength;
                return null;
              }
              for (let i = 0; i < node.childNodes.length; i++) {
                const result = findNode(node.childNodes[i]);
                if (result) return result;
              }
              return null;
            }
            
            const element = findNode(body);
            if (element && element.scrollIntoView) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              if (element.classList) {
                element.classList.add('highlight-flash');
                setTimeout(function() {
                  element.classList.remove('highlight-flash');
                }, 1000);
              }
            }
          };
          
          // Снятие выделения текста
          window.clearSelection = function() {
            const selection = window.getSelection();
            if (selection) {
              selection.removeAllRanges();
            }
            lastSelectionText = '';
          };
          
          // Получение информации о выделенном тексте
          function getSelectionInfo() {
            const selection = window.getSelection();
            const text = selection.toString();
            if (text && text.length > 0 && text !== lastSelectionText) {
              lastSelectionText = text;
              
              const range = selection.getRangeAt(0);
              const rect = range.getBoundingClientRect();
              const scrollY = window.scrollY || window.pageYOffset;
              
              let currentPos = 0;
              function getGlobalIndex(node, offset) {
                function traverse(n) {
                  if (n.nodeType === Node.TEXT_NODE) {
                    const len = n.textContent.length;
                    if (n === node) return currentPos + offset;
                    currentPos += len;
                    return null;
                  }
                  for (let i = 0; i < n.childNodes.length; i++) {
                    const result = traverse(n.childNodes[i]);
                    if (result !== null) return result;
                  }
                  return null;
                }
                currentPos = 0;
                return traverse(document.body);
              }
              
              const start = getGlobalIndex(range.startContainer, range.startOffset);
              currentPos = 0;
              const end = getGlobalIndex(range.endContainer, range.endOffset);
              
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'selection',
                text: text,
                start: start,
                end: end,
                x: rect.left + (rect.width / 2),
                y: rect.bottom + scrollY + 50,
                isNearBottom: rect.bottom + 180 > window.innerHeight
              }));
            }
          }
          
          // Обработчик изменения выделения
          document.addEventListener('selectionchange', function() {
            if (selectionTimeout) clearTimeout(selectionTimeout);
            selectionTimeout = setTimeout(function() {
              getSelectionInfo();
            }, 200);
          });
        </script>
      </head>
      <body>${safeText}</body>
    </html>
  `;

  useImperativeHandle(ref, () => ({
    applyHighlight: (color: string, start: number, end: number) => {
      webViewRef.current?.injectJavaScript(`applyHighlight('${color}', ${start}, ${end}); true;`);
    },
    applyUnderline: (color: string, start: number, end: number) => {
      webViewRef.current?.injectJavaScript(`applyUnderline('${color}', ${start}, ${end}); true;`);
    },
    applyAllHighlights: (highlights: Array<{ type: 'highlight' | 'underline', color: string, start: number, end: number }>) => {
      const highlightsJson = JSON.stringify(highlights);
      webViewRef.current?.injectJavaScript(`applyAllHighlights(${highlightsJson}); true;`);
    },
    clearAllHighlights: () => {
      webViewRef.current?.injectJavaScript(`clearAllHighlights(); true;`);
    },
    clearSelection: () => {
      webViewRef.current?.injectJavaScript(`clearSelection(); true;`);
    },
    scrollToPosition: (startIndex: number) => {
      webViewRef.current?.injectJavaScript(`scrollToPosition(${startIndex}); true;`);
    },
  }));

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'selection' && data.text && onSelection) {
        onSelection(data.text, data.start, data.end, data.x, data.y, data.isNearBottom);
      }
    } catch (e) {
      console.error('Error parsing message:', e);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={true}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
});

export default BookText;