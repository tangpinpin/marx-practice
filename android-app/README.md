# 马原刷题 Android 版

这是现有网页的 Capacitor Android 封装。题库和网页文件打包在 APK 内，答题记录留在本机 WebView 存储中；不会与网页浏览器的记录自动同步。可在网页中导出进度，再在应用中导入。

## 构建

需要 Node.js 22+、JDK 21、Android SDK。首次构建还需要联网下载 Gradle 和 Android 依赖。GitHub 仓库中的 Actions 工作流也可在推送后生成 Debug APK。

```powershell
npm install
npx cap add android  # 仅第一次生成工程时执行
node scripts/create-icons.mjs
npm run build:apk
```

输出文件是 `android/app/build/outputs/apk/debug/app-debug.apk`。Debug APK 用于个人安装测试；对外发布需另行配置签名、版本号与发布构建。

修改 `../outputs` 中的网页后运行 `npm run sync:web`，再构建 APK。更新题库不会自动进入已安装的应用，需要重新打包、安装。卸载应用可能删除本地答题记录，建议先使用“导出进度”。
