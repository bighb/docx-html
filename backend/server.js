const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const libre = require("libreoffice-convert");
const { promisify } = require("util");

// 将 libre.convert 转为 async/await 版
const convertAsync = promisify(libre.convert);

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json({ limit: "20mb" }));

// 1. Word (.docx) → HTML
app.post("/upload-word", upload.single("file"), async (req, res) => {
  try {
    const inPath = req.file.path;
    const buffer = fs.readFileSync(inPath);
    // 转成 HTML
    const htmlBuf = await convertAsync(buffer, ".html", undefined);
    const html = htmlBuf.toString("utf-8");
    // 清理临时文件
    fs.unlinkSync(inPath);
    res.json({ html });
  } catch (err) {
    console.error("DOCX→HTML 转换失败：", err);
    res.status(500).send("转换失败");
  }
});

const { exec } = require("child_process");
const { v4: uuidv4 } = require("uuid"); // 您可能需要安装：npm install uuid
// 查找 LibreOffice 路径的函数
function findLibreOfficePath() {
  const possiblePaths = [
    "/usr/bin/libreoffice",
    "/usr/bin/soffice",
    "/usr/local/bin/libreoffice",
    "/usr/local/bin/soffice",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
  ];

  for (const path of possiblePaths) {
    if (fs.existsSync(path)) {
      // 使用 fs.existsSync 而不是 existsSync
      return path;
    }
  }

  throw new Error(
    "找不到 LibreOffice。请确保已安装 LibreOffice 并添加到 PATH 中。"
  );
}
app.post("/export-word", async (req, res) => {
  try {
    let html = req.body.html || "";

    // 添加完整HTML结构
    if (!/^<!DOCTYPE html>/i.test(html)) {
      html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Document</title>
</head>
<body>
${html}
</body>
</html>`;
    }

    const tempDir = path.join(__dirname, "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 创建唯一文件名
    const fileId = uuidv4();
    const htmlFile = path.join(tempDir, `${fileId}.html`);

    // 写入HTML文件
    fs.writeFileSync(htmlFile, html, "utf8");

    // 查找 LibreOffice 路径
    const libreOfficePath = findLibreOfficePath();

    // 获取转换前文件列表
    const beforeFiles = fs.readdirSync(tempDir);

    // 使用 LibreOffice 命令行进行转换
    await new Promise((resolve, reject) => {
      console.log(
        `执行命令: ${libreOfficePath} --headless --convert-to docx --outdir "${tempDir}" "${htmlFile}"`
      );

      exec(
        `"${libreOfficePath}" --headless --convert-to docx --outdir "${tempDir}" "${htmlFile}"`,
        (error, stdout, stderr) => {
          if (error) {
            console.error("LibreOffice 错误输出:", stderr);
            reject(error);
          } else {
            console.log("LibreOffice 输出:", stdout);
            resolve();
          }
        }
      );
    });

    // 获取转换后文件列表
    const afterFiles = fs.readdirSync(tempDir);

    // 查找新生成的docx文件
    const newFiles = afterFiles.filter(
      (file) => !beforeFiles.includes(file) && file.endsWith(".docx")
    );

    if (newFiles.length > 0) {
      const docxFile = path.join(tempDir, newFiles[0]);
      console.log(`找到转换后的文件: ${docxFile}`);

      const docxBuf = fs.readFileSync(docxFile);
      res.set({
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="export.docx"',
      });
      res.send(docxBuf);

      // 清理临时文件
      fs.unlinkSync(htmlFile);
      newFiles.forEach((file) => fs.unlinkSync(path.join(tempDir, file)));
    } else {
      console.error("转换后的目录内容:", afterFiles);
      throw new Error("转换失败，未找到输出的docx文件");
    }
  } catch (err) {
    console.error("HTML→DOCX 转换失败：", err);
    res.status(500).send("导出失败");
  }
});

const PORT = 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
