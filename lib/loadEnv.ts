// スタンドアロンのスクリプト(tsx)用に .env.local を読み込む副作用モジュール。
// Next.jsは.env.localを自動で読むが、tsxで直接実行するスクリプトはdotenvが必要。
// 各スクリプトの「最初のimport」として読み込むこと。
import { config } from "dotenv";

// .env.local を優先し、無い値は .env で補完（既存のprocess.envは上書きしない）
config({ path: [".env.local", ".env"] });
