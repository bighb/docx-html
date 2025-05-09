<template>
  <div class="editor-container">
    <!-- 添加导入导出按钮 -->
    <div class="document-actions">
      <input
        type="file"
        ref="fileInput"
        @change="handleUpload"
        accept=".docx"
        style="display: none"
      />
      <button class="action-button" @click="triggerFileInput">
        导入Word文档
      </button>
      <button class="action-button" @click="exportWord">导出为Word</button>
    </div>

    <div class="main-content">
      <!-- 添加目录侧边栏 -->
      <div class="outline-sidebar" v-if="headings.length > 0">
        <h3>文档目录</h3>
        <ul class="outline-list">
          <li
            v-for="heading in headings"
            :key="heading.id"
            :class="{
              'heading-h1': heading.level === 'h1',
              'heading-h2': heading.level === 'h2',
            }"
            :style="{ paddingLeft: `${heading.indent}px` }"
            @click="jumpToHeading(heading)"
          >
            {{ heading.text }}
          </li>
        </ul>
      </div>

      <div class="editor-wrapper">
        <Toolbar
          style="border-bottom: 1px solid #ccc"
          :editor="editorRef"
          :defaultConfig="toolbarConfig"
          :mode="mode"
        />
        <div class="a4-container">
          <Editor
            class="a4-editor"
            v-model="valueHtml"
            :defaultConfig="editorConfig"
            :mode="mode"
            @onCreated="handleCreated"
            @onChange="handleChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import "@wangeditor/editor/dist/css/style.css"; // 引入 css
import { onBeforeUnmount, ref, shallowRef, onMounted } from "vue";
import { Editor, Toolbar } from "@wangeditor/editor-for-vue";
import { Boot } from "@wangeditor/editor";
// 引入当前 svg 文件
import { svgIcon } from "./insert-placeholder.js";
// 引入HTML标题解析工具
import { parseHeadings, scrollToHeading } from "../utils/htmlTitleParser.js";

// 编辑器实例，必须用 shallowRef
const editorRef = shallowRef();
const fileInput = ref(null);

// 创建一个全局的占位符列表引用
const globalPlaceholderList = ref([]);
// 内容 HTML
const valueHtml = ref("");
// 添加标题数组
const headings = ref([]);

// 在组件挂载时获取占位符数据
onMounted(() => {
  // 模拟 ajax 异步获取内容
  setTimeout(() => {
    // 同时获取占位符列表数据
    // 实际应用中可以使用 fetch 或 axios 从服务器获取
    globalPlaceholderList.value = [
      { text: "姓名", value: "000" },
      { text: "日期", value: "111" },
      { text: "公司名称", value: "222" },
      { text: "地址", value: "333" },
      { text: "金额", value: "444" },
      { text: "联系人", value: "555" },
    ];
  }, 500);
});

// 添加编辑器内容变化时的处理函数
const handleChange = (editor) => {
  const html = editor.getHtml();
  console.log("修改了目录");
  // 添加一个标记来防止循环调用
  if (isUpdatingFromOutline) return;
  console.log("修改了目录updateOutlineDebounced");
  // 使用防抖函数延迟更新大纲
  updateOutlineDebounced(html);
};

// 创建一个标记变量，标识是否是从大纲更新而来的变化
const isUpdatingFromOutline = ref(false);

// 使用防抖优化更新操作
const updateOutlineDebounced = debounce((html) => {
  updateOutline(html);
}, 300);

// 引入防抖函数
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

// 更新文档大纲
const updateOutline = (html) => {
  if (!html) return;

  const { headingsData, htmlWithIds } = parseHeadings(html);
  headings.value = headingsData;

  // 如果解析后的HTML与原HTML不同（添加了ID），则更新编辑器内容
  if (htmlWithIds !== html && editorRef.value) {
    // 设置标记，表示正在从大纲更新内容
    isUpdatingFromOutline.value = true;

    // 更新编辑器内容
    editorRef.value.setHtml(htmlWithIds);

    // 恢复标记
    setTimeout(() => {
      isUpdatingFromOutline.value = false;
    }, 10);
  }
};

// 跳转到指定标题
const jumpToHeading = (heading) => {
  if (!heading || !heading.id) return;

  // 传递标题ID和标题文本内容
  scrollToHeading(heading.id, heading.text);
};

// 注册自定义菜单 - 插入占位符
Boot.registerMenu({
  key: "insertPlaceholder",
  factory() {
    return {
      title: "采购方案填充",
      tag: "button",
      text: "采购方案填充",
      // iconSvg: svgIcon,
      // 添加这个属性，表示使用下拉面板
      showDropPanel: true,

      isActive(editor) {
        return false;
      },
      isDisabled(editor) {
        return false;
      },
      getValue(editor) {
        return "";
      },
      exec(editor, value) {
        // 使用下拉面板时，这里不需要做任何事情
      },
      // 新增：返回下拉面板的内容元素
      getPanelContentElem(editor) {
        // 创建占位符列表容器
        const panel = document.createElement("div");
        panel.className = "w-e-panel-placeholder-list";
        panel.style.cssText = `
          min-width: 160px;
          max-width: 300px;
          padding: 5px 0;
        `;

        // 如果列表为空，显示加载中
        if (globalPlaceholderList.value.length === 0) {
          const loadingItem = document.createElement("div");
          loadingItem.textContent = "加载中...";
          loadingItem.style.cssText = `
            padding: 6px 10px;
            text-align: center;
            color: #999;
          `;
          panel.appendChild(loadingItem);
        } else {
          // 创建列表项
          globalPlaceholderList.value.forEach((item) => {
            const option = document.createElement("div");
            option.textContent = item.text;
            option.style.cssText = `
              padding: 6px 10px;
              cursor: pointer;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            `;
            option.onmouseover = () => {
              option.style.backgroundColor = "#f0f0f0";
            };
            option.onmouseout = () => {
              option.style.backgroundColor = "transparent";
            };

            // 点击占位符项时插入内容
            option.onclick = () => {
              editor.insertText(`{{${item.value}}}`);
              // 不需要手动关闭面板，编辑器会自动处理
            };

            panel.appendChild(option);
          });
        }

        return panel;
      },
    };
  },
});
// 将空对象修改为包含配置的对象
const toolbarConfig = {
  // 排除特定的菜单项
  toolbarKeys: [
    "insertPlaceholder", // 自定义的插入占位符菜单
    "bold",
    "underline",
    "italic",
    "through",
    "clearStyle",
    "fontSize",
    "fontFamily",
    "indent",
    "delIndent",
    "justifyLeft",
    "justifyRight",
    "justifyCenter",
    "justifyJustify",
    "lineHeight",
    "divider",
    "blockquote",
    "headerSelect",
    "header1",
    "header2",
    "header3",
    "header4",
    "header5",
    "bulletedList",
    "numberedList",
    "insertTable",
    "deleteTable",
    "insertTableRow",
    "deleteTableRow",
    "insertTableCol",
    "deleteTableCol",
    "tableHeader",
    "tableFullWidth",
    "redo",
    "undo",
  ],
};

// 使用官方推荐的方式在 editorConfig 中配置 fontSize
const editorConfig = {
  placeholder: "请输入内容...",
  // 使用 MENU_CONF 配置各个菜单
  MENU_CONF: {
    // 配置 fontSize 菜单
    fontSize: {
      // 自定义配置字体大小
      fontSizeList: [...Array.from({ length: 45 }, (_, i) => `${i + 12}px`)],
    },
  },
  hoverbarKeys: {
    // 文本选择时的悬浮菜单
    text: {
      menuKeys: ["bold", "italic", "underline", "through", "clearStyle"],
    },
  },
};
const mode = "default"; // 或 'simple'

// 触发文件选择
const triggerFileInput = () => {
  fileInput.value.click();
};
// toolbarConfig.insertKeys = {
//   index: 0, // 插入的位置，基于当前的 toolbarKeys
//   keys: ["insertPlaceholder"],
// };

// 处理Word文档导入
const handleUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("http://localhost:3000/upload-word", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    // 获取HTML内容
    let html = data.html;

    // 用 DOMParser 解析
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // 把解析后的HTML内容设置到编辑器
    html = doc.body.innerHTML;

    // 设置到编辑器中
    valueHtml.value = html;

    // 如果需要直接操作编辑器实例
    if (editorRef.value) {
      editorRef.value.setHtml(html);

      // 解析标题并更新目录
      updateOutline(html);
    }
  } catch (error) {
    console.error("导入Word文档失败:", error);
    alert("导入Word文档失败，请重试");
  } finally {
    // 重置文件输入，以便重复选择同一文件时也能触发change事件
    e.target.value = null;
  }
};

// 导出为Word文档
const exportWord = async () => {
  if (!editorRef.value) return;

  // 获取编辑器内容
  const html = editorRef.value.getHtml();

  try {
    const res = await fetch("http://localhost:3000/export-word", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ html }),
    });

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "导出的文件.docx";
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("导出Word文档失败:", error);
    alert("导出Word文档失败，请重试");
  }
};

// 组件销毁时，也及时销毁编辑器
onBeforeUnmount(() => {
  const editor = editorRef.value;
  if (editor == null) return;
  editor.destroy();
});

// 触发时机：编辑器实例创建完成后触发，整个生命周期内只触发一次
// 参数传递：向事件处理函数传递编辑器实例对象
// 主要用途：
// 获取并存储编辑器实例引用
// 执行初始化操作
// 设置编辑器配置
// 加载初始内容
const handleCreated = (editor) => {
  editorRef.value = editor; // 记录 editor 实例，重要！
  // 打印所有可用的菜单键
  console.log("所有可用的菜单键:", editor.getAllMenuKeys());
  console.log("悬浮菜单:", editor.getConfig().hoverbarKeys); // 如果有此属性
};
</script>

<style scoped>
/* 编辑器容器布局 */
.editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 主内容区域布局 */
.main-content {
  display: flex;
  flex: 1;
  min-height: 90vh;
}

/* 目录侧边栏样式 */
.outline-sidebar {
  width: 240px;
  padding: 16px;
  background: #f8f8f8;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
  max-height: 90vh;
}

.outline-sidebar h3 {
  font-size: 16px;
  margin-top: 0;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
}

.outline-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.outline-list li {
  padding: 6px 0;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all 0.2s;
}

.outline-list li:hover {
  color: #4a89dc;
}

.heading-h1 {
  font-weight: bold;
}

.heading-h2 {
  font-weight: normal;
  color: #666;
}

/* 编辑器包装容器 */
.editor-wrapper {
  flex: 1;
  border: 1px solid #ccc;
  margin: 0 auto;
}

/* 保留原有样式 */
/* A4纸容器 */
.a4-container {
  height: calc(100vh - 60px - 125px); /* 减去工具栏高度 */
  display: flex;
  justify-content: center;
  background-color: #f0f0f0;
  padding: 20px;
  overflow-y: auto;
}

/* A4纸样式 */
:deep(.a4-editor) {
  width: 210mm; /* A4宽度 */
  min-height: 297mm; /* A4高度 */
  padding: 20mm; /* 页边距 */
  background-color: white;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  overflow-y: visible;
  height: fit-content !important;
}

/* 确保编辑区域有正确的尺寸 */
:deep(.a4-editor .w-e-text-container) {
  width: 170mm !important; /* A4宽度减去页边距 */
  height: auto !important;
  /* overflow: visible !important; */
  margin: 0 auto;
}

/* 调整工具栏宽度 */
:deep(.w-e-toolbar) {
  flex-wrap: wrap;
}

.document-actions {
  margin-bottom: 10px;
  display: flex;
  gap: 10px;
}

.action-button {
  padding: 8px 16px;
  background-color: #4a89dc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.action-button:hover {
  background-color: #3672c5;
}

.action-button:active {
  background-color: #2c5aa0;
}
</style>
