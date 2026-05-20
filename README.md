# Amazon Split View · Inline

A Chrome extension that shows **desktop** and **Amazon App mobile view** side by side **in the same browser window** — no window switching, no DevTools.

> **Companion to [amz-split-view](https://github.com/zhisanhang-droid/amz-split-view)** (two-window version). Use whichever fits your screen setup.

<p align="center" style="margin-top:16px">
  <a href="https://github.com/zhisanhang-droid/amz-split-inline/archive/refs/heads/main.zip">
    <img src="https://img.shields.io/badge/⬇%EF%B8%8F_Download_Extension_ZIP-FF9900?style=for-the-badge&logo=googlechrome&logoColor=black" alt="Download Extension ZIP">
  </a>
</p>

> **Quick install:** Download ZIP → unzip → open `chrome://extensions/` → enable Developer mode → Load unpacked → select the folder.

---

## How it works

Clicking the extension:

1. Injects a full-screen split layout **over the current page**
2. Left pane → desktop iframe (standard UA)
3. Right pane → 393 px mobile iframe with Amazon App User-Agent
4. Uses `declarativeNetRequest` to strip Amazon's `X-Frame-Options` header so the iframe loads cleanly
5. Both panes scroll independently

Click **Exit Split** (button inside the page) or the extension icon again to restore.

---

## Device preset

| Setting | Value |
|---------|-------|
| Device | iPhone 15 |
| Viewport width | 393 px |
| User-Agent | Amazon Shopping App 25.18 · iOS 17 |

---

## Installation (Developer mode)

1. [Download ZIP](https://github.com/zhisanhang-droid/amz-split-inline/archive/refs/heads/main.zip)
2. Unzip
3. Open `chrome://extensions/`
4. Enable **Developer mode**
5. Click **Load unpacked** → select `amz-split-inline` folder

---

## Limitations

- Shows Amazon's **mobile web** version, not the native app (which runs React Native)
- Product content, pricing, images, and Buy Box are identical to the app
- Navigation chrome differs slightly from the native app UI

---

## License

MIT
