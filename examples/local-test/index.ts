
// 环境配置优先级：process.env > .env > ~/.env
console.log('hello world', process.env, process.env.TEST_PATH_HOME)
