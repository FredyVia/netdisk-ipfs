'use strict';
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const { globSource } = require('ipfs-http-client')
const OrbitDB = require('orbit-db')
const path = require('path');
const create = require('ipfs-http-client')
const process = require('process');
const crypto = require("crypto");
const { pipe } = require('it-pipe');
var encryptor = require('file-encryptor');
var mainWindow;
const config = {
  ipfs_url: process.env.ipfs_url || 'http://localhost:50001',
  orbitdbOptions: {
    directory:
      process.env.orbitdb_directory ||
      path.join(process.env.HOME || process.env.USERPROFILE, '/.orbitdb-netdisk')
  },
  publicDatabaseAddr: "/orbitdb/zdpuB13tKvqWb8x9caomtqATcwzm4CAqAm7dLLkRfTUNbUfiv/NetDisk-PublicDatabase",
  react_port: process.env.web_port || '3000'
}


class Utils {
  static async getID(ipfs) {
    let idData = await ipfs.id()
    console.log(idData.id)
    return idData.id
  }

  static Uint8ArrayToString(fileData) {
    var dataString = "";
    for (var i = 0; i < fileData.length; i++) {
      dataString += String.fromCharCode(fileData[i]);
    }
    return dataString
  }
  static generateNewFriendTopic(username = this.username) {
    console.log('生成的topic:   NetDisk-NewFriend-' + username)
    return 'NetDisk-NewFriend-' + username;
  }

  static async getDestFilePath(ipfs_client, mfsFileDirectoryPath, mfsFileBaseName, mfsFileExt, mfsIter = 0) {
    let destPath = path.join(mfsFileDirectoryPath, mfsFileBaseName + mfsFileExt);
    if (mfsIter != 0) {
      destPath = path.join(mfsFileDirectoryPath, mfsFileBaseName + '(' + mfsIter + ')' + mfsFileExt);
    }
    console.log(destPath)
    return await ipfs_client.files.stat(destPath).then(() => {
      return Utils.getDestFilePath(mfsFileDirectoryPath, mfsFileBaseName, mfsFileExt, mfsIter + 1);
    }).catch(err => {
      return destPath;
    });
  }
  static async uploadLocalFile2MFS(ipfs_client, localFilePath, mfsPath, encypt) {
    try {
      let file = await ipfs_client.add(globSource(localFilePath, { recursive: true }))
      console.log(file.cid)
      let mfsFileExt = path.extname(localFilePath);
      let mfsFileBaseName = path.basename(localFilePath, mfsFileExt);
      console.log(mfsPath, mfsFileBaseName + mfsFileExt)
      console.log(path.join(mfsPath, mfsFileBaseName + mfsFileExt))
      let destPath = await Utils.getDestFilePath(ipfs_client, mfsPath, mfsFileBaseName, mfsFileExt);
      console.log("out:" + destPath);
      await ipfs_client.files.cp(file.cid, destPath);
      return true;
    } catch (error) {
      console.error(error);
      error.message;
      return false;
    }
  };

  static async ls_r(ipfs, baseDir = '/') {
    let files = [];
    for await (const file of ipfs.files.ls(baseDir)) {
      // console.log(file.name)
      // console.log(file.type)
      // console.log(file.size)
      // console.log(file.cid)
      let fileAbsolutePath = baseDir + file.name
      let fileItem;
      fileItem = {
        title: file.name,
        key: fileAbsolutePath,
      }
      if (file.type === 'directory') {
        let tmp = (await Utils.ls_r(ipfs, fileAbsolutePath + '/'))
        fileItem['isLeaf'] = false;
        fileItem['children'] = tmp.slice();
      } else {
        fileItem['isLeaf'] = true;
      }
      files.push(fileItem)
    }
    return files
  }
  static generateMessage(status, message) {
    return status + "|" + message;
  }

  static predo4ls_r(files) {
    let files_json = { title: '/', key: '/', isLeaf: false, children: files };
    console.log(JSON.stringify(files_json));
    return files_json
  };

  static checkEmptyString(obj) {
    //
    console.log(obj)
    console.log(typeof (obj))
    if (typeof obj == "undefined" || obj == null || obj == "") {
      return true;
    }
    return false;
  };



  static encryptFile(inputFilePath, key, outputFilePath, callback, options = { algorithm: 'aes256' }) {
    encryptor.encryptFile(inputFilePath, outputFilePath, key, options, callback)
  }
  //...
  static dencryptFile(inputFilePath, key, outputFilePath, callback, options = { algorithm: 'aes256' }) {
    encryptor.decryptFile(inputFilePath, outputFilePath, key, options, callback);
  }
  static encrypt(text, key) {
    let ENCRYPTION_KEY = crypto.createHash('sha256').update(key).digest('base64').substr(0, 32);
    let iv = crypto.randomBytes(16);
    let cipher = crypto.createCipheriv('aes-256-ctr', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  };

  static decrypt(text, key) {
    let ENCRYPTION_KEY = crypto.createHash('sha256').update(key).digest('base64').substr(0, 32);
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-ctr', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  };

  static async openAndListen2Database(orbitdb, databaseAddr, _pipe = [async () => { }]) {
    let db = await orbitdb.open(databaseAddr)
    await db.load();
    console.log('replicated:', databaseAddr)
    db.events.on('replicated', async () => {
      console.log("sync from others");
      await pipe(..._pipe);
      // callback(db.all);
    })
    return db;
  }
}

class Backend {
  constructor(ipfs, orbitdb, publicDatabaseAddr) {
    this.logoutFunctionList = [];
    this.shutdownFunctionList = [];
    this.init(ipfs, orbitdb, publicDatabaseAddr)
  };


  async init(ipfs, orbitdb, publicDatabaseAddr) {
    // this.preFriends = [];
    this.ipfs = ipfs;
    this.orbitdb = orbitdb;
    console.log('==========================')
    this.publicDatabase = await Utils.openAndListen2Database(this.orbitdb, publicDatabaseAddr)
    console.log('==========================')
    this.shutdownFunctionList.push(this.publicDatabase.close)
    this.chatter = null;
    ipcMain.on('files-list-request', async (event) => {
      let files_json = Utils.predo4ls_r(await Utils.ls_r(ipfs))
      event.reply('files-list-response', JSON.stringify(files_json))
    });
    ipcMain.on('files-delete-request', async (event, arg) => {
      console.log(arg);
      ipfs.files.rm(arg, { recursive: true }).then(console.log)
      let files_json = Utils.predo4ls_r(await Utils.ls_r(ipfs))
      event.reply('files-list-response', JSON.stringify(files_json))
    });
    console.log('==========================')
    // this.login.bind
    ipcMain.on('login-request', (event, loginForm) => {
      console.log('----------------login----------------')
      console.log(loginForm)
      console.log(loginForm.username)
      this.login(loginForm.username, loginForm.password).then(() => {
        event.reply('login-response', 'success')
        event.reply('isLogin', true)
      }).catch(error => {
        console.log(error)
        event.reply('login-response', Utils.generateMessage('failed', error.message))
      })
    })
    ipcMain.on('isLogin', (event) => {
      event.reply('isLogin', this.isLogin())
    })
    ipcMain.on('register-request', (event, registerForm) => {
      console.log('----------------register----------------')
      console.log(registerForm)
      console.log(registerForm.username)
      this.register(registerForm.username, registerForm.password).then(() => {
        // console.log(res)
        event.reply('register-response', 'success')
      }).catch(error => {
        console.log(error)
        event.reply('register-response', Utils.generateMessage('failed', error.message))
      })
    })
    ipcMain.on('openDialog-request', (event, arg) => {
      var destFile = arg.folder
      var encypt = arg.encypt
      console.log('openDialog-request')
      console.log(destFile)
      dialog.showOpenDialog({
        properties: ['openFile','openDirectory', 'multiSelections', 'createDirectory'],
        message: "choose the files upload to ipfs"
      }).then(result => {
        console.log(result.canceled);
        // 发送取消消息
        console.log(result.filePaths);
        // changes = false;
        result.filePaths.map(function (item, index, ary) {
          console.log('fsfs')
          Utils.uploadLocalFile2MFS(ipfs, item, destFile, encypt).then(async (res) => {
            if (res) {
              event.reply('openDialog-response', Utils.generateMessage("success", "upload " + item + " success"))
              let files_json = Utils.predo4ls_r(await Utils.ls_r(ipfs))
              event.reply('files-list-response', JSON.stringify(files_json))
            }
            else {
              event.reply('openDialog-response', Utils.generateMessage("error", "upload " + item + " error"))
            }
          })
        })
      })
    })
    // await this.openAndListen2Database(friendshipDatabaseAddr);
  }
  async login(username, password) {
    let encrypted = this.publicDatabase.get(username)
    console.log(encrypted)
    if (Utils.checkEmptyString(encrypted))
      throw new Error('Username doesn\'t exists');
    let privateDatabaseAddr = Utils.decrypt(encrypted, password)
    console.log(privateDatabaseAddr)
    if (OrbitDB.isValidAddress(privateDatabaseAddr)) {
      // this.privateDatabase = await Utils.openAndListen2Database(this.orbitdb, privateDatabaseAddr, [this.friendsChanges])
      // this.username = username;
      // this.logoutFunctionList.push(this.privateDatabase.close())
      this.chatter = new Chat(this.ipfs, this.orbitdb, username, privateDatabaseAddr)
      return;
    }
    throw new Error('password error');
  }
  async register(username, password) {
    username = username.toLowerCase()
    if (Utils.checkEmptyString(this.publicDatabase.get(username)) == false) {
      // return false
      throw new Error('username already used!')
    }
    let privateDatabase = await this.orbitdb.keyvalue("NetDisk-PrivateDatabase-" + username, {
      // Give write access to everyone,由于用户可能异地登录，所以没有给控制，只是给初始地址加密。
      accessController: {
        write: ['*']
      }
    });
    // db.put(username,{password:password})
    this.publicDatabase.put(username, Utils.encrypt(privateDatabase.address.toString(), password));
    // privateDatabase.put('info', { friends: [] }, { pin: true });
    privateDatabase.close()
    // return true;
  }

  isLogin() {
    return this.chatter != null;
  }
  async logout() {
    await pipe(this.logoutFunctionList);
  }
}

class Chat {
  constructor(ipfs, orbitdb, username, privateDatabaseAddr) {
    this.ipfs = ipfs;
    this.orbitdb = orbitdb;
    this.username = username;
    console.log('==========================')
    console.log(this.username)
    console.log('==========================')
    this.init(privateDatabaseAddr);
  };
  getFriends() {
    // console.log('=++++++++++============+++++++=====++===++==+====')
    let obj = this.privateDatabase.all;
    let friendsArray = [];
    Object.keys(obj).forEach(key => {
      let tmp = {};
      tmp.name = key;
      tmp.friendshipDatabaseAddr = obj[key];
      friendsArray.push(tmp)
    })
    return friendsArray;
  }
  getHistoryRecord(friendName) {
    console.log('getHistoryRecord')
    console.log(friendName)
    // console.log(this.friendshipDatabases.length)
    console.log(this.friendshipDatabases[friendName].address.toString())
    return (
      {
        friendName: friendName,
        messages: (this.friendshipDatabases[friendName]
          .iterator({ limit: -1 }).collect().map((e) => e.payload.value))
      }
    )
  }
  async sendMessage(friendName, message) {
    // throws exception
    console.log(friendName, message)
    await this.friendshipDatabases[friendName].add({
      user: this.username,
      message: message,
      date: Math.floor(Date.now() / 1000)
    }, { pin: true });
    // 有点问题
    // mainWindow.webContents.send('friendshipDatabase-changes',
    //   //  this.getHistoryRecord(friendName).message
    //   friendName
    // );
  }

  // async generateFriendshipDatabase(username, friendName) {
  //   const friendshipDatabase = await orbitdb.log('NetDisk-PrivateDatabase-FriendShip-' + this.username + friendName, {
  //     // Give write access to everyone
  //     accessController: {
  //       write: ['*']
  //     }
  //   })
  //   this.friendshipDatabases[username] = friendshipDatabase;
  //   friendshipDatabase.events.on('replicated', () => {
  //     console.log("sync from others: \n", db.address.toString(), "\n", db.all);
  //     // callback(db.all);
  //   })
  //   return friendshipDatabase.address.toString()
  // }
  async addFriend(friendName) {
    console.log(this.username, friendName)
    if (this.username == friendName)
      return
    if (!this.preFriends.has(friendName)) {
      this.preFriends.add(friendName);
    }
    await this.ipfs.pubsub.publish(Utils.generateNewFriendTopic(friendName),
      JSON.stringify({
        type: 'request',
        friendName: this.username
      })
    );
    // const db = await orbitdb.log('NetDisk-PrivateDatabase-Friendship-' + this.username
  }

  // async checkFriendsOnline() {
  //   let friends = await getFriends()

  //   // to do(friends online or offline list)
  // }
  // friendRequestChanges() {
  //   console.log(this.friendRequests)
  //   mainWindow.webContents.send('newFriendRequests-response', Array.from(this.friendRequests))
  // }
  async friendsChanges() {
    mainWindow.webContents.send('friends-response', this.getFriends())
  }
  async friendshipChanges(friendName) {
    console.log('changes：', friendName)
    mainWindow.webContents.send('friendshipDatabase-changes',
      // {
      // friendName: friendName,
      // value: this.friendshipDatabases[friendName]
      // .iterator({ limit: -1 }).collect().map((e) => e.payload.value)
      // }
      friendName
    );
  }
  async init(privateDatabaseAddr) {
    this.friendRequests = new Set();
    this.preFriends = new Set();
    this.friendshipDatabases = {};
    // this.friendsChanges.bind(this)
    this.privateDatabase = await Utils.openAndListen2Database(this.orbitdb, privateDatabaseAddr, [async () => { this.friendsChanges() }]);
    let friendsArray = this.getFriends()
    mainWindow.webContents.send('friends-response', friendsArray)
    // console.log(friendsArray)
    // console.log(typeof (friendsArray))

    // let info = {
    //   friends: [
    //     {
    //       name: xxxxx,
    //       friendshipDatabaseAddr: /orbit/xxxxxxxxxxxxxxxxxx / xxx
    //     },
    //     {
    //       name: xxxxx,
    //       friendshipDatabaseAddr: /orbit/xxxxxxxxxxxxxxxxxx / xxx
    //     },
    // }
    // mainWindow.webContents.send('friends-response',info.friends);
    // var outterFriendshipDatabases = this.friendshipDatabases;
    // var outterOrbitdb = this.orbitdb;
    // let innerFriendshipChanges = this.friendRequestChanges
    console.log('&&&&&&&&&&&&&&&&')
    console.log(friendsArray)
    var _this = this
    friendsArray.map(async function (value) {
      // console.log('name:--------', value.name)
      // console.log("-------------", _this.friendshipDatabases.length)
      console.log('-----value.friendshipDatabaseAddr------', value.friendshipDatabaseAddr)
      _this.friendshipDatabases[value.name] = await Utils.openAndListen2Database(_this.orbitdb, value.friendshipDatabaseAddr, [
        () => {
          _this.friendshipChanges(value.name)
        }
      ]);
      console.log(_this.friendshipDatabases[value.name].iterator({ limit: -1 }).collect().map((e) => e.payload.value))
      // console.log("+++++++++++++", _this.friendshipDatabases.length)
      // console.log("+++++++++++++", _this.friendshipDatabases)
    });
    // console.log('---------', this.friendshipDatabases.length)
    // 前端发送的添加好友的请求
    ipcMain.on('addFriend-request', (event, friendForm) => {
      console.log(friendForm)
      this.addFriend(friendForm.friendName)
    })
    ipcMain.on('deleteFriend-request', async (event, friendName) => {
      console.log(friendName)
      // this.addFriend(friendForm.friendName)
      // to do 删除朋友
      await this.privateDatabase.del(friendName)
      this.friendshipDatabases[friendName].close()//.address.toString()
      delete this.friendshipDatabases[friendName];
    })
    ipcMain.on('friendshipDatabase-request', (event, friendName) => {
      event.reply('friendshipDatabase-response',
        //  {
        //   friendName: friendName,
        //   messages: this.getHistoryRecord(friendName)
        // })
        this.getHistoryRecord(friendName))
    })
    ipcMain.on('sendMessage-request', (event, arg) => {
      console.log(arg)
      console.log(this.friendshipDatabases[arg.friendName].address)
      this.sendMessage(arg.friendName, arg.message);
      // event.reply()
    })

    // ipcMain.on('newFriendRequests-request', async (event, json_arg) => {
    //   event.reply('newFriendRequests-response', this.friendRequests)
    // })
    ipcMain.on('friends-request', (event) => {
      event.reply('friends-response', this.getFriends())
    });

    // 前端对于新好友请求的接受与否
    ipcMain.on('newFriend', async (event, json_arg) => {
      // JSON.parse(json_arg);
      console.log('前端发回的好友同意与否', json_arg)
      if (json_arg.type == true) {
        console.log(json_arg.type)
        console.log(_this.username,json_arg.friendName,)
        var friendshipDatabase = await _this.orbitdb.log('NetDisk-PrivateDatabase-FriendShip-' + _this.username + '-' + json_arg.friendName, {
          // Give write access to everyone
          accessController: {
            write: ['*']
          }
        })
        console.log('总是建立不了数据库')

        // this.friendshipDatabases[json_arg.friendName] = friendshipDatabase;
        console.log(friendshipDatabase.address.toString());
        // friendshipDatabase.close()

        // try {
        friendshipDatabase.events.on('replicated', async () => {
          console.log("sync from others: \n", friendshipDatabase.address.toString(), "\n");
          // await pipe(..._pipe);
          // callback(db.all);
          mainWindow.webContents.send('friendshipDatabase-response',this.getHistoryRecord(friendName))
        })
        // } catch (e) {
        //   console.log('已经订阅过了')
        // }

        _this.friendshipDatabases[json_arg.friendName] = friendshipDatabase
        // friendshipDatabase.add()
        // this.sendMessage
        console.log('没问题')
        // mainWindow.
        console.log(_this.username, friendshipDatabase.address.toString())
        // try {
        await _this.ipfs.pubsub.publish(Utils.generateNewFriendTopic(json_arg.friendName),
          JSON.stringify({
            type: 'response-agree',
            friendName: _this.username,
            friendshipDatabaseAddr: friendshipDatabase.address.toString()
          })
        )
        // }
        // catch (e) {
        //   // 没有stringfy
        //   console.log('罪魁祸首', e)
        // }
        console.log('没问题')
        await _this.privateDatabase.put(json_arg.friendName, friendshipDatabase.address.toString())
        // let friends = await this.getFriends()
        event.reply('friends-response', this.getFriends());
      }
      else {
        _this.ipfs.pubsub.publish(Utils.generateNewFriendTopic(json_arg.friendName),
          JSON.stringify({
            type: 'response-deny',
            friendName: _this.username
          })
        )
      }
      _this.friendRequests.delete(json_arg.friendName)
      console.log('开始刷新前端请求列表')
      console.log(_this.friendRequests)
      console.log(typeof (_this.friendRequests))
      let arr = Array.from(_this.friendRequests)
      console.log(arr)
      console.log(typeof (arr))
      // JSON.stringify({ friendRequests: arr })
      // mainWindow.webContents.send('newFriendRequests-response', arr);
      event.reply('newFriendRequests-response', arr);
      console.log('没问题');

    });
    // console.log('subscribe');
    console.log(this.username)
    // newFriendListenTopic
    this.ipfs.pubsub.subscribe(Utils.generateNewFriendTopic(this.username), async (message) => {
      // console.log(message)
      // console.log(message.data)
      // console.log(typeof (message.data))
      let message_str = Utils.Uint8ArrayToString(message.data)
      // console.log(message_str)
      let jsonMessage = JSON.parse(message_str);
      console.log(jsonMessage)

      // peer发送的新朋友的请求
      if (jsonMessage.type == 'request') {
        if (this.friendshipDatabases[jsonMessage.friendName] == null) {
          this.friendRequests.add(jsonMessage.friendName);
          // this.friendRequestChanges()
          mainWindow.webContents.send('newFriendRequests-response', Array.from(this.friendRequests))
          // mainWindow.webContents.send('newFriend', { type: 'request', Message: jsonMessage.friendName });
          // dialog.showMessageBox({
          //   type: 'warning',
          //   title: "来自 " + message + " 的好友请求",
          //   message: message + ' 请求添加您为好友！',
          //   buttons: ["同意", "拒绝"]
          // }).then(result => {
          //   console.log("您的选择:", result.response);
          // console.log(result)

          // }).catch(err => {
          //   console.log(err)
          // })
          // 却保是自己添加的朋友，不是被迫添加的
          // generateFriendshipDatabase()
        }
        else {
          // 这里不安全
          await _this.ipfs.pubsub.publish(Utils.generateNewFriendTopic(jsonMessage.friendName),
            JSON.stringify({
              type: 'response-agree',
              friendName: _this.username,
              friendshipDatabaseAddr: this.friendshipDatabases[jsonMessage.friendName].address.toString()
            })
          )
        }
      }
      // 新朋友对你的添加朋友请求做的回应
      else if (jsonMessage.type == 'response-agree') {
        console.log(jsonMessage.type)
        if (this.preFriends.has(jsonMessage.friendName)) {
          this.preFriends.delete(jsonMessage.friendName)
          await this.privateDatabase.put(
            jsonMessage.friendName,
            jsonMessage.friendshipDatabaseAddr
            , { pin: true })
          // 向前端更新好友列表
          mainWindow.webContents.send('friends-response', this.getFriends())
          this.friendshipDatabases[jsonMessage.friendName] = await Utils.openAndListen2Database(this.orbitdb, jsonMessage.friendshipDatabaseAddr);
          // this.friendRequestChanges()
          this.sendMessage(jsonMessage.friendName, { type: 'text', message: "你好，我们现在可以聊天了！" })
        }
      }
      else if (jsonMessage.type == 'response-deny') {
        // 向前端通知拒绝
        this.preFriends.delete(jsonMessage.friendName)
        mainWindow.webContents.send('newFriend-deny', message.friendName)
      }


      // else if
      // to do send shipDatabseAddr to peer
    })
    console.log(`subscribed `)
  }
}
// ipfs_client.on('ready', () => {
//   // const password = db.get('password')
//   // Listen for new messages
//   // orbit.events.on('entry', (entry, channelName) => {
//   //   const post = entry.payload.value
//   //   console.log(`[${ post.meta.ts }] & lt; ${ post.meta.from.name }& gt; ${ post.content } `)
//   // })

//   // Connect to Orbit network
//   // orbit.connect(username).catch(e => console.error(e))
// })
async function init(config) {
  const ipfs = create(config.ipfs_url)
  Utils.getID(ipfs)
  // let idData = await ipfs.id()
  //   console.log(idData.id)
  //   return idData.id
  // console.log()
  var orbitdb = await OrbitDB.createInstance(ipfs, config.orbitdbOptions);
  var backend = new Backend(ipfs, orbitdb, config.publicDatabaseAddr)
  app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
      webPreferences: {
        // enableRemoteModule: true,
        nodeIntegration: true
        // preload: path.join(__dirname, 'electron-src/preload.js')
      }
    })
    mainWindow.openDevTools();
    mainWindow.loadURL('http://localhost:' + config.react_port)
    mainWindow.on("closed", () => (mainWindow = null));
    // app.on('activate', () => {
    //   if (BrowserWindow.getAllWindows().length === 0) {
    //     createWindow()
    //   }
    // })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

}
init(config)
