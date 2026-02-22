import { commands, type ICommand } from "@uiw/react-md-editor";

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

const youtubeCommand: ICommand = {
  name: "youtube",
  keyCommand: "youtube",
  buttonProps: {
    "aria-label": "YouTube動画",
    title: "YouTube動画を埋め込む"
  },
  icon: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" >
      <path d="M21.582,6.186c-0.23-0.86-0.908-1.538-1.768-1.768C18.254,4,12,4,12,4S5.746,4,4.186,4.418 c-0.86,0.23-1.538,0.908-1.768,1.768C2,7.746,2,12,2,12s0,4.254,0.418,5.814c0.23,0.86,0.908,1.538,1.768,1.768 C5.746,20,12,20,12,20s6.254,0,7.814-0.418c0.86-0.23,1.538-0.908,1.768-1.768C22,16.254,22,12,22,12S22,7.746,21.582,6.186z M10,15.464V8.536L16,12L10,15.464z" />
    </svg>
  ),
  execute: (state, api) => {
    const url = window.prompt("YouTubeの動画URLを入力してください（例: https://www.youtube.com/watch?v=...）");
    if (!url) return;

    // URLからvideoIdを抽出
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
    const videoId = match ? match[1] : null;

    if (!videoId) {
      alert("YouTubeのURLが正しくありません");
      return;
    }

    // Markdownにiframeを挿入する
    const iframeCode = `\n<iframe class="w-full aspect-video rounded-xl" src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>\n`;

    api.replaceSelection(iframeCode);
  }
};

export const getJapaneseCommands = (onImageClick?: () => void) => {
  const cmds: ICommand[] = commands.getCommands().map((cmd): ICommand => {
    if (cmd.name === "image" && onImageClick) {
      return {
        ...cmd,
        buttonProps: {
          ...cmd.buttonProps,
          "aria-label": "画像（メディア選択）",
          title: "画像（メディア選択）"
        },
        execute: () => {
          // デフォルトのスニペット挿入をキャンセルし、モーダルを開く
          onImageClick();
        }
      };
    }

    return {
      ...cmd,
      buttonProps: {
        ...cmd.buttonProps,
        "aria-label": jaTitles[cmd.name || ""] || cmd.buttonProps?.["aria-label"],
        title: jaTitles[cmd.name || ""] || cmd.buttonProps?.title
      }
    };
  });

  // 画像コマンドの位置を探して、その右にyoutubeを挿入
  const imageIndex = cmds.findIndex(c => c.name === "image");
  if (imageIndex !== -1) {
    cmds.splice(imageIndex + 1, 0, youtubeCommand);
  }

  return cmds;
};


export const getJapaneseExtraCommands = () => commands.getExtraCommands().map(cmd => ({
  ...cmd,
  buttonProps: {
    ...cmd.buttonProps,
    "aria-label": jaTitles[cmd.name || ""] || cmd.buttonProps?.["aria-label"],
    title: jaTitles[cmd.name || ""] || cmd.buttonProps?.title
  }
}));
