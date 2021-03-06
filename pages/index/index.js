const app = getApp();
Page({
  data: {
    in_theaters: [],
    comingSoon: [],
    topMovie: [],
    swiperIndex: 0,
    tab_num: '1',
    userInfo: {},
    chatMsgs: [],
    txt: '',
    scrollToView: null,
    userInfoBtnHidden: false,
    start: 'Infinity',
    limit: 20,
    loading: false,
    enouth: false,

    imgUrls: [
      'http://img02.tooopen.com/images/20150928/tooopen_sy_143912755726.jpg',
      'http://img06.tooopen.com/images/20160818/tooopen_sy_175866434296.jpg',
      'http://img06.tooopen.com/images/20160818/tooopen_sy_175833047715.jpg'
    ],
    indicatorDots: false,
    autoplay: false,
    interval: 5000,
    duration: 1000
  },
  onLoad: function() {
    let $this = this;
    // app.setWatcher(this.data, this.watch, this);
    wx.setNavigationBarTitle({
      title: '月牙爱看-热映电影'
    })
    // 电影
    $this.getMovies();
    // 聊天
    $this.getHistory();
  },

  // swiper
  swiperChange(e) {
    console.log(e)
    this.setData({
      swiperIndex: e.detail.current
    })
  },
  swiperTo(e) {
    this.setData({
      swiperIndex: e.currentTarget.dataset.index
    })
  },
  changeAutoplay(e) {
    this.setData({
      autoplay: !this.data.autoplay
    })
  },
  intervalChange(e) {
    this.setData({
      interval: e.detail.value
    })
  },
  durationChange(e) {
    this.setData({
      duration: e.detail.value
    })
  },
  // 获取电影数据
  getMovies: function() {
    var $this = this;
    var apis = [
      { api: 'in_theaters', name: 'in_theaters'},
      { api: 'coming_soon', name: 'comingSoon'},
      { api: 'top250?start=0&count=50', name: 'topMovie'}
    ]
    apis.forEach(item => {
      $this.getMovieByApi(item.api, item.name)
    })
  },
  getMovieByApi: function(api, name) {
    var $this = this;
    wx.request({
      url: 'https://small.tjzmy.cn/v2/movie/' + api,
      header: {
        "Content-Type": "json"
      },
      success: function (res) {
        var obj = {};
        obj[name] = res.data.subjects;
        $this.setData(obj);
      }
    })
  },

  // 开始第一次链接websocket
  startSocket: function() {
    var $this = this;
    wx.connectSocket({
      url: 'wss://small.tjzmy.cn/socket/?img=' + this.data.userInfo.avatarUrl + '&openid=' + app.globalData.openid,
      header: {
        'content-type': 'application/json'
      }
    })
    wx.onSocketOpen(function (res) {
      console.log('WebSocket连接已打开！');
      // var msg = '大家好';
      // wx.sendSocketMessage({
      //   data: msg,
      //   fail: function (res) {
      //     console.log('发送失败1', res)
      //   },
      //   success: function(res) {
      //     console.log('收到服务器内容：', res);
      //   }
      // })
    })
    wx.onSocketError(function (res) {
      console.log('WebSocket连接打开失败，请检查！');
    })
    wx.onSocketMessage(function (res) {
      console.log('收到服务器内容：' + res.data);
      console.log('收到信息时用户的信息data.userInfo', $this.data.userInfo)
      var resdata = JSON.parse(res.data);
      $this.render(resdata);
    })
    wx.onSocketClose(function(res) {
      console.log('Socket链接关闭');
      setTimeout(function() {
        $this.reconnect();
      }, 1000)
    })
  },
  reconnect: function(msg) {
    var $this = this;
    wx.connectSocket({
      url: 'wss://small.tjzmy.cn/socket/?img=' + $this.data.userInfo.avatarUrl + '&openid=' + app.globalData.openid,
      header: {
        'content-type': 'application/json'
      }
    })
    wx.onSocketOpen(function (res) {
      console.log('WebSocket连接已打开！again');
      if (msg) {
        wx.sendSocketMessage({
          data: msg,
          fail: function(res) {
            console.log('重新链接并发送失败', res);
          },
          success: function(res) {
            console.log('收到服务器内容：', res.data);
          }
        })
      }
    })
  },
  detail: function(event) {
    let movie = event.currentTarget.dataset.movie;
    wx.navigateTo({
      url: '../movieDetail/movieDetail?id=' + movie.id
    })
  },
  openUserInfo: function(event) {
    let openid = event.currentTarget.dataset.openid;
    wx.navigateTo({
      url: '../userInfo/userInfo?openid=' + openid
    })
  },
  getUserInfoFun: function () {
    var S = this;

    // 获取用户信息
    if (app.globalData.userInfo && app.globalData.userInfo.nickName) {
      // 已有用户信息
      S.setData({
        userInfo: app.globalData.userInfo
      })
      S.startSocket();
      S.setData({
        userInfoBtnHidden: true,
        tab_num: '2'
      })
      return;
    } else {
      // 没有用户信息
      wx.getUserInfo({
        success: function (res) {
          console.log("userInfo:", res);
          res.userInfo.openid = app.globalData.openid;
          app.globalData.userInfo = res.userInfo;
          S.setData({
            userInfo: res.userInfo
          })
          S.startSocket();
          S.saveUserInfo(res.userInfo);
          S.setData({
            userInfoBtnHidden: true,
            tab_num: '2'
          })
        },
        fail: res => {
          // 用户拒绝，返回前一页
          S.setData({
            tab_num: '1'
          })
        }
      })
    }
  },
  tabSwitch: function(event) {
    let $this = this;
    let tab_num = event.currentTarget.dataset.num;
    if (tab_num == '2' && !$this.data.userInfoBtnHidden) {
      return;
    }
    $this.setData({
      tab_num: event.currentTarget.dataset.num
    })
  },
  bindFormSubmit: function (e) {
    var $this = this;
    console.log(e.detail.value.textarea)
    var msg = e.detail.value.textarea;
    $this.send(msg);
  },
  inputSubmit: function (e) {
    var $this = this;
    $this.send(e.detail.value);
  },
  send: function(msg) {
    var $this = this;
    if (!msg) {
      return;
    }
    wx.sendSocketMessage({
      data: msg,
      fail: function (res) {
        console.log('发送失败2', res)
        $this.reconnect(msg);
      },
      success: function (res) {
      }
    })
    this.setData({
      txt: ''
    })
  },
  saveUserInfo: function(userInfo) {
    var S = this;
    wx.request({
      url: 'https://small.tjzmy.cn/api/user/save',
      method: 'post',
      data: userInfo,
      header: {
        'content-type': 'multipart/form-data'
      },
      success: function(res) {
        console.log(res)
      }
    })
  },
  render: function(chat) {
    var $this = this;
    var chatMsgs = $this.data.chatMsgs;
    chatMsgs.push(chat);
    $this.setData({
      chatMsgs: chatMsgs,
      scrollToView: '_' + chatMsgs[chatMsgs.length-1].td
    })
  },
  getHistory: function(isUpper) {
    var S = this;
    if(S.data.far || S.data.enough) {
      return;
    }
    S.setData({
      loading: true,
      far: true
    })
    wx.request({
      url: 'https://small.tjzmy.cn/api/chat/list2',
      data: {
        start: S.data.start,
        limit: S.data.limit
      },
      header: {
        'content-type': 'json'
      },
      success: function (res) {
        if(res.statusCode == 200) {
          if(res.data.data.length > 0) {
            var chatMsgs = S.data.chatMsgs;
            var scrollToView = null;
            if (chatMsgs.length > 0) {
              scrollToView = '_' + chatMsgs[0].td;
            } 
            chatMsgs = res.data.data.reverse().concat(chatMsgs);
            S.setData({
              chatMsgs: chatMsgs,
              start: res.data.data[0].td
            })
            console.log('td', S.data.start)
            setTimeout(function() {
              if(!isUpper) {
                S.setData({
                  scrollToView: '_' + chatMsgs[chatMsgs.length - 1].td
                })
              } else {
                S.setData({
                  scrollToView: scrollToView
                })
              }
            }, 1)
          } else {
            console.log('enough')
            S.setData({
              enough: true
            })
          }
        }
      },
      complete: function() {
        S.setData({
          loading: false
        })
        setTimeout(function() {
          S.setData({
            far: false
          })
        }, 1000)
      }
    })
  },
  upper: function() {
    this.getHistory(true);
  }
})