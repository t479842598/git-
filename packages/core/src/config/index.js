const fs = require('node:fs')
const path = require('node:path')
const lodash = require('lodash')
const jsonApi = require('@docmirror/mitmproxy/src/json')
const mergeApi = require('../merge')

function getUserBasePath () {
  const userHome = process.env.USERPROFILE || process.env.HOME || '/'
  return path.resolve(userHome, './.dev-sidecar')
}

function getRootCaCertPath () {
  return path.join(getUserBasePath(), '/dev-sidecar.ca.crt')
}

function getRootCaKeyPath () {
  return path.join(getUserBasePath(), '/dev-sidecar.ca.key.pem')
}

const defaultConfig = {
  app: {
    mode: 'default',
    autoStart: {
      enabled: false,
    },
    remoteConfig: {
      enabled: true,
      // 共享远程配置地址
      url: 'https://gitee.com/wangliang181230/dev-sidecar/raw/docmirror2.x/packages/core/src/config/remote_config.json',
      // 个人远程配置地址
      personalUrl: '',
    },
    startShowWindow: true, // 启动时是否打开窗口：true=打开窗口, false=隐藏窗口
    showHideShortcut: 'Alt + S', // 显示/隐藏窗口快捷键
    windowSize: { width: 900, height: 750 }, // 启动时，窗口的尺寸
    theme: 'dark', // 主题：light=亮色, dark=暗色
    autoChecked: true, // 是否自动检查更新
    skipPreRelease: true, // 是否忽略预发布版本
    dock: {
      hideWhenWinClose: false,
    },
    closeStrategy: 0,
    showShutdownTip: true,

    // 日志相关配置
    logFileSavePath: path.join(getUserBasePath(), '/logs'), // 日志文件保存路径
    keepLogFileCount: 15, // 保留日志文件数
  },
  server: {
    enabled: true,
    host: '127.0.0.1',
    port: 31181,
    setting: {
      NODE_TLS_REJECT_UNAUTHORIZED: true,
      verifySsl: true,
      script: {
        enabled: true,
        defaultDir: './extra/scripts/',
      },
      userBasePath: getUserBasePath(),
      rootCaFile: {
        certPath: getRootCaCertPath(),
        keyPath: getRootCaKeyPath(),
      },

      // 默认超时时间配置
      defaultTimeout: 20000, // 请求超时时间
      defaultKeepAliveTimeout: 30000, // 连接超时时间

      // 指定域名超时时间配置
      timeoutMapping: {
        'github.com': {
          timeout: 20000,
          keepAliveTimeout: 30000,
        },
      },

      // 慢速IP延迟时间：测速超过该值时，则视为延迟高，显示为橙色
      lowSpeedDelay: 200,
    },
    compatible: {
      // **** 自定义兼容配置 **** //
      // connect阶段所需的兼容性配置
      connect: {
        // 参考配置（无path）
        // 'xxx.xxx.xxx.xxx:443': {
        //   ssl: false
        // }
      },
      // request阶段所需的兼容性配置
      request: {
        // 参考配置（配置方式同 `拦截配置`）
        // 'xxx.xxx.xxx.xxx:443': {
        //   '.*': {
        //     rejectUnauthorized: false
        //   }
        // }
      },
    },
    intercept: {
      enabled: true,
    },
    intercepts: {
      'github.com': {
        '.*': {
          sni: 'baidu.com',
        },
        '^(/[\\w-.]+){2,}/?(\\?.*)?$': {
          // 篡改猴插件地址，以下是高速镜像地址
          tampermonkeyScript: 'https://gitee.com/wangliang181230/dev-sidecar/raw/scripts/tampermonkey.js',
          // Github油猴脚本地址，以下是高速镜像地址
          script: 'https://gitee.com/wangliang181230/dev-sidecar/raw/scripts/GithubEnhanced-High-Speed-Download.user.js',
          remark: '注：上面所使用的脚本地址，为高速镜像地址。',
          desc: '油猴脚本：高速下载 Git Clone/SSH、Release、Raw、Code(ZIP) 等文件 (公益加速)、项目列表单文件快捷下载、添加 git clone 命令',
        },
        // 以下三项暂时先注释掉，因为已经有油猴脚本提供高速下载地址了。
        // '/.*/.*/releases/download/': {
        //   redirect: 'gh.api.99988866.xyz/https://github.com',
        //   desc: 'release文件加速下载跳转地址'
        // },
        // '/.*/.*/archive/': {
        //   redirect: 'gh.api.99988866.xyz/https://github.com'
        // },
        // 以下代理地址不支持该类资源的代理，暂时注释掉
        // '/.*/.*/blame/': {
        //   redirect: 'gh.api.99988866.xyz/https://github.com'
        // },
        '/fluidicon.png': {
          cacheDays: 365,
          desc: 'Github那只猫的图片，缓存1年',
        },
        '^(/[^/]+){2}/pull/\\d+/open_with_menu.*$': {
          cacheDays: 7,
          desc: 'PR详情页：标题右边那个Code按钮的HTML代码请求地址，感觉上应该可以缓存。暂时先设置为缓存7天',
        },
        '^((/[^/]+){2,})/raw((/[^/]+)+\\.(jpg|jpeg|png|gif))(\\?.*)?$': {
          // eslint-disable-next-line no-template-curly-in-string
          proxy: 'https://raw.githubusercontent.com${m[1]}${m[3]}',
          sni: 'baidu.com',
          cacheDays: 7,
          desc: '仓库内图片，重定向改为代理，并缓存7天。',
        },
        '^((/[^/]+){2,})/raw((/[^/]+)+\\.js)(\\?.*)?$': {
          // eslint-disable-next-line no-template-curly-in-string
          proxy: 'https://raw.githubusercontent.com${m[1]}${m[3]}',
          sni: 'baidu.com',
          responseReplace: { headers: { 'content-type': 'application/javascript; charset=utf-8' } },
          desc: '仓库内脚本，重定向改为代理，并设置响应头Content-Type。作用：方便script拦截器直接使用，避免引起跨域问题和脚本内容限制问题。',
        },
      },
      'github.githubassets.com': {
        '.*': {
          sni: 'baidu.com',
        },
      },
      'camo.githubusercontent.com': {
        '^[a-zA-Z0-9/]+(\\?.*)?$': {
          cacheDays: 365,
          desc: '图片，缓存1年',
        },
      },
      'collector.github.com': {
        '.*': {
          sni: 'baidu.com',
        },
      },
      'customer-stories-feed.github.com': {
        '.*': { proxy: 'customer-stories-feed.fastgit.org' },
      },
      'user-images.githubusercontent.com': {
        '^/.*\\.png(\\?.*)?$': {
          cacheDays: 365,
          desc: '用户在PR或issue等内容中上传的图片，缓存1年。注：每张图片都有唯一的ID，不会重复，可以安心缓存',
        },
      },
      'private-user-images.githubusercontent.com': {
        '^/.*\\.png(\\?.*)?$': {
          cacheDays: 30,
          cacheHours: null,
          desc: '用户在PR或issue等内容中上传的图片，缓存30天',
        },
      },
      'avatars.githubusercontent.com': {
        '^/u/\\d+(\\?.*)?$': {
          cacheDays: 365,
          desc: '用户头像，缓存1年',
        },
      },
      'api.github.com': {
        '^/_private/browser/stats$': {
          success: true,
          desc: 'github的访问速度分析上传，没有必要，直接返回成功',
        },
        '.*': {
          sni: 'baidu.com',
        },
      },
      '*.docker.com': {
        '.*': {
          sni: 'baidu.com',
        },
      },
      'login.docker.com': {
        '/favicon.ico': {
          proxy: 'hub.docker.com',
          sni: 'baidu.com',
          desc: '登录页面的ico，采用hub.docker.com的',
        },
      },
      // google cdn
      'www.google.com': {
        '/recaptcha/.*': { proxy: 'www.recaptcha.net' },
        // '.*': {
        //   proxy: 'gg.docmirror.top/_yxorp',
        //   desc: '呀，被你发现了，偷偷的用，别声张'
        // }
      },
      'www.gstatic.com': {
        '/recaptcha/.*': { proxy: 'www.recaptcha.net' },
      },
      'ajax.googleapis.com': {
        '.*': {
          proxy: 'ajax.lug.ustc.edu.cn',
          backup: ['gapis.geekzu.org'],
          test: 'ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js',
        },
      },
      'fonts.googleapis.com': {
        '.*': {
          proxy: 'fonts.loli.net',
          test: 'https://fonts.googleapis.com/css?family=Oswald',
        },
      },
      'themes.googleapis.com': {
        '.*': {
          proxy: 'themes.loli.net',
          backup: ['themes.proxy.ustclug.org'],
        },
      },
      'themes.googleusercontent.com': {
        '.*': { proxy: 'google-themes.proxy.ustclug.org' },
      },
      // 'fonts.gstatic.com': {
      //   '.*': {
      //     proxy: 'gstatic.loli.net',
      //     backup: ['fonts-gstatic.proxy.ustclug.org']
      //   }
      // },
      'clients*.google.com': { '.*': { abort: false, desc: '设置abort：true可以快速失败，节省时间' } },
      'www.googleapis.com': { '.*': { abort: false, desc: '设置abort：true可以快速失败，节省时间' } },
      'lh*.googleusercontent.com': { '.*': { abort: false, desc: '设置abort：true可以快速失败，节省时间' } },
      // mapbox-node-binary.s3.amazonaws.com/sqlite3/v5.0.0/napi-v3-win32-x64.tar.gz
      '*.s3.1amazonaws1.com': {
        '/sqlite3/.*': {
          redirect: 'npm.taobao.org/mirrors',
        },
      },
      // 'packages.elastic.co': { '.*': { proxy: 'elastic.proxy.ustclug.org' } },
      // 'ppa.launchpad.net': { '.*': { proxy: 'launchpad.proxy.ustclug.org' } },
      // 'archive.cloudera.com': { '.*': { regexp: '/cdh5/.*', proxy: 'cloudera.proxy.ustclug.org' } },
      // 'downloads.lede-project.org': { '.*': { proxy: 'lede.proxy.ustclug.org' } },
      // 'downloads.openwrt.org': { '.*': { proxy: 'openwrt.proxy.ustclug.org' } },
      // 'secure.gravatar.com': { '.*': { proxy: 'gravatar.proxy.ustclug.org' } },
      '*.carbonads.com': {
        '/carbon.*': {
          abort: true,
          desc: '广告拦截',
        },
      },
      '*.buysellads.com': {
        '/ads/.*': {
          abort: true,
          desc: '广告拦截',
        },
      },
    },
    // 预设置IP列表
    preSetIpList: {
      'github.com': {
        '4.237.22.38': true,
        '20.26.156.215': true,
        '20.27.177.113': true,
        '20.87.245.0': true,
        '20.200.245.247': true,
        '20.201.28.151': true,
        '20.205.243.166': true,
        '140.82.113.3': true,
        '140.82.114.4': true,
        '140.82.116.3': true,
        '140.82.116.4': true,
        '140.82.121.3': true,
        '140.82.121.4': true,
      },
      'api.github.com': {
        '20.26.156.210': true,
        '20.27.177.116': true,
        '20.87.245.6': true,
        '20.200.245.245': true,
        '20.201.28.148': true,
        '20.205.243.168': true,
        '20.248.137.49': true,
        '140.82.112.5': true,
        '140.82.113.6': true,
        '140.82.116.6': true,
        '140.82.121.6': true,
      },
      'codeload.github.com': {
        '20.26.156.216': true,
        '20.27.177.114': true,
        '20.87.245.7': true,
        '20.200.245.246': true,
        '20.201.28.149': true,
        '20.205.243.165': true,
        '20.248.137.55': true,
        '140.82.113.9': true,
        '140.82.114.10': true,
        '140.82.116.10': true,
        '140.82.121.9': true,
      },
      '*.githubusercontent.com': {
        '146.75.92.133': true,
        '199.232.88.133': true,
        '199.232.144.133': true,
      },
      'viewscreen.githubusercontent.com': {
        '140.82.112.21': true,
        '140.82.112.22': true,
        '140.82.113.21': true,
        '140.82.113.22': true,
        '140.82.114.21': true,
        '140.82.114.22': true,
      },
      'github.io': {
        '185.199.108.153': true,
        '185.199.109.153': true,
        '185.199.110.153': true,
        '185.199.111.153': true,
      },
      '*.githubassets.com': {
        '185.199.108.154': true,
        '185.199.109.154': true,
        '185.199.110.154': true,
        '185.199.111.154': true,
      },
      '^(analytics|ghcc)\\.githubassets\\.com$': {
        '185.199.108.153': true,
        '185.199.110.153': true,
        '185.199.109.153': true,
        '185.199.111.153': true,
      },
      '*.pixiv.net': {
        // 以下为 `cdn-origin.pixiv.net` 域名的IP
        '210.140.139.154': true,
        '210.140.139.157': true,
        '210.140.139.160': true,
      },
      'hub.docker.com': {
        '44.221.37.199': true,
        '52.44.227.212': true,
        '54.156.140.159': true,
      },
      'sessions-bugsnag.docker.com': {
        '44.221.37.199': true,
        '52.44.227.212': true,
        '54.156.140.159': true,
      },
    },
    whiteList: {
      '*.cn': true,
      'cn.*': true,
      '*china*': true,
      '*.dingtalk.com': true,
      '*.apple.com': true,
      '*.microsoft.com': true,
      '*.alipay.com': true,
      '*.qq.com': true,
      '*.baidu.com': true,
      '192.168.*': true,
    },
    dns: {
      providers: {
        aliyun: {
          type: 'https',
          server: 'https://dns.alidns.com/dns-query',
          cacheSize: 1000,
        },
        cloudflare: {
          type: 'https',
          server: 'https://1.1.1.1/dns-query',
          cacheSize: 1000,
        },
        quad9: {
          type: 'https',
          server: 'https://9.9.9.9/dns-query',
          cacheSize: 1000,
        },
        safe360: {
          type: 'https',
          server: 'https://doh.360.cn/dns-query',
          cacheSize: 1000,
        },
        rubyfish: {
          type: 'https',
          server: 'https://rubyfish.cn/dns-query',
          cacheSize: 1000,
        },
      },
      mapping: {
        '*.github.com': 'quad9',
        '*github*.com': 'quad9',
        '*.github.io': 'quad9',
        '*.docker.com': 'quad9',
        '*.stackoverflow.com': 'quad9',
        '*.electronjs.org': 'quad9',
        '*.amazonaws.com': 'quad9',
        '*.yarnpkg.com': 'quad9',
        '*.cloudfront.net': 'quad9',
        '*.cloudflare.com': 'quad9',
        'img.shields.io': 'quad9',
        '*.vuepress.vuejs.org': 'quad9',
        '*.gh.docmirror.top': 'quad9',
        '*.v2ex.com': 'quad9',
        '*.pypi.org': 'quad9',
        '*.jetbrains.com': 'quad9',
        '*.azureedge.net': 'quad9',
      },
      speedTest: {
        enabled: true,
        interval: 300000,
        hostnameList: ['github.com'],
        dnsProviders: ['cloudflare', 'safe360', 'rubyfish'],
      },
    },
  },
  proxy: {},
  plugin: {},
  help: {
    dataList: [
      {
        title: '查看DevSidecar的说明文档（Wiki）',
        url: 'https://github.com/docmirror/dev-sidecar/wiki',
      },
      {
        title: '为了展示更多帮助信息，请启用 “远程配置” 功能！！！',
      },
    ],
  },
}

// region 加载本地配置文件所需的方法

function _getConfigPath () {
  const dir = defaultConfig.server.setting.userBasePath
  if (!fs.existsSync(dir)) {
    return null
  }

  // 兼容1.7.3及以下版本的配置文件处理逻辑
  const newFilePath = path.join(dir, '/config.json')
  const oldFilePath = path.join(dir, '/config.json5')
  if (!fs.existsSync(newFilePath)) {
    if (fs.existsSync(oldFilePath)) {
      return oldFilePath // 如果新文件不存在，且旧文件存在，则返回旧文件路径
    } else {
      return null // 两个文件都不存在
    }
  }

  return newFilePath
}

function _getConfig () {
  const configFilePath = _getConfigPath()
  if (configFilePath == null) {
    return {}
  }

  if (!fs.existsSync(configFilePath)) {
    return {}
  }

  return jsonApi.parse(fs.readFileSync(configFilePath))
}

function _getRemoteSavePath (suffix = '') {
  const dir = defaultConfig.server.setting.userBasePath
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  return path.join(dir, `/remote_config${suffix}.json5`)
}

function _readRemoteConfigStr (suffix = '') {
  if (defaultConfig.app.remoteConfig.enabled !== true) {
    if (suffix === '_personal') {
      if (!defaultConfig.app.remoteConfig.personalUrl) {
        return '{}'
      }
    } else if (suffix === '') {
      if (!defaultConfig.app.remoteConfig.url) {
        return '{}'
      }
    }
    return '{}'
  }
  try {
    const path = _getRemoteSavePath(suffix)
    if (fs.existsSync(path)) {
      const file = fs.readFileSync(path)
      return file.toString()
    }
  } catch {
  }

  return '{}'
}

function _readRemoteConfig (suffix = '') {
  return jsonApi.parse(_readRemoteConfigStr(suffix))
}

function _getConfigFromFiles () {
  const newConfig = _getConfig()

  const merged = newConfig != null ? lodash.cloneDeep(newConfig) : {}

  if (defaultConfig.app.remoteConfig.enabled === true) {
    let personalRemoteConfig = null
    let shareRemoteConfig = null

    if (defaultConfig.app.remoteConfig.personalUrl) {
      personalRemoteConfig = _readRemoteConfig('_personal')
      mergeApi.doMerge(merged, personalRemoteConfig) // 先合并一次个人远程配置，使配置顺序在前
    }
    if (defaultConfig.app.remoteConfig.url) {
      shareRemoteConfig = _readRemoteConfig()
      mergeApi.doMerge(merged, shareRemoteConfig) // 先合并一次共享远程配置，使配置顺序在前
    }
    mergeApi.doMerge(merged, defaultConfig) // 合并默认配置，顺序排在最后
    if (defaultConfig.app.remoteConfig.url) {
      mergeApi.doMerge(merged, shareRemoteConfig) // 再合并一次共享远程配置，使配置生效
    }
    if (defaultConfig.app.remoteConfig.personalUrl) {
      mergeApi.doMerge(merged, personalRemoteConfig) // 再合并一次个人远程配置，使配置生效
    }
  } else {
    mergeApi.doMerge(merged, defaultConfig) // 合并默认配置
  }
  if (newConfig != null) {
    mergeApi.doMerge(merged, newConfig) // 再合并一次用户配置，使用户配置重新生效
  }
  mergeApi.deleteNullItems(merged) // 删除为null及[delete]的项

  return merged
}

// endregion

// 从本地文件中加载配置
defaultConfig.configFromFiles = _getConfigFromFiles()

module.exports = defaultConfig
