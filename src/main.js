import { feishuClient } from './js/FeishuClient.js';


// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 渲染应用基本结构
  renderAppShell();

  // 检查是否是授权回调
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');

  if (code && state) {
    // 处理飞书授权回调
    handleAuthCallback(code, state);
  } else {
    // 正常访问，检查登录状态
    checkLoginStatus();
  }
});

// 渲染应用外壳
function renderAppShell() {
  const appElement = document.getElementById('app');
  appElement.innerHTML = `
        <header class="app-header">
            <h1 class="app-title">
                <i class="fa fa-calendar-check-o"></i> 飞书课程表
            </h1>
            <div id="userMenu" class="user-menu"></div>
        </header>
        
        <main class="app-main">
            <div id="authSection" class="auth-section">
                <h2>欢迎使用飞书课程表</h2>
                <p>请使用飞书账号登录，管理你的课程信息</p>
                <button id="loginBtn" class="login-btn">
                    <i class="fa fa-feishu"></i> 使用飞书登录
                </button>
            </div>
            
            <div id="userSection" class="user-section" style="display: none;">
                <div class="user-info-card">
                    <img id="userAvatar" src="" alt="用户头像" class="user-avatar">
                    <div class="user-details">
                        <h2 id="userName"></h2>
                        <p id="userEmail"></p>
                    </div>
                    <button id="logoutBtn" class="logout-btn">
                        <i class="fa fa-sign-out"></i> 退出登录
                    </button>
                </div>
                
                <div class="course-actions">
                    <h3>课程管理</h3>
                    <div class="import-area">
                        <label for="courseFile">导入课程表JSON:</label>
                        <input type="file" id="courseFile" accept=".json">
                        <button id="deleteCourses" class="delete-btn">清空课程</button>
                    </div>
                </div>
                
                <div id="courseTable" class="course-table"></div>
            </div>
            
            <div id="message" class="message"></div>
        </main>
        
        <footer class="app-footer">
            <p>飞书课程表应用 &copy; ${new Date().getFullYear()}</p>
        </footer>
    `;
}

// 检查登录状态
async function checkLoginStatus() {
  try {
    if (feishuClient.isLoggedIn()) {
      // 已登录，获取用户信息并显示
      const userInfo = await feishuClient.getCurrentUser();
      showUserSection(userInfo);
      await loadAndRenderCourses();
    } else {
      // 未登录，显示登录区域
      showAuthSection();
    }
  } catch (error) {
    console.error('检查登录状态失败:', error);
    showMessage('登录状态验证失败，请重新登录', 'error');
    showAuthSection();
  }
}

// 处理授权回调
async function handleAuthCallback(code, state) {
  try {
    showMessage('正在验证授权信息...');

    // 处理飞书回调，获取用户信息
    const userInfo = await feishuClient.handleAuthCallback(code, state);

    // 清除URL中的code和state参数，美化URL
    history.replaceState({}, document.title, window.location.pathname);

    // 显示用户区域
    showUserSection(userInfo);
    showMessage('登录成功，欢迎使用！');

    // 加载课程
    await loadAndRenderCourses();
  } catch (error) {
    console.error('授权失败:', error);
    showMessage('授权失败: ' + error.message, 'error');
    showAuthSection();
  }
}

// 显示登录区域
function showAuthSection() {
  document.getElementById('authSection').style.display = 'flex';
  document.getElementById('userSection').style.display = 'none';

  // 添加登录按钮事件监听
  document.getElementById('loginBtn').addEventListener('click', async () => {
    // 生成授权链接并跳转
    const authUrl = await feishuClient.getAuthorizationUrl([
      'base:view:read', 'base:table:read', 'base:app:read',
      'base:record:retrieve'
    ]);
    window.location.href = authUrl;
  });
}

// 显示用户区域和用户信息
function showUserSection(userInfo) {
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('userSection').style.display = 'block';

  // 填充用户信息
  document.getElementById('userAvatar').src = userInfo.avatar || 'https://picsum.photos/200';
  document.getElementById('userName').textContent = userInfo.name || '未知用户';
  document.getElementById('userEmail').textContent = userInfo.email || '未提供邮箱';

  // 添加退出登录事件
  document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm('确定要退出登录吗？')) {
      feishuClient.clearUserToken();
      showMessage('已退出登录');
      showAuthSection();
    }
  });

  // 添加课程导入事件
  document.getElementById('courseFile').addEventListener('change', handleFileImport);

  // 添加清空课程事件
  document.getElementById('deleteCourses').addEventListener('click', async () => {
    if (confirm('确定要清空所有课程吗？')) {
      try {
        localStorage.removeItem(`courses_${userInfo.userId}`);
        renderCourseTable([]);
        showMessage('课程已清空');
      } catch (error) {
        showMessage('清空课程失败: ' + error.message, 'error');
      }
    }
  });
}

// 处理文件导入
async function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
    showMessage('请选择JSON格式的文件', 'error');
    return;
  }

  try {
    const userInfo = JSON.parse(localStorage.getItem('feishu_current_user'));
    showMessage('正在导入课程表...');
    const courses = await importCourses(file, userInfo);
    renderCourseTable(courses);
    showMessage(`成功导入 ${courses.length} 门课程`);
    // 清空文件输入，允许重复选择同一个文件
    event.target.value = '';
  } catch (error) {
    showMessage('导入失败: ' + error.message, 'error');
  }
}

// 加载并渲染课程（修改版：从飞书多维表拉取数据）
async function loadAndRenderCourses() {
  try {
    showMessage('正在从飞书多维表加载全部记录...');
    const userInfo = JSON.parse(localStorage.getItem('feishu_current_user'));
    const appToken = import.meta.env.VITE_FEISHU_DATABASE_ID; // 替换为实际app_token

    // 直接获取全部记录（无需依赖视图）
    const recordsData = await feishuClient.getCourseInfoTableMetadata(appToken);
    const courses = recordsData.items.map(record => ({
      id: record.record_id,
      studentName: record.fields.student_name?.[0]?.en_name || '未知学生',
      courseName: record.fields.course_name?.[0]?.text || '未知课程',
      studentEmail: record.fields.student_name?.[0]?.email || '无'
    }));

    renderCourseTable(courses);
    showMessage(`成功加载 ${courses.length} 条记录`);

  } catch (error) {
    console.error('加载课程失败:', error);
    showMessage('加载课程失败: ' + error.message, 'error');
  }
}

// 表格渲染保持不变，但确保绑定的是解析后的文本字段
function renderCourseTable(courses) {
  const courseTableElement = document.getElementById('courseTable');

  if (courses.length === 0) {
    courseTableElement.innerHTML = `
            <div class="empty-state">
                <i class="fa fa-inbox"></i>
                <p>暂无课程记录</p>
            </div>
        `;
    return;
  }

  courseTableElement.innerHTML = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>记录ID</th>
                        <th>学生姓名</th>
                        <th>课程名称</th>
                        <th>学生邮箱</th>
                    </tr>
                </thead>
                <tbody>
                    ${courses.map(course => `
                        <tr>
                            <td>${course.id}</td>
                            <td>${course.studentName}</td>
                            <td>${course.courseName}</td>
                            <td>${course.studentEmail}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}
// 显示消息提示
function showMessage(text, type = 'info') {
  const messageElement = document.getElementById('message');
  messageElement.textContent = text;
  messageElement.className = `message ${type}`;

  // 3秒后自动隐藏
  setTimeout(() => {
    messageElement.textContent = '';
    messageElement.className = 'message';
  }, 3000);
}
