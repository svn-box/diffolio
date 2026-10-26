# Diffolio 比较样例

这些输入来自 2026 年 10 月 26 日分析 Kaleidoscope 时创建的本地样例，可用于 Diffolio 的手动验证及后续自动化测试。

## 文本比较

比较 [before.ts](reference/text/before.ts) 与 [after.ts](reference/text/after.ts)。修改包括主题类型、默认主题与字号、标题格式，以及新增 `collapseUnchanged`。末尾含中文与 emoji，适合检查字体和字符范围。

参考软件将这些内容显示为 1 处新增和 3 处修改。不同差异引擎可以采用不同的分块方式，验收应关注变化内容与操作结果。

## 目录比较

比较 [left](reference/left/) 与 [right](reference/right/)。

| 相对路径 | 预期结果 |
| --- | --- |
| `README.txt` | 两侧相同 |
| `preferences.ts` | 两侧内容不同 |
| `assets/preview.png` | 两侧图片不同 |
| `legacy.txt` | 仅 left 存在 |
| `notes.txt` | 仅 right 存在 |

## 图片比较

比较 [左侧图片](reference/left/assets/preview.png) 与 [右侧图片](reference/right/assets/preview.png)。两张图片均为 800 × 500 像素，包含图形颜色、按钮宽度和新增色块的变化。

## 三方合并

使用 [base.txt](reference/text/base.txt) 作为共同祖先，[ours.txt](reference/text/ours.txt) 和 [theirs.txt](reference/text/theirs.txt) 作为两个输入。主题设置产生冲突，字号和语言提供其他变更；实际冲突分块取决于引擎。

输出应保存到临时目录或另一个明确的结果文件，以便保留这些输入供重复验证。
