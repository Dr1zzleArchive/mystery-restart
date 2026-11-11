# 腾讯云 COS 国内部署指南

目标：让「谜案重启」拥有一个**国内可直接访问**的稳定地址，并在每次 push 到 GitHub 后自动更新。

部署完成后地址形如：

`https://<存储桶名>.cos-website.<地域>.myqcloud.com`

> GitHub Pages 在国内经常被墙/限速，这就是国内打不开的根因。COS 是国内服务，静态网站默认域名无需备案即可访问。

## 一、创建 COS 存储桶

1. 登录腾讯云控制台 → 对象存储 COS → 存储桶列表 → **创建存储桶**。
2. 名称示例：`mystery-restart`，创建后会得到完整名称 **`mystery-restart-<你的APPID>`**（后面的数字就是 APPID，必须带）。
3. 地域选离你近的，如 `ap-guangzhou`（广州）、`ap-shanghai`（上海）、`ap-beijing`（北京）。
4. 访问权限选 **公有读私有写**（静态网站必须能被匿名读取）。
5. 其他保持默认，创建。

## 二、开启静态网站

1. 进入该存储桶 → **基础配置 → 静态网站** → 开启。
2. 索引文档填 `index.html`。
3. 错误文档也填 `index.html`。
4. 保存后，页面会显示访问域名：`https://<桶名>.cos-website.<地域>.myqcloud.com`，记下它。

## 三、创建 CAM 密钥（给 GitHub Actions 用）

1. 腾讯云控制台 → **访问管理 CAM → 用户 → 新建用户**。
2. 类型选 **仅编程访问**（不要勾选控制台登录）。
3. 权限：授予 `QcloudCOSFullAccess`（简单）；更安全的做法是用自定义策略，只允许该桶的读写。
4. 创建后保存 **SecretId** 和 **SecretKey**（只显示一次）。

> 不要用主账号的密钥。这个子用户只用来上传静态文件。

## 四、配置 GitHub Secrets

进入 GitHub 仓库 → **Settings → Secrets and variables → Actions → New repository secret**，依次添加：

| 名称 | 值 |
|---|---|
| `COS_BUCKET` | 完整桶名，如 `mystery-restart-1250000000` |
| `COS_REGION` | 地域，如 `ap-guangzhou` |
| `COS_SECRET_ID` | 上一步的 SecretId |
| `COS_SECRET_KEY` | 上一步的 SecretKey |

## 五、触发部署

- 正常 push 到 `main` 会自动触发 `.github/workflows/cos.yml`。
- 也可以手动：GitHub 仓库 → **Actions → Deploy to Tencent Cloud COS → Run workflow**。
- 首次部署会同步约 116 MB 的静态文件，稍等片刻。

如果 Secrets 还没配好，工作流会自动跳过（不会报错）。

## 六、验证

1. 打开静态网站域名，确认游戏能正常加载。
2. 确认「灰羽」能正常对话（AI 仍走你原来的腾讯云函数代理，与静态托管互不影响）。
3. 之后每次 push，国内地址会自动更新；`index.html` 设置为不缓存，JS/CSS 通过 `?v=<提交哈希>` 自动穿透缓存。

## 七、关于自定义域名与备案

- 用 COS 自带的 `*.myqcloud.com` 静态网站域名：国内可直接访问，**无需备案**。
- 如果以后要绑自己的域名 + 国内 CDN：需要做 **ICP 备案**，要等审核。
- 现在不建议折腾，自带域名足够课堂演示和分享。

## 八、EdgeOne Pages（替代方案）

如果不想手动管理 COS，也可以用 **腾讯云 EdgeOne Pages**：从 GitHub 导入仓库、选择静态站点、自动构建与部署。配置更简单，但它的默认域名和配额策略可能变化，按控制台引导操作即可。COS 方案更可控，推荐先用 COS。
