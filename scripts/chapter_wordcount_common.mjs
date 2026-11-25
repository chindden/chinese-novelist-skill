/** Single source of truth for the existing chapter word-count CLI and new review admission. */
import fs from 'node:fs';
import path from 'node:path';

function countChineseWords(text) {
  /** 统计中文字数（排除标点符号和Markdown标记） */
  // 移除Markdown标记
  text = text
    .replace(/#{1,6}\s*/g, '')              // 标题
    .replace(/\*\*(.*?)\*\*/g, '$1')        // 粗体
    .replace(/\*(.*?)\*/g, '$1')            // 斜体
    .replace(/~~(.*?)~~/g, '$1')            // 删除线
    .replace(/`(.*?)`/g, '$1')              // 行内代码
    .replace(/\[(.*?)\]\(.*?\)/g, '$1');    // 链接
  // 统计中文字符（汉字）
  const chineseChars = text.match(/[一-鿿]/g);
  return chineseChars ? chineseChars.length : 0;
}

function extractContentFromChapter(filePath) {
  /** 从章节文件中提取正文内容（排除标题等元数据） */
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  // 跳过开头的元数据（如 # 第XX章 标题）
  let contentStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('#') && lines[i].includes('章')) {
      contentStart = i + 1;
      break;
    }
  }
  return lines.slice(contentStart).join('\n');
}

export function checkChapter(filePath, minWords = 3000) {
  /** 检查单个章节的字数 */
  const file = path.normalize(filePath);
  let exists = false;
  let mainContent;
  try {
    const stat = fs.statSync(filePath);
    exists = true;
    if (!stat.isFile()) {
      return { file, exists, word_count: 0, status: 'error', message: `不是普通文件: ${filePath}` };
    }
    mainContent = extractContentFromChapter(filePath);
  } catch (error) {
    const message = error.code === 'ENOENT'
      ? `文件不存在: ${filePath}`
      : `无法读取章节文件: ${filePath}（${error.code}）`;
    return { file, exists, word_count: 0, status: 'error', message };
  }
  const wordCount = countChineseWords(mainContent);
  const status = wordCount >= minWords ? 'pass' : 'fail';
  const message = `字数: ${wordCount}` + (
    wordCount >= minWords ? ' (✓ 达标)' : ` (✗ 不足，需要至少 ${minWords} 字)`
  );
  return { file, exists, word_count: wordCount, status, message };
}

