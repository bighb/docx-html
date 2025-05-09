/**
 * 解析HTML内容中的标题，提取h1和h2标签
 * @param {string} htmlContent - HTML内容
 * @returns {Object} 包含标题数组和带ID的HTML内容
 */
export function parseHeadings(htmlContent) {
  if (!htmlContent) return { headingsData: [], htmlWithIds: htmlContent };

  const headingsData = [];
  // 正则表达式匹配h1和h2标签，包含可能已有的id属性
  const regex =
    /<(h[12])(?:[^>]*?)(?:id=['"]([^'"]*?)['"])?(?:[^>]*?)>([\s\S]*?)<\/\1>/gi;

  // 使用正则表达式替换，并收集标题信息
  let processedHtml = htmlContent;
  const originalMatches = [];

  // 第一步：收集所有匹配项
  let match; // 添加这一行来声明match变量
  while ((match = regex.exec(htmlContent)) !== null) {
    originalMatches.push({
      fullMatch: match[0],
      tagName: match[1],
      existingId: match[2] || "",
      content: match[3],
      index: match.index,
    });
  }

  // 第二步：处理每个匹配项
  for (let i = 0; i < originalMatches.length; i++) {
    const { fullMatch, tagName, existingId, content, index } =
      originalMatches[i];
    const level = tagName.toLowerCase();
    const text = content.replace(/<[^>]*>/g, "").trim(); // 移除内部HTML标签

    // 使用现有ID或生成新ID
    const id = existingId || `heading-${level}-${i}`;

    // 创建替换后的标签 - 添加data-heading-id属性以便在WangEditor处理后仍能识别
    const newTag = `<${tagName} id="${id}" data-heading-id="${id}">${content}</${tagName}>`;

    // 替换原始HTML中的标签
    processedHtml =
      processedHtml.substring(0, index) +
      newTag +
      processedHtml.substring(index + fullMatch.length);

    // 调整后续匹配的索引（只有当新标签长度与旧标签不同时才需要）
    const lengthDifference = newTag.length - fullMatch.length;
    if (lengthDifference !== 0) {
      for (let j = i + 1; j < originalMatches.length; j++) {
        originalMatches[j].index += lengthDifference;
      }
    }

    // 添加到标题数据中，同时保存标题文本
    headingsData.push({
      level,
      text,
      id,
      indent: level === "h1" ? 0 : 16,
    });
  }

  return {
    headingsData,
    htmlWithIds: processedHtml,
  };
}
/**
 * 向指定标题文本的元素滚动，适用于WangEditor处理过的DOM结构
 * @param {string} id - 目标元素的ID或唯一标识符
 * @param {string} headingText - 标题文本内容
 */
export function scrollToHeading(id, headingText) {
  try {
    // 查找编辑器容器
    const editorContainer = document.querySelector(".a4-container");
    if (!editorContainer) return;

    // 查找编辑器中的所有标题元素 (h1, h2)
    const headingElements = document.querySelectorAll(
      ".w-e-text-container h1, .w-e-text-container h2"
    );

    // 尝试通过文本内容匹配找到对应的标题元素
    let targetElement = null;

    // 遍历所有标题元素
    for (let element of headingElements) {
      // 获取当前标题的文本内容
      const elementText = element.textContent.trim();

      // 如果文本内容匹配，则找到目标元素
      if (elementText === headingText) {
        targetElement = element;
        break;
      }
    }

    // 如果找到目标元素，滚动到该元素
    if (targetElement) {
      // 获取元素的位置信息
      const rect = targetElement.getBoundingClientRect();
      const editorRect = editorContainer.getBoundingClientRect();

      // 计算相对于编辑器容器的位置
      const relativeTop = rect.top - editorRect.top + editorContainer.scrollTop;

      // 滚动编辑器容器
      editorContainer.scrollTo({
        top: relativeTop - 100, // 添加偏移量，使标题显示在视图的上部
        behavior: "smooth",
      });
    }
  } catch (error) {
    console.error("滚动到标题时出错:", error);
  }
}
