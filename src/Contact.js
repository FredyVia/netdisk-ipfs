'use strict';
import React from 'react';
import { List, Typography, Form, Input, Button, Badge, message, Modal, Row, Col } from 'antd';
import { Redirect } from 'react-router'
import { HashRouter, Route } from 'react-router-dom';
import '@chatui/core/dist/index.css';
import { Link } from 'react-router-dom'
import { render } from 'react-dom';

import '@chatui/core/es/styles/index.less';
// 引入组件
import Chat, { Bubble, FileCard } from '@chatui/core';
// 引入样式
import '@chatui/core/dist/index.css';
const { ipcRenderer } = window.require('electron')
Array.prototype.remove = function (val) {
  var index = this.indexOf(val);
  if (index > -1) {
    this.splice(index, 1);
  }
};
// import { UserOutlined, KeyOutlined } from '@ant-design/icons';
// class Passport {
//   constructor() {
//     // 用户登录标识
//     this.isLogin = false;
//   }

//   login(username, password, callback) {
//     if (username === '1' && password === '1') {
//       // 登录成功
//       this.isLogin = true;
//       // 将登录成功之后的操作给调用者处理
//       callback();
//     } else {
//       // 登录失败
//       // 这里简单弹出一个消息
//       alert('登录失败！');
//     }
//   }
// }
// const layout = {
//   labelCol: {
//     span: 8,
//   },
//   wrapperCol: {
//     span: 16,
//   },
// };

function checkEmptyString(obj) {
  //
  console.log(obj)
  console.log(typeof (obj))
  if (typeof obj == "undefined" || obj == null || obj == "") {
    return true;
  }
  return false;
};

class Register extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isRegistered: false
    }

    ipcRenderer.on('register-response', (event, arg) => {
      console.log(arg); // prints "pong"
      let alertMessage = arg.split('|');
      if (alertMessage[0] == 'success') {
        message.success('register success');
        this.setState({ isRegistered: true })
      }
      else
        message.success('registered failed:' + alertMessage[1]);
    });
  }
  componentWillUnmount() {
    ipcRenderer.removeAllListeners('register-response')
  }
  render() {
    if (this.state.isRegistered == true) {
      return <Redirect to='/login' />
    }
    return (
      <div>
        <h1 style={{ 'textAlign': 'center' }}>注册</h1>
        <Form
          name="basic"
          onFinish={(values) => {
            ipcRenderer.send('register-request', {
              username: values.username,
              password: values.password
            })
            console.log("waiting for checking", values)
          }}
          onFinishFailed={(errorInfo) => {
            console.log('login failed:', errorInfo);
          }}
        >
          <Form.Item
            label="Username"
            name="username"
            rules={[
              {
                required: true,
                message: 'Please input your username!',
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              {
                required: true,
                message: 'Please input your password!',
              },
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item>
            <Row justify='center' gutter={16}>
              <Col span={6}>
                <Button type="primary" htmlType="submit">
                  Submit</Button>
              </Col>
              <Col span={6}>
                <Button>
                  <Link to='login'>去登录</Link>
                </Button>
              </Col>
            </Row>
          </Form.Item>
        </Form>
      </div>
    )
  }
}

// class Utils {
//   static isLogin() {
//     ipcRenderer.on('isLogin', (event, arg) => {
//       return arg == false
//     })
//     ipcRenderer.send('isLogin')
//   }
// }
const tailLayout = {
  wrapperCol: {
    offset: 8,
    span: 16,
  },

};
class Login extends React.Component {
  constructor(props) {
    super(props);
    ipcRenderer.on('login-response', (event, arg) => {
      console.log(arg); // prints "pong"
      let alertMessage = arg.split('|');
      if (alertMessage[0] == 'success') {
        message.success('login success');
        // this.props.cb(alertMessage[1])
      }
      else
        message.success('login failed');
    });
  }

  componentWillUnmount() {
    ipcRenderer.removeAllListeners('login-response')
  }
  render() {
    if (this.props.isLogin == true) {
      return <Redirect to='/' />
    }
    return (
      <div>
        <h1 style={{ 'textAlign': 'center' }}>登录</h1>
        <Form
          name="basic"
          onFinish={(values) => {
            ipcRenderer.send('login-request', {
              username: values.username,
              password: values.password
            })
            console.log("waiting for checking", values)
          }}
          onFinishFailed={(errorInfo) => {
            console.log('login failed:', errorInfo);
          }}
        >
          <Form.Item
            label="Username"
            name="username"
            rules={[
              {
                required: true,
                message: 'Please input your username!',
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              {
                required: true,
                message: 'Please input your password!',
              },
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item >
            <Row justify='center' gutter={16}>
              <Col span={6}>
                <Button type="primary" htmlType="submit">
                  Submit
            </Button>
              </Col>
              <Col span={6}>
                <Button>
                  <Link to='register'>去注册</Link>
                </Button>
              </Col>
            </Row>
          </Form.Item>
        </Form>
      </div >
    )
  }
}

class Communication extends React.Component {
  constructor(props) {
    super(props)
    // const { messages, appendMsg, setTyping } = useMessages([]);
    // this.friendName = props.friendName;
    // console.log('friendname:----------', this.friendName)
    this.state = {
      messages: []
    }
  }
  componentDidMount() {
    ipcRenderer.on('friendshipDatabase-response', (event, arg) => {
      if (arg.friendName == this.props.friendName) {
        console.log('++++++++++++++++++++++++++', arg.messages)
        let tempMessage = []
        for (const tmp of arg.messages) {
          // console.log(i)
          console.log(tmp);
          console.log(tmp.message.type);
          tempMessage.push(
            {
              // 类型
              type: tmp.message.type,
              // 内容
              content: tmp.message.message,
              // ID
              // _id?: string,
              // 创建时间
              createdAt: tmp.date*1000,
              // 发送者信息
              // user?: {
              //   avatar: string,
              // },
              // 显示位置
              position: tmp.user == this.props.friendName ? 'left' : 'right',
              // 是否显示时间
              hasTime: true
            })
        }
        this.setState({
          messages:tempMessage
          
        })
      }
    });
  }
  componentWillUnmount() {
    console.log('谈话窗口umount')
    ipcRenderer.removeAllListeners('friendshipDatabase-response')
  }
  render() {
    console.log('谈话窗口重新渲染')
    // console.log(this.friendName)
    if (this.props.friendName == null) {
      return null
    }
    return (
      <div
        style={{
          'height': '500px'
        }}>
        <Chat
          navbar={{ title: this.props.friendName }}
          messages={this.state.messages}
          renderMessageContent={(msg) => {
            console.log('********************', msg)
            let type = msg.type;
            let message = msg.content
            // console.log(type, message)
            // console.log("++++++++++++---------------", type, message)
            switch (type) {
              case 'text':
                return <Bubble content={message} position='right' />;
              default:
                return null;
            }
          }}
          onSend={(type, val) => {
            console.log(type, val)
            let newMessages = JSON.parse(JSON.stringify(this.state.messages));
            // type: arg.messages.type,
            // // 内容
            // content: arg.messages.message,
            // // ID
            // // _id?: string,
            // // 创建时间
            // createdAt: arg.date,
            // // 发送者信息
            // // user?: {
            // //   avatar: string,
            // // },
            // // 显示位置
            // position: arg.user == this.props.friendName ? 'left' : 'right',
            // // 是否显示时间
            // hasTime: true
            newMessages.push({ type: type, content: val, createdAt: Math.floor(Date.now()), position: 'right', hasTime: true })
            console.log(newMessages)
            this.setState({
              messages: newMessages
            })
            if (this.props.friendName != null)
              ipcRenderer.send('sendMessage-request', {
                friendName: this.props.friendName,
                message: {
                  type: type, message: val
                }
              })
          }}
        />
      </div>
    );
  }
};


class ContactRouter extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      isLogin: false
    }
    ipcRenderer.on('isLogin', (event, arg) => {
      console.log('login info', arg)
      this.setState({
        isLogin: arg
      })
    });
  }
  componentDidMount() {
    ipcRenderer.send('isLogin');
  }
  componentWillUnmount() {
    ipcRenderer.removeAllListeners('isLogin')
  }
  render() {
    return (
      <HashRouter >
        <Route path="/" render={() => (
          <Contact isLogin={this.state.isLogin} />
        )} />
        <Route path="/login"
          render={() => (
            <Login isLogin={this.state.isLogin} />
          )} />
        <Route path="/register" component={Register} />
        <Redirect to='/login' />
      </HashRouter>
    )
  }
}



class FriendRequest extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      newFriendList: [],
      isModalVisible: false
    }
  }
  componentDidMount() {
    ipcRenderer.on('newFriendRequests-response', (event, arg) => {
      console.log(arg)
      console.log(typeof (arg))
      this.setState({
        newFriendList: arg
      });
    });
    ipcRenderer.send('newFriendRequests-request');
    ipcRenderer.on('newFriend-deny', (event, arg) => {
      // { type: 'request', message: message.friendName }
      // console.log(arg)
      // if (arg.type == 'changes') {
      //   // this.friendsRequestsArr.slice()
      //   this.newFriendList = arg.message
      //   // 修改为后端维护 新朋友请求列表 收到请求发送树木改变通知
      //   // changes deny 处理
      // } else if (arg.type == 'deny') {
      message.warning(arg + " has denied your friend request");
      // }
      // console.log(arg);
      // this.friendsList = arg;
    });
  }
  componentWillUnmount() {
    ipcRenderer.removeAllListeners('newFriend-deny')
    ipcRenderer.removeAllListeners('newFriendRequests-response')
  }
  render() {
    console.log(this.state.newFriendList)
    // console.log()
    return (
      <Badge count={this.state.newFriendList.length}>
        <Button type="primary" onClick={() => {
          this.setState({
            isModalVisible: true
          });
        }}>
          好友请求
        </Button>
        <Modal title="Basic Modal" visible={this.state.isModalVisible}
          footer={
            <Button onClick={() => {
              this.setState({
                isModalVisible: false
              });
            }}>
              知道了
            </Button>}>
          <List
            size="small"
            dataSource={this.state.newFriendList}
            renderItem={item => <List.Item>
              来自 {item} 的好友请求
              <Button onClick={() => {
                console.log(item);
                // this.statee
                ipcRenderer.send('newFriend', { type: true, friendName: item })
              }}>同意</Button><Button onClick={() => {
                console.log(item);
                ipcRenderer.send('newFriend', { type: false, friendName: item })
              }}>拒绝</Button>
            </List.Item>}
          />
        </Modal>

        <a href="#" className="head-example" />
      </Badge >
    )
  }
}

class FriendsList extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      friendsList: [],
      friendshipChanges: new Set(),
      friendName: null
    }
  }
  componentDidMount() {
    console.log('mount 了')
    ipcRenderer.on('friendshipDatabase-changes', (event, arg) => {
      console.log(arg);
      if (this.state.friendName != arg) {
        var newSet = new Set()
        for (let val of this.state.friendshipChanges.values())

          newSet.add(val)
        // if (val != item)
        newSet.add(arg)
        this.setState({
          friendshipChanges: newSet
        });
      }
      else {
        ipcRenderer.send('friendshipDatabase-request', arg);
      }
    })
    ipcRenderer.on('friends-response', (event, arr) => {
      // console.log(arr);
      console.log('$$$$$$$$$$$$$$$$$$$$$$')
      // to do 遍历修改数组
      let res = []
      arr.forEach((v, i) => {
        res.push(v.name)
      })
      console.log(res)
      this.setState({
        friendsList: res
      });
    });
    ipcRenderer.send('friends-request');
  }
  componentWillUnmount() {
    console.log('un un un un unmount 了')
    ipcRenderer.removeAllListeners('friends-response');
    ipcRenderer.removeAllListeners('friendshipDatabase-changes');
  }
  render() {
    console.log('重做了')
    console.log(this.state.friendName)
    return (
      <div>
        <Communication friendName={this.state.friendName} />
        <List
          header={< Form
            name="basic"
            onFinish={(values) => {
              console.log(values)
              // if (this.username == values)
              //   message.error('cannot add yourself');
              // else
              ipcRenderer.send('addFriend-request', values)
            }}
          >
            <Form.Item
              label="FriendName"
              name="friendName"
              rules={[{ required: true, message: 'Please input friendName!' }]}
            >
              <Input />
            </Form.Item>

            <Form.Item >

              <Row justify='center' gutter={16}>
                <Col span={6}>
                  <Button type="primary" htmlType="submit">
                    添加</Button>
                </Col>
                <Col span={6}>
                  <FriendRequest />
                </Col >
              </Row >
            </Form.Item>
          </Form >}
          bordered
          dataSource={this.state.friendsList}
          renderItem={item => (
            <List.Item>
              <Badge dot={this.state.friendshipChanges.has(item)}>
                <Typography.Text mark>[{item}]</Typography.Text>
              </Badge>
              <Button
                onClick={() => {
                  ipcRenderer.send('deleteFriend-request', item);
                  let newFriendList = [...this.state.friendsList]
                  console.log(newFriendList)
                  console.log(typeof (newFriendList))
                  newFriendList.remove(item)
                  this.setState({
                    friendsList: newFriendList
                  })
                }}>删除</Button>
              <Button
                onClick={() => {
                  var newSet = new Set()
                  for (let val of this.state.friendshipChanges.values())
                    if (val != item)
                      newSet.add(val)
                  this.setState({
                    friendshipChanges: newSet,
                    friendName: item
                  });
                  // if (!checkEmptyString(this.props.friendName))
                  ipcRenderer.send('friendshipDatabase-request', item);
                }}
              >聊天</Button>
            </List.Item>
          )}
        />
      </div>
    )
  }

}
class Contact extends React.Component {
  constructor(props) {
    super(props);
    // this.friendsList = []
    // this.newFriendList = []
    // ipcRenderer.on('friends-response', (event, arg) => {
    //   console.log(arg);
    //   console.log('$$$$$$$$$$$$$$$$$$$$$$')
    //   this.friendsList = arg;
    // });
    // console.log('sended')
    // ipcRenderer.send('friends-request');
  }
  componentDidMount() {
    // ipcRenderer.on('friendshipDatabase-changes', (event, arg) => {
    // {
    //   friendName: friendName,
    //   value: this.friendshipDatabases[friendName]
    //     .iterator({ limit: -1 }).collect().map((e) => e.payload.value)
    // };
    // console.log(arg.friendName);
    // to do ------------
    // newFriend
    // this.friendsList = arg;
    // to do
    // this.
    // });
    // ipcRenderer.send('')
  }
  componentWillUnmount() {
    // ipcRenderer.removeAllListeners('friends-response')
    // ipcRenderer.removeAllListeners('friendshipDatabase-changes')
  }
  render() {
    console.log('i am going to redo')
    if (this.props.isLogin == false) {
      // return <Login cb={(friendsList) => {
      //   this.friendsList = friendsList;
      // }} />;
      return (<Redirect to='/login' />)
    }
    return (
      <div>
        <FriendsList />
      </div>
    )
  }
}
export default ContactRouter;