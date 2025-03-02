// 获取元素
const userInfo = document.getElementById('user-info');
const logoutMenu = document.getElementById('logout-menu');
const cpuTemp = document.getElementById('cpu-temp');
const gpuTemp = document.getElementById('gpu-temp');
const ddrTemp = document.getElementById('ddr-temp');
const veTemp = document.getElementById('ve-temp');
const processBody = document.getElementById('process-body');
const memTotal = document.getElementById('mem-total');
const memUsed = document.getElementById('mem-used');
const memPercentage = document.getElementById('mem-percentage');
const memFree = document.getElementById('mem-free');

// 从后端获取数据
function fetchData() {
  const urlParams = new URLSearchParams(window.location.search);
  const isLoggedIn = urlParams.get('isLoggedIn');
  if (isLoggedIn) {
    const isLoggedInInput = document.getElementById('isLoggedIn');
    if (isLoggedInInput) {
      isLoggedInInput.value = isLoggedIn;
    }
  }
  fetch('/api/status')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // 更新用户信息
      if (userInfo) {
        if (data.username) {
          userInfo.textContent = `当前用户: ${data.username}`;
        } else {
          userInfo.textContent = '未登录';
        }
      }
      // 更新温度信息
      if (cpuTemp) {
        cpuTemp.textContent = data.temperatures.cpu || 'N/A';
      }
      if (gpuTemp) {
        gpuTemp.textContent = data.temperatures.gpu || 'N/A';
      }
      if (ddrTemp) {
        ddrTemp.textContent = data.temperatures.ddr || 'N/A';
      }
      if (veTemp) {
        veTemp.textContent = data.temperatures.ve || 'N/A';
      }

      // 更新进程信息
      if (processBody) {
        processBody.innerHTML = '';
        // 只取前 5 条进程数据
        const topFiveProcesses = data.processes.sort((a, b) => b.cpu - a.cpu).slice(0, 5);
        topFiveProcesses.forEach(process => {
          const row = document.createElement('tr');
          row.innerHTML = `
                  <td>${process.user}</td>
                  <td>${process.pid}</td>
                  <td>${process.cpu}%</td>
                  <td>${process.mem}%</td>
                  <td>${process.command}</td>
                `;
          processBody.appendChild(row);
        });
      }

      // 更新内存信息
      if (memTotal) {
        memTotal.textContent = data.memory.total;
      }
      if (memUsed) {
        memUsed.textContent = data.memory.used;
      }
      if (memPercentage) {
        memPercentage.textContent = data.memory.percentage;
      }
      if (memFree) {
        memFree.textContent = data.memory.free;
      }
    })
    .catch(error => {
      console.error(error);
      // 移除未定义的 tempValue 操作
      if (processBody) {
        processBody.innerHTML = '<tr><td colspan="5">获取数据失败</td></tr>';
      }
      if (memTotal) {
        memTotal.textContent = '获取数据失败';
      }
      if (memUsed) {
        memUsed.textContent = '获取数据失败';
      }
      if (memPercentage) {
        memPercentage.textContent = '获取数据失败';
      }
      if (memFree) {
        memFree.textContent = '获取数据失败';
      }
    });
}

// 处理刷新逻辑
window.addEventListener('load', function () {
  const isLoggedIn = document.getElementById('isLoggedIn').value;
  if (isLoggedIn === 'true') {
    // 如果已经登录，继续显示内容
    fetchData();
  } else {
    // 如果未登录，跳转到登录页面
    window.location.href = 'login/login.html';
  }
});

// 初始加载数据
fetchData();
// 显示或隐藏退出登录菜单
function toggleLogoutMenu(event) {
  event.stopPropagation(); // 阻止事件冒泡
  console.log('logoutMenu:', logoutMenu); // 用于调试，查看是否获取到元素
  if (logoutMenu) {
    logoutMenu.style.display = logoutMenu.style.display === 'block' ? 'none' : 'block';
    console.log(logoutMenu.style.display)
    console.log('logoutMenu position:', logoutMenu.getBoundingClientRect());
  } else {
    console.error('未找到退出登录菜单元素');
    // 进一步调试，查看所有元素的 id
    const allElements = document.getElementsByTagName('*');
    for (let i = 0; i < allElements.length; i++) {
      console.log('Element ID:', allElements[i].id);
    }
  }
}

// 点击窗口其他区域时关闭退出登录菜单
window.onclick = function (event) {
  if (userInfo) {
    if (logoutMenu && !userInfo.contains(event.target)) {
      logoutMenu.style.display = 'none';
    }
  }
};

// 退出登录函数
async function logout() {
  console.log("fun logout")
  try {
    const response = await fetch('/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (data.success) {
      // 退出登录成功，重定向到登录页面
      window.location.href = 'login/login.html';
    } else {
      // 退出登录失败，弹出提示信息
      alert(data.message);
    }
  } catch (error) {
    console.error('退出登录请求出错:', error);
    alert('退出登录请求出错，请稍后重试');
  }
}

// 获取用户信息并更新显示
async function fetchUserInfo() {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();
    const userInfoSpan = document.getElementById('userInfo');
    if (userInfoSpan) {
      if (data.username) {
        userInfoSpan.textContent = `当前用户: ${data.username}`;
      } else {
        userInfoSpan.textContent = '未登录';
      }
    }
  } catch (error) {
    console.error('获取用户信息出错:', error);
    const userInfoSpan = document.getElementById('userInfo');
    if (userInfoSpan) {
      userInfoSpan.textContent = '获取用户信息失败';
    }
  }
}

// 页面加载时获取用户信息
fetchUserInfo();


// 每隔 5 秒刷新一次数据
setInterval(fetchData, 2000);
