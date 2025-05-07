<template>
  <div class="page-container">
    <h2>Word 转 HTML / HTML 转 Word Demo</h2>

    <input type="file" @change="handleUpload" accept=".docx" />
    <button @click="exportWord">导出为 Word</button>
    <div class="editor-wrapper">
      <div ref="editor" class="quill-editor"></div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import QuillBetterTable from "quill-better-table";
import "quill-better-table/dist/quill-better-table.css";

// 注册 better-table
Quill.register(
  {
    "modules/better-table": QuillBetterTable,
  },
  true
);

const editor = ref(null);
let quill;

onMounted(() => {
  quill = new Quill(editor.value, {
    theme: "snow",
    modules: {
      // 启用 better-table
      "better-table": {
        // 启用操作菜单
        operationMenu: {
          // 可以自定义显示哪些操作
          items: {
            unmergeCells: { text: "Unmerge" },
            insertRowAbove: { text: "Row Above" },
            insertRowBelow: { text: "Row Below" },
            insertColumnLeft: { text: "Col Left" },
            insertColumnRight: { text: "Col Right" },
            deleteRow: { text: "Del Row" },
            deleteColumn: { text: "Del Col" },
            deleteTable: { text: "Del Table" },
          },
        },
        // 可以配置渲染到哪个 DOM 节点
        // 默认会将菜单挂在编辑器容器内部
        // You can omit `selector` to use default
        // selector: '.editor-wrapper'
      },
      toolbar: {
        container: [
          [{ header: [1, 2, false] }],
          ["bold", "italic"],
          ["link", "image"],
          ["clean"],
          // 这里新增一个按钮，用于插入表格
          [{ "better-table": "insert-table" }],
        ],
        handlers: {
          // 绑定 insert-table 按钮
          "better-table": (value) => {
            if (value === "insert-table") {
              quill.getModule("better-table").insertTable(3, 3);
            }
          },
        },
      },
    },
  });
});

const handleUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("http://localhost:3000/upload-word", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  // data.html 是后端返回的完整 HTML 字符串
  let html = data.html;

  // 用 DOMParser 解析
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // 找到所有表格
  // doc.querySelectorAll("table").forEach((table) => {
  //   // 先把它插到文档里（离屏），才能测量
  //   document.body.appendChild(table);
  //   const tableWidth = table.getBoundingClientRect().width;
  //   const cols = table.querySelectorAll("tr:first-child td, tr:first-child th");
  //   const colCount = cols.length;
  //   const defaultColWidth = Math.floor(tableWidth / colCount);

  //   // 给每个单元格添加 inline style
  //   cols.forEach((td) => {
  //     td.style.width = `${defaultColWidth}px`;
  //   });

  //   // 移除离屏测试元素
  //   document.body.removeChild(table);
  // });

  // 把修改过的 HTML 序列化回字符串
  html = doc.body.innerHTML;

  // 然后粘贴给 Quill
  quill.clipboard.dangerouslyPasteHTML(html);

  // // 提取body标签中的内容
  // const bodyContent = extractBodyContent(data.html);
  // quill.root.innerHTML = bodyContent;
};

// 添加提取body内容的辅助函数
const extractBodyContent = (htmlString) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  return doc.body ? doc.body.innerHTML : htmlString;
};

const exportWord = async () => {
  const html = quill.root.innerHTML;

  const res = await fetch("http://localhost:3000/export-word", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ html }),
  });
  console.log("res: ", res);

  const blob = await res.blob();
  console.log("blob: ", blob);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "导出的文件.docx";
  a.click();
  window.URL.revokeObjectURL(url);
};
</script>

<style>
body {
  background: #eee;
}
.page-container {
  padding: 20px;
  background: #eee;
}
/* 模拟 A4 纸张宽度：210mm */
.editor-wrapper {
  width: 210mm;
  /* 保证在小屏不溢出 */
  max-width: 100%;
  margin: 20px auto;
  /* 可选：加个边框更像纸张 */
  border: 1px solid #ccc;
  background: white;
  /* 内边距让文字不贴边 */
  padding: 16px;
  /* 打印友好：在打印时也是 A4 */
  box-sizing: border-box;
  page-break-after: always;
}

/* Quill 编辑区全高自适应，撑满 wrapper */
.quill-editor {
  height: auto;
  min-height: 500px; /* 你可以按需调整 */
}

/* 强制让 Quill 表格、图片等宽度100%填满 A4 容器 */
.quill-editor table {
  width: 100%;
  table-layout: fixed; /* 保证列宽按容器等分，和 Word 表格更接近 */
}

.quill-editor img {
  max-width: 100%;
  height: auto;
}

.editor-wrapper table {
  width: 100%;
  table-layout: fixed;
}

/* 可选：自定义 TableUI 样式 */
.custom-table-ui {
  z-index: 10;
}
</style>
