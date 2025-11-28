<img src="resources/CmdForgeLogo.png" alt="CmdForge ロゴ" width="150" height="150">

# CmdForge

クラウド同期と多言語対応を備えた個人用コマンドスニペットマネージャー。<br/>
(Windows 10/11, macOS)
<br/><br/>
<img src="https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white">
<img src="https://img.shields.io/badge/Node-20-339933?logo=node.js&logoColor=white">
<img src="https://img.shields.io/badge/Electron-30.5.1-47848F?logo=electron&logoColor=white">
<img src="https://img.shields.io/badge/React-19.1.1-61DAFB?logo=react&logoColor=black">
<img src="https://img.shields.io/badge/TypeScript-5.9.2-3178C6?logo=typescript&logoColor=white">
<img src="https://img.shields.io/badge/Vite-7.1.6-646CFF?logo=vite&logoColor=white">
<img src="https://img.shields.io/badge/Better%20SQLite3-12.4.6-003B57?logo=sqlite&logoColor=white">
<img src="https://img.shields.io/badge/Google%20APIs-166.0.0-4285F4?logo=google&logoColor=white">
<img src="https://img.shields.io/badge/Keytar-7.9.0-000000?logo=npm&logoColor=white">

## 目次

- [CmdForge とは？](#cmdforge-とは)
- [主な機能](#主な機能)
- [使い方](#使い方)
  - [コマンドの追加](#コマンドの追加)
  - [コマンドの検索](#コマンドの検索)
  - [コマンドの編集](#コマンドの編集)
  - [コマンドのエクスポート](#コマンドのエクスポートバックアップ)
  - [コマンドのインポート](#コマンドのインポート復元上書き)
  - [Google Cloud 同期設定](#google-cloud-同期設定)
  - [言語設定](#言語設定)
- [開発](#開発)
  - [推奨 IDE 設定](#推奨-ide-設定)
  - [プロジェクト設定](#プロジェクト設定)
  - [本番ビルド](#本番ビルド)
- [プロジェクトアーキテクチャ](#プロジェクトアーキテクチャ)
- [ライセンス](#ライセンス)

## CmdForge とは？

CmdForge は Electron、React、TypeScript で構築されたコマンドスニペットマネージャーです。開発者やシステム管理者向けに、頻繁に使用するコマンドの保存、整理、検索、迅速なアクセスを支援します。ドキュメントやターミナル履歴を検索する代わりに、すべてのコマンドをグループ化して整理し、検索可能で共有しやすく保てます。

CmdForge はクロスデバイスアクセス用の Google Sheets とのクラウド同期機能を備え、国際ユーザー向けに複数言語（英語と日本語）をサポートしています。

## 主な機能

- **コマンドの追加**: コマンドスニペットを保存し、説明を付けてカテゴリ別にグループ化
- **グループによる整理**: カスタムグループを作成（例: Kubernetes、Docker、Git など）してコマンドを整理
- **クイック検索**: ワイルドカード対応のリアルタイム検索でコマンドを瞬時に検索
- **インライン検索結果とコピー**: 検索結果がホームページにインラインで表示され、クリックでコピー（✓ コピー済み！の視覚フィードバック付き）
- **コマンドの編集**: 既存コマンドと説明の更新、編集モードで追加ページを開く
- **コマンドの削除**: インラインデリートまたは追加/編集画面からコマンドを削除
- **グループ管理**: 追加コマンドページからグループの名前変更または削除
- **常に最前面**: CmdForge ウィンドウを他のウィンドウより前面に保つトグル
- **Google Cloud 同期**: 独自の Google Cloud サービスアカウントを設定し、Google Sheets でコマンドを同期してクロスデバイスアクセスを実現
- **多言語対応**: 英語と日本語のインターフェースを選択、言語設定が永続的に保存
- **コマンドのエクスポート**: すべてのコマンドを JSON ファイルにバックアップ
- **コマンドのインポート**: JSON ファイルからコマンドを読み込み（既存データを上書き）

## 使い方

<div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px; background-color: #2d2d2d;">

### コマンドの追加

1. ホームページの **「コマンドを追加」** ボタンをクリック
2. コマンドテキストを入力（例: `kubectl get pods`）
3. コマンドの動作を説明する説明を追加
4. 既存グループを選択するか新しいグループを作成
5. **「コマンドを保存」** をクリックして保存
6. フォームがクリアされ、追加ページに留まってさらにコマンドを追加可能

</div>

<div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px; background-color: #2d2d2d;">

### コマンドの検索

1. ホームページの検索ボックスに検索語を入力
2. パターンマッチングに **`*`** ワイルドカード文字を使用（例: `*pod*` で「get pods」、「describe pods」を見つける）
3. **グループフィルター** からグループを選択して検索を絞り込み

**検索結果の表示とコピー**

1. 検索結果がホームページにインラインで表示される
2. 任意のコマンドをクリックしてクリップボードにコピー、コピー成功時に **✓ コピー済み！** インジケーターが表示される
3. 各結果の **編集** と **削除** ボタンを使用してホームページから直接コマンドを管理

</div>

<div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px; background-color: #2d2d2d;">

### コマンドの編集

1. ホームページの検索結果から任意のコマンドの **「編集」** ボタンをクリックして編集モードで追加ページを開く
2. コマンドテキスト、説明、またはグループを変更
3. **「更新」** をクリックして変更を保存
4. 編集モードでは **「削除」** ボタンが表示され、コマンドを削除可能。または検索結果のインライン **削除** ボタンを使用

グループの管理:

1. コマンド編集時に **グループ名変更** コントロールを使用してコマンド全体でグループ名を変更
2. **グループ削除** コントロールを使用してグループを削除（削除前に確認を求められる）

</div>

<div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px; background-color: #2d2d2d;">

### コマンドのエクスポート（バックアップ）

1. ホームページの **「エクスポート」** ボタンをクリック
2. JSON ファイルを保存する場所を選択
3. エクスポート時に存在するすべてのコマンドがこのファイルにエクスポートされる

**注意:** エクスポートにはエクスポート時のすべてのコマンドの完全なスナップショットが含まれる。

</div>

<div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px; background-color: #2d2d2d;">

### コマンドのインポート（復元/上書き）

1. ホームページの **「インポート」** ボタンをクリック
2. 以前エクスポートした JSON ファイルを選択
3. **⚠️ 重要:** インポートすると **完全に既存のコマンドを置き換える**
4. インポートされたコマンド数の確認が表示される

#### インポート動作の理解

- **完全置換**: インポートするとまず既存のすべてのコマンドを削除し、新しいデータをインポートする
- **追加なし**: コマンドは既存のコレクションに追加されず、完全に置き換えられる
- **データ損失**: インポート前に現在のコマンドをエクスポートして保存したい場合
- **使用例**: インポートは以下に最適:
  - バックアップからの復元
  - 異なるコマンドセット（個人用 vs. 仕事用）の切り替え
  - チームメンバー間でのコマンドライブラリの共有
  - 事前構築済みコマンドコレクションでの新規開始

#### ワークフロー例

```
1. 個人用コマンド 50 件を保存済み
2. エクスポート: "personal-commands.json"（バックアップ）
3. 仕事用コマンドをインポート: "work-commands.json"
   → 個人用コマンド 50 件が削除される
   → 仕事用コマンド 75 件がライブラリに追加される
4. 後で個人用コマンドをインポート: "personal-commands.json"
   → 仕事用コマンド 75 件が削除される
   → 個人用コマンド 50 件が復元される
```

</div>

<div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px; background-color: #2d2d2d;">

### Google Cloud 同期設定

CmdForge は Google Sheets を使用してデバイス間でコマンドを同期できます。この機能を使用するには独自の Google Cloud サービスアカウントを設定する必要があります。

#### 前提条件

1. Google Cloud Platform アカウント
2. Google Sheets API と Google Drive API が有効化された Google Cloud プロジェクト
3. 適切な権限を持つサービスアカウント

#### 設定手順

1. **Google Cloud プロジェクトの作成**:
   - [Google Cloud Console](https://console.cloud.google.com/) にアクセス
   - 新しいプロジェクトを作成するか既存のプロジェクトを選択

2. **Google Sheets API と Google Drive API の有効化**:
   - プロジェクト内で「API とサービス」>「ライブラリ」に移動
   - 「Google Sheets API」を検索して有効化
   - 「Google Drive API」を検索して有効化

3. **サービスアカウントの作成**:
   - 「API とサービス」>「認証情報」に移動
   - 「認証情報を作成」>「サービスアカウント」をクリック
   - 名前を付ける（例: "cmdforge-sync"）して作成
   - サービスアカウントに Google Sheets の「編集者」ロールを付与

4. **サービスアカウントキーの生成**:
   - サービスアカウントの詳細で「キー」タブに移動
   - 「キーを追加」>「新しいキーを作成」>「JSON」をクリック
   - JSON キーファイルをダウンロード

5. **Google スプレッドシートの作成**:
   - [Google Sheets](https://sheets.google.com) にアクセス
   - 新しいスプレッドシートを作成
   - URL からスプレッドシート ID をコピー（`/d/` と `/edit` の間の長い文字列）

6. **CmdForge の設定**:
   - CmdForge で **オプション** ボタン（⚙️）> **Google Sync** をクリック
   - **「キーファイルを読み込み」** をクリックしてダウンロードした JSON ファイルを選択（`credentials.json` にリネーム）
   - Google Sheet ID を入力
   - **「設定を保存」** をクリック

#### 同期の仕組み

- **自動同期**: CmdForge はアプリの起動/終了時に自動的に同期
- **競合解決**: タイムスタンプを使用して新しいバージョンを決定
- **クロスデバイス**: 同じ Google Sheet で任意のデバイスからコマンドにアクセス
- **プライバシー**: コマンドはオフライン使用のために SQLite データベースにローカル保存され、オプションでクロスデバイスアクセス用に Google Sheet に同期

#### トラブルシューティング

- **権限エラー**: サービスアカウントが Google Sheet への「編集者」アクセス権を持っていることを確認
- **API クォータ**: Google Sheets API には日次クォータがあるため、Google Cloud Console で使用状況を確認
- **同期競合**: 競合が発生した場合、より新しいバージョンが優先される

</div>

<div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px; background-color: #2d2d2d;">

### 言語設定

CmdForge はユーザーインターフェースで複数言語をサポート。現在利用可能な言語:

- **英語 (en)**: デフォルト言語
- **日本語 (ja)**: 日本語

#### 言語の変更

1. **オプション** ボタン（⚙️）> **言語** をクリック
2. モーダルダイアログから希望の言語を選択
3. インターフェースがすぐに選択した言語に切り替わる
4. 言語設定は自動的に保存され、アプリ再起動後も保持される

#### 追加言語の追加

言語システムは簡単に拡張可能。追加言語をサポートするには:

1. `src/renderer/src/locales/` に新しい JSON ファイルを作成（例: `fr.json` でフランス語）
2. `en.json` の構造をコピーしてすべての値を翻訳
3. `I18nContext.tsx` の `Language` 型に新しい言語コードを含める
4. `I18nContext.tsx` の `translations` オブジェクトに新しい言語を追加
5. `LanguageModal.tsx` コンポーネントを更新して新しい言語オプションを含める

</div>

## 開発

### システム要件

CmdForge の設定前に、以下のインストールを確認してください:

- **Python**: 3.11 以下（Better SQLite3 ネイティブモジュールコンパイル用）
- **Node.js**: 20 以下（Better SQLite3 ネイティブモジュール互換性用）

> **注意:** Better SQLite3 はネイティブモジュールコンパイルが必要です。上記の推奨バージョンより高いバージョンを使用するとビルド失敗の原因となる可能性があります。

### 推奨 IDE 設定

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

### プロジェクト設定

#### 依存関係のインストール

```bash
npm install
```

#### 開発サーバー

```bash
npm run dev
```

ホットモジュールリローディング付きの Electron 開発サーバーを起動。

#### リンター

```bash
npm run lint
```

コードのスタイルとエラーをチェック。

#### コードフォーマット

```bash
npm run format
```

Prettier ですべてのコードを自動フォーマット。

#### 型チェック

```bash
npm run typecheck
```

プロジェクト全体の TypeScript 型を検証。

### 本番ビルド

プラットフォーム向けにアプリケーションをビルド:

```bash
# Windows 用
npm run build:win

# macOS 用
npm run build:mac

# Linux 用
npm run build:linux
```

## プロジェクトアーキテクチャ

CmdForge はモジュラーでコンポーネントベースのアーキテクチャに従っています:

- **ページ**: HomePage、AddCommandPage
- **注意**: `ViewCommandsPage` ファイルはプロジェクトに存在しますが、アプリはコマンド表示にホーム検索結果を使用
- **コンポーネント**: 再利用可能な UI コンポーネント（Common & Feature コンポーネント）
- **Google Cloud 統合**: 安全なキー保存と Google Sheets 同期を備えたカスタム Google サービスアカウント設定
- **国際化**: 英語と日本語をサポートし拡張可能な React Context ベースの i18n システム
- **フック**: 状態管理用のカスタム React フック（useCommands、useSearch、useCopyToClipboard など）
- **サービス**: 一元化された API 通信レイヤー（commandService、googleService、syncService）
- **型**: 型安全のための TypeScript 型定義
- **保存**: SQLite データベース（プライマリ）と JSON フォールバック、Google 認証情報の安全なキー保存

## ライセンス

MIT</content>
<parameter name="filePath">c:\dev\CmdForge\README.ja.md
