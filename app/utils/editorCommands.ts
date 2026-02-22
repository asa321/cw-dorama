import { commands } from "@uiw/react-md-editor";

const jaTitles: Record<string, string> = {
  bold: "太字",
  italic: "斜体",
  strikethrough: "打ち消し線",
  hr: "水平線",
  title: "見出し",
  title1: "見出し 1",
  title2: "見出し 2",
  title3: "見出し 3",
  title4: "見出し 4",
  title5: "見出し 5",
  title6: "見出し 6",
  divider: "区切り線",
  link: "リンク",
  quote: "引用",
  code: "コード",
  codeBlock: "コードブロック",
  comment: "コメント",
  image: "画像",
  table: "テーブル",
  help: "ヘルプ",
  undo: "元に戻す",
  redo: "やり直し",
  unorderedListCommand: "箇条書き",
  orderedListCommand: "番号付きリスト",
  checkedListCommand: "チェックリスト",
  edit: "編集",
  preview: "プレビュー",
  live: "ライブプレビュー",
  fullscreen: "全画面"
};

export const getJapaneseCommands = () => commands.getCommands().map(cmd => ({
  ...cmd,
  buttonProps: {
    ...cmd.buttonProps,
    "aria-label": jaTitles[cmd.name || ""] || cmd.buttonProps?.["aria-label"],
    title: jaTitles[cmd.name || ""] || cmd.buttonProps?.title
  }
}));

export const getJapaneseExtraCommands = () => commands.getExtraCommands().map(cmd => ({
  ...cmd,
  buttonProps: {
    ...cmd.buttonProps,
    "aria-label": jaTitles[cmd.name || ""] || cmd.buttonProps?.["aria-label"],
    title: jaTitles[cmd.name || ""] || cmd.buttonProps?.title
  }
}));
