const loginForm = document.getElementById('login-form');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (data.success) {
            // 设置登录状态
            localStorage.setItem('isLoggedIn', 'true');
            window.location.href = '../index.html?isLoggedIn=true';
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('登录请求出错:', error);
        alert('登录请求出错，请稍后重试');
    }
});