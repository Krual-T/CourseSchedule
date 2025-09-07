const axios = require('axios');
require('dotenv').config(); // 加载.env文件

// 从环境变量中获取配置（不再硬编码）
const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const API_BASE_URL = process.env.FEISHU_API_URL;

// 获取飞书访问令牌
async function getFeishuToken() {
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/v3/tenant_access_token/internal`, {
            app_id: APP_ID,
            app_secret: APP_SECRET
        });

        if (response.data.code === 0) {
            console.log('获取令牌成功', response.data);
            return response.data.tenant_access_token;
        } else {
            console.error('获取令牌失败:', response.data.msg);
            return null;
        }
    } catch (error) {
        console.error('请求失败:', error);
        return null;
    }
}

// 测试调用
getFeishuToken();

class FeiShuSDKService {
    constructor(id, secret, base_url) {
        this.app_id = id;
        this.app_secret = secret;
        this.api_base_url = base_url;
    }
    
    login() {
        return getFeishuToken();
    }
}

feiShuSDKService = new FeiShuSDKService(APP_ID, APP_SECRET, API_BASE_URL);

module.exports = {feiShuSDKService};
