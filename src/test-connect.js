const axios = require('axios');
require('dotenv').config();

// 从环境变量获取配置
const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const API_BASE_URL = process.env.FEISHU_API_URL;

// 测试连接的主函数
async function testFeishuConnection() {
    console.log('开始测试飞书API连接...');
    console.log('API基础地址:', API_BASE_URL);

    // 1. 先简单测试能否访问飞书API服务器
    try {
        console.log('测试网络连接...');
        const pingResponse = await axios.head(API_BASE_URL);
        console.log('✅ 飞书API服务器可访问');
    } catch (error) {
        console.error('❌ 无法访问飞书API服务器，请检查网络或URL是否正确');
        console.error('错误信息:', error.message);
        return;
    }

    // 2. 测试获取访问令牌（核心验证）
    try {
        console.log('测试获取访问令牌...');
        const tokenResponse = await axios.post(`${API_BASE_URL}/auth/v3/tenant_access_token/internal/`, {
            app_id: APP_ID,
            app_secret: APP_SECRET
        });

        if (tokenResponse.data.code === 0) {
            console.log('✅ 访问令牌获取成功！');
            console.log('令牌信息:', {
                token: tokenResponse.data.tenant_access_token.substring(0, 10) + '...', // 隐藏部分字符
                expiresIn: tokenResponse.data.expire,
                有效期: '约2小时'
            });
            console.log('🎉 飞书API连接测试通过，可以正常调用接口');
        } else {
            console.error('❌ 令牌获取失败，错误信息:', tokenResponse.data);
            if (tokenResponse.data.code === 99991663) {
                console.error('提示: 可能是App ID或App Secret错误，请检查配置');
            }
        }
    } catch (error) {
        console.error('❌ 请求过程出错:', error.message);
    }
}

// 执行测试
testFeishuConnection();
