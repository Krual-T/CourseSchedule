import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    // 根据当前工作目录中的 `mode` 加载 .env 文件
    // process.cwd() 是当前工作目录
    const env = loadEnv(mode, process.cwd(), '');

    return {
        server: {
            proxy: {
                '/proxy-api': {
                    target: env.VITE_PROXY_BACKEND_URL, // 本地后端地址
                    changeOrigin: true, // 允许跨域（后端视角下，请求来自后端自己的域名）
                    rewrite: (path) => path.replace(/^\/proxy-api/, '/api') // 重写路径，匹配后端API格式
                },
                '/feishu-api': {
                    target: env.VITE_FEISHU_API_URL, // 飞书API地址
                    changeOrigin: true, // 允许跨域（后端视角下，请求来自后端自己的域名）
                    rewrite: (path) => path.replace(/^\/feishu-api/, '') // 重写路径，匹配飞书API格式
                }
            }
        }
    };
});