const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { AuthorizationCode } = require('simple-oauth2');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 飞书API配置
const config = {
    client: {
        id: process.env.VITE_FEISHU_APP_ID,
        secret: process.env.VITE_FEISHU_APP_SECRET
    },
    auth: {
        tokenHost: 'https://open.feishu.cn',
        tokenPath: '/open-apis/authen/v2/oauth/token',
        refreshPath: '/open-apis/authen/v2/oauth/token'
    }
};

// 初始化OAuth客户端
const feishuOauth2 = new AuthorizationCode(config);

// 用code兑换token
app.post('/api/feishu/exchange-token', async (req, res) => {
    try {
        const { code, redirectUri, codeVerifier } = req.body;

        const tokenParams = {
            code: code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
            grant_type: 'authorization_code'
        };

        // 使用库的方法获取token
        const result = await feishuOauth2.getToken(tokenParams);
        const token = feishuOauth2.createToken(result.token);

        res.json({
            code: 0,
            access_token: token.token.access_token,
            refresh_token: token.token.refresh_token,
            expires_in: token.token.expires_in,
            token_type: token.token.token_type
        });
    } catch (error) {
        console.error('兑换token失败:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            message: '兑换token失败：' + (error.response?.data?.msg || error.message)
        });
    }
});

// 刷新token
app.post('/api/feishu/refresh-token', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        // 创建一个已存在的token对象
        const token = feishuOauth2.createToken({
            refresh_token: refreshToken,
            // 这些字段可以留空，刷新时主要需要refresh_token
            access_token: '',
            expires_in: 0
        });

        // 使用库的刷新方法
        const refreshedToken = await token.refresh();

        res.json({
            access_token: refreshedToken.token.access_token,
            refresh_token: refreshedToken.token.refresh_token,
            expires_in: refreshedToken.token.expires_in
        });
    } catch (error) {
        console.error('刷新token失败:', error.response?.data || error.message);
        res.status(500).json({
            message: '刷新token失败：' + (error.response?.data?.msg || error.message)
        });
    }
});

// 查询课程表信息WIP
app.get('/api/feishu/get_course_info', async (req, res) => {
    try {
        const { userAcessToken } = req.body;

        // 创建一个已存在的token对象
        const token = feishuOauth2.createToken({
            refresh_token: refreshToken,
            // 这些字段可以留空，刷新时主要需要refresh_token
            access_token: '',
            expires_in: 0
        });

        // 使用库的刷新方法
        const refreshedToken = await token.refresh();

        res.json({
            access_token: refreshedToken.token.access_token,
            refresh_token: refreshedToken.token.refresh_token,
            expires_in: refreshedToken.token.expires_in
        });
    } catch (error) {
        console.error('刷新token失败:', error.response?.data || error.message);
        res.status(500).json({
            message: '刷新token失败：' + (error.response?.data?.msg || error.message)
        });
    }
});
// 启动服务器
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});
