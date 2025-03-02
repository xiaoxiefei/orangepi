const express = require('express');
const { exec } = require('child_process');
const session = require('express-session');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = 3000;
app.use(express.static('web'));

// 处理根路径请求，自动重定向到login页面
app.get('/', (req, res) => {
  res.redirect('/login');
});

// 处理/login路径请求，返回login.html页面
app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/../web/login/login.html');
});

// 处理/index路径请求，返回index.html页面
app.get('/index', (req, res) => {
  res.sendFile(__dirname + '/../web/index.html');
});

// 打开 SQLite 数据库
const db = new sqlite3.Database('users.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the users database.');
    // 创建用户表
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )`, (err) => {
        if (err) {
            console.error(err.message);
        }
    });
});

// 使用中间件
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));
app.use(bodyParser.json());
// 设置多个静态资源目录
app.use(express.static('public'));
app.use('/login', express.static('login'));

// 注册接口
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
    db.run(sql, [username, password], function (err) {
        if (err) {
            if (err.code === 'SQLITE_CONSTRAINT') {
                res.json({ success: false, message: '用户名已存在' });
            } else {
                console.error(err.message);
                res.json({ success: false, message: '注册失败，请稍后重试' });
            }
        } else {
            res.json({ success: true, message: '注册成功' });
        }
    });
});

// 登录接口
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username =? AND password =?';
    db.get(sql, [username, password], (err, row) => {
        if (err) {
            console.error(err.message);
            res.json({ success: false, message: '登录失败，请稍后重试' });
        } else if (row) {
            req.session.user = row;
            res.json({ success: true, message: '登录成功' });
        } else {
            res.json({ success: false, message: '用户名或密码错误' });
        }
    });
});

let isLoggedIn = false;
// 处理退出登录请求
app.post('/logout', (req, res) => {
  isLoggedIn = false;
  res.json({ success: true, message: '退出登录成功' });
});

// 验证用户是否登录的中间件
const requireLogin = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login/login.html');
    }
};

// 获取所有温度信息
function getTemperatures(callback) {
    exec('sensors', (error, stdout, stderr) => {
        if (error) {
            callback(error, null);
            return;
        }
        const lines = stdout.split('\n');
        const temperatureData = {};
        let currentComponent = '';

        lines.forEach(line => {
            if (line.includes('cpu_thermal')) {
                currentComponent = 'cpu';
            } else if (line.includes('gpu_thermal')) {
                currentComponent = 'gpu';
            } else if (line.includes('ddr_thermal')) {
                currentComponent = 'ddr';
            } else if (line.includes('ve_thermal')) {
                currentComponent = 've';
            } else if (line.includes('temp1:') && currentComponent) {
                const tempMatch = line.match(/\+([\d.]+)°C/);
                if (tempMatch) {
                    temperatureData[currentComponent] = parseFloat(tempMatch[1]);
                }
            }
        });

        callback(null, temperatureData);
    });
}

// 获取运行进程信息
function getProcesses(callback) {
    exec('ps -aux', (error, stdout, stderr) => {
        if (error) {
            callback(error, null);
            return;
        }
        const lines = stdout.split('\n').slice(1); // 去除标题行
        const processes = lines.map(line => {
            const parts = line.trim().split(/\s+/);
            return {
                user: parts[0],
                pid: parseInt(parts[1]),
                cpu: parseFloat(parts[2]),
                mem: parseFloat(parts[3]),
                command: parts.slice(10).join(' ')
            };
        }).filter(process => process.pid); // 过滤掉空行
        callback(null, processes);
    });
}

// 获取内存使用信息
function getMemoryUsage(callback) {
    exec('free -m', (error, stdout, stderr) => {
        if (error) {
            callback(error, null);
            return;
        }
        const lines = stdout.split('\n');
        const memoryLine = lines[1].trim().split(/\s+/);
        const total = parseInt(memoryLine[1]);
        const used = parseInt(memoryLine[2]);
        const free = parseInt(memoryLine[3]);
        const usage = {
            total,
            used,
            free,
            percentage: ((used / total) * 100).toFixed(2)
        };
        callback(null, usage);
    });
}

// 定义 API 接口
app.get('/api/status', requireLogin, (req, res) => {
    Promise.all([
        new Promise((resolve, reject) => getTemperatures((error, temperatures) => error ? reject(error) : resolve(temperatures))),
        new Promise((resolve, reject) => getProcesses((error, processes) => error ? reject(error) : resolve(processes))),
        new Promise((resolve, reject) => getMemoryUsage((error, memory) => error ? reject(error) : resolve(memory)))
    ])
   .then(([temperatures, processes, memory]) => {
        const username = req.session.user ? req.session.user.username : null;
        res.json({
            temperatures,
            processes, // 只取前 5 条进程
            memory,
            username
        });
    })
   .catch(error => {
        console.error(error);
        res.status(500).json({ error: 'Failed to get system status' });
    });
});

// 启动服务器
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});