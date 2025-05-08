<template>
  <div>
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
        />
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

// 编辑器实例，必须用 shallowRef
const editorRef = shallowRef();
const fileInput = ref(null);

// 创建一个全局的占位符列表引用
const globalPlaceholderList = ref([]);
// 内容 HTML
const valueHtml = ref("<p>hello</p>");
// 在组件挂载时获取占位符数据
onMounted(() => {
  // 模拟 ajax 异步获取内容
  setTimeout(() => {
    valueHtml.value = "<p>请开始编辑或导入Word文档</p>";

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
    const res = await fetch("http://10.3.74.131:3000/upload-word", {
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
    const res = await fetch("http://10.3.74.131:3000/export-word", {
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

const handleCreated = (editor) => {
  editorRef.value = editor; // 记录 editor 实例，重要！
  // 打印所有可用的菜单键
  console.log("所有可用的菜单键:", editor.getAllMenuKeys());
  console.log("悬浮菜单:", editor.getConfig().hoverbarKeys); // 如果有此属性
};
</script>

<style scoped>
/* 编辑器包装容器 */
.editor-wrapper {
  border: 1px solid #ccc;
  margin: 0 auto;
}

/* A4纸容器 */
.a4-container {
  display: flex;
  justify-content: center;
  background-color: #f0f0f0;
  padding: 20px;
  min-height: 90vh;
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
}

/* 确保编辑区域有正确的尺寸 */
:deep(.a4-editor .w-e-text-container) {
  width: 170mm !important; /* A4宽度减去页边距 */
  height: auto !important;
  overflow: visible !important;
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
